// ---------------------------------------------------------------------------
// Server-side adapter for the OpenAI GPT Image 1.5 model served by REPLICATE.
// The Replicate token is read here and never leaves the server. This adapter
// never touches the Lovable AI gateway.
// ---------------------------------------------------------------------------

const API_BASE = "https://api.replicate.com/v1";
export const GPT_IMAGE_MODEL = "openai/gpt-image-1.5";

export type GptImageQuality = "low" | "medium" | "high";

export type GptImageErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "rate_limited"
  | "timeout"
  | "api_error"
  | "generation_failed";

export class GptImageError extends Error {
  code: GptImageErrorCode;
  predictionId: string | null;
  constructor(code: GptImageErrorCode, message: string, predictionId: string | null = null) {
    super(message);
    this.name = "GptImageError";
    this.code = code;
    this.predictionId = predictionId;
  }
}

/** Terminal failures — another engine of the same kind will not fix them. */
export function isTerminalGptImageCode(code: string): boolean {
  return code === "missing_token" || code === "invalid_token" || code === "insufficient_credit";
}

export type GptImageOutput = {
  bytes: Uint8Array;
  contentType: string;
  fileExtension: string;
  model: string;
  predictionId: string | null;
};

/** Only the aspect ratios the Replicate model accepts. */
function aspectFor(aspectRatio: string): "1:1" | "3:2" | "2:3" {
  if (aspectRatio === "9:16" || aspectRatio === "4:5" || aspectRatio === "2:3") return "2:3";
  if (aspectRatio === "16:9" || aspectRatio === "3:2") return "3:2";
  return "1:1";
}

function codeForStatus(status: number): GptImageErrorCode {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

function firstUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const found = output.find((v) => typeof v === "string");
    return typeof found === "string" ? found : null;
  }
  if (output && typeof output === "object") {
    const value = (output as Record<string, unknown>)["url"];
    if (typeof value === "string") return value;
  }
  return null;
}

type Prediction = {
  id?: string;
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
};

/** Renders one picture with GPT Image 1.5 through the Replicate API. */
export async function renderGptImage(input: {
  quality: GptImageQuality;
  prompt: string;
  aspectRatio?: string;
  timeoutMs?: number;
}): Promise<GptImageOutput> {
  const token = process.env["REPLICATE_API_TOKEN"];
  if (!token) {
    throw new GptImageError("missing_token", "The image service is not configured on the server.");
  }
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  let created: Response;
  try {
    created = await fetch(`${API_BASE}/models/${GPT_IMAGE_MODEL}/predictions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: {
          prompt: input.prompt,
          quality: input.quality,
          aspect_ratio: aspectFor(input.aspectRatio ?? "1:1"),
          output_format: "webp",
          number_of_images: 1,
        },
      }),
    });
  } catch (err) {
    throw new GptImageError(
      "api_error",
      err instanceof Error ? err.message : "The image service could not be reached.",
    );
  }

  if (!created.ok) {
    const body = await created.text().catch(() => "");
    throw new GptImageError(
      codeForStatus(created.status),
      `Image service error [${created.status}]: ${body.slice(0, 400)}`,
    );
  }

  let prediction = (await created.json()) as Prediction;
  const startedAt = Date.now();
  const timeoutMs = input.timeoutMs ?? 180_000;
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - startedAt > timeoutMs) {
      throw new GptImageError("timeout", "The picture took too long.", prediction.id ?? null);
    }
    await new Promise((r) => setTimeout(r, 1500));
    const polled = await fetch(`${API_BASE}/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!polled.ok) {
      const body = await polled.text().catch(() => "");
      throw new GptImageError(
        codeForStatus(polled.status),
        `Image service error [${polled.status}]: ${body.slice(0, 400)}`,
        prediction.id ?? null,
      );
    }
    prediction = (await polled.json()) as Prediction;
  }

  if (prediction.status !== "succeeded") {
    const detail =
      typeof prediction.error === "string" ? prediction.error : (prediction.status ?? "unknown");
    throw new GptImageError("generation_failed", `Picture ${detail}`, prediction.id ?? null);
  }

  const url = firstUrl(prediction.output);
  if (!url) {
    throw new GptImageError(
      "generation_failed",
      "The image service returned no picture.",
      prediction.id ?? null,
    );
  }

  const download = await fetch(url);
  if (!download.ok) {
    throw new GptImageError(
      "generation_failed",
      `Could not download the picture (${download.status}).`,
      prediction.id ?? null,
    );
  }
  const contentType = download.headers.get("content-type") ?? "image/webp";
  return {
    bytes: new Uint8Array(await download.arrayBuffer()),
    contentType,
    fileExtension: contentType.includes("png") ? "png" : contentType.includes("jpeg") ? "jpg" : "webp",
    model: GPT_IMAGE_MODEL,
    predictionId: prediction.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Shared server-side adapter for the OpenAI image models offered through the
// Lovable AI gateway. It is a provider adapter only: which function uses it,
// and whether it is switched on, is decided by Admin → Generators.
// ---------------------------------------------------------------------------

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/images/generations";

export type GptImageQuality = "low" | "medium" | "high";

export type GptImageErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "rate_limited"
  | "api_error"
  | "generation_failed";

export class GptImageError extends Error {
  code: GptImageErrorCode;
  constructor(code: GptImageErrorCode, message: string) {
    super(message);
    this.name = "GptImageError";
    this.code = code;
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
};

/** Only the sizes the OpenAI image endpoint accepts. */
function sizeFor(aspectRatio: string): "1024x1024" | "1024x1536" | "1536x1024" {
  if (aspectRatio === "9:16" || aspectRatio === "4:5") return "1024x1536";
  if (aspectRatio === "16:9" || aspectRatio === "3:2") return "1536x1024";
  return "1024x1024";
}

function codeForStatus(status: number): GptImageErrorCode {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Renders one picture with an OpenAI image model. Only supported request
 * fields are sent: model, prompt, quality and size.
 */
export async function renderGptImage(input: {
  model: string;
  quality: GptImageQuality;
  prompt: string;
  aspectRatio?: string;
}): Promise<GptImageOutput> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    throw new GptImageError("missing_token", "The image service is not configured on the server.");
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        quality: input.quality,
        size: sizeFor(input.aspectRatio ?? "1:1"),
      }),
    });
  } catch (err) {
    throw new GptImageError(
      "api_error",
      err instanceof Error ? err.message : "The image service could not be reached.",
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GptImageError(
      codeForStatus(res.status),
      `Image service error [${res.status}]: ${body.slice(0, 400)}`,
    );
  }

  const payload = (await res.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  } | null;
  const first = payload?.data?.[0];

  if (first?.b64_json) {
    return {
      bytes: decodeBase64(first.b64_json),
      contentType: "image/png",
      fileExtension: "png",
      model: input.model,
    };
  }

  if (first?.url) {
    const download = await fetch(first.url);
    if (!download.ok) {
      throw new GptImageError(
        "generation_failed",
        `Could not download the picture (${download.status}).`,
      );
    }
    return {
      bytes: new Uint8Array(await download.arrayBuffer()),
      contentType: download.headers.get("content-type") ?? "image/png",
      fileExtension: "png",
      model: input.model,
    };
  }

  throw new GptImageError("generation_failed", "The image service returned no picture.");
}

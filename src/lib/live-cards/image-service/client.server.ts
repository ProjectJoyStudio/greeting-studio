// Private engine client of the Live Cards image service. It is a standalone
// integration: it shares no state, no client and no error handling with the
// greeting-card generator, even though it renders with the same model.

import { pollIntervalMs, primaryModel, renderTimeoutMs } from "./config.server";
import { logError, logInfo } from "./log.server";

const API_BASE = "https://api.replicate.com/v1";

export type LiveImageErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "rate_limited"
  | "timeout"
  | "api_error"
  | "generation_failed";

export class LiveImageError extends Error {
  code: LiveImageErrorCode;
  httpStatus: number | null;

  constructor(code: LiveImageErrorCode, message: string, httpStatus: number | null = null) {
    super(message);
    this.name = "LiveImageError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** A confirmed engine failure — the backup engine may take over. */
export function isConfirmedFailure(code: LiveImageErrorCode): boolean {
  return code !== "timeout";
}

type Prediction = {
  id?: string;
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
};

function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output.find((v) => typeof v === "string");
    return typeof first === "string" ? first : null;
  }
  if (output && typeof output === "object") {
    const maybe =
      (output as Record<string, unknown>).url ?? (output as Record<string, unknown>).image;
    if (typeof maybe === "string") return maybe;
  }
  return null;
}

function codeForStatus(status: number): LiveImageErrorCode {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

export type LiveImageRender = {
  url: string;
  contentType: string;
  fileExtension: string;
  model: string;
};

/** Engines the administrator may pick for the Live Cards starting picture. */
const MODEL_BY_KEY: Record<string, string> = {
  flux_schnell: "black-forest-labs/flux-schnell",
  flux_ultra: "black-forest-labs/flux-1.1-pro-ultra",
  flux_1_1_pro: "black-forest-labs/flux-1.1-pro",
};

/**
 * The model of this section: the environment default unless the administrator
 * selected another primary engine in the Generator Control Centre.
 */
async function adminPrimaryModel(): Promise<string> {
  try {
    const { primaryGenerator } = await import("@/lib/admin/generators/runtime.server");
    const key = await primaryGenerator("live_cards.start_image", Object.keys(MODEL_BY_KEY));
    if (key && MODEL_BY_KEY[key]) return MODEL_BY_KEY[key]!;
  } catch {
    // fall back to the environment configuration
  }
  return primaryModel();
}

/** Renders one picture with the low-cost primary engine of this section. */
export async function renderPrimaryImage(
  prompt: string,
  aspectRatio: string,
): Promise<LiveImageRender> {
  const token = process.env.LIVE_CARDS_IMAGE_API_TOKEN || process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new LiveImageError("missing_token", "The Live Cards image service is not configured.");
  }
  const model = await adminPrimaryModel();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const startedAt = Date.now();

  const createRes = await fetch(`${API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        num_outputs: 1,
        output_format: "jpg",
        go_fast: true,
      },
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    const code = codeForStatus(createRes.status);
    logError("primary_create_failed", { model, status: createRes.status, code });
    throw new LiveImageError(
      code,
      `Live Cards image engine error [${createRes.status}]: ${body.slice(0, 300)}`,
      createRes.status,
    );
  }

  let prediction = (await createRes.json()) as Prediction;
  const timeout = renderTimeoutMs();
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - startedAt > timeout) {
      logError("primary_timeout", { model, predictionId: prediction.id ?? null });
      throw new LiveImageError("timeout", "The picture took too long to render.");
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs()));
    const pollRes = await fetch(`${API_BASE}/predictions/${prediction.id}`, { headers });
    if (!pollRes.ok) {
      const body = await pollRes.text().catch(() => "");
      const code = codeForStatus(pollRes.status);
      logError("primary_poll_failed", { model, status: pollRes.status, code });
      throw new LiveImageError(
        code,
        `Live Cards image engine error [${pollRes.status}]: ${body.slice(0, 300)}`,
        pollRes.status,
      );
    }
    prediction = (await pollRes.json()) as Prediction;
  }

  if (prediction.status !== "succeeded") {
    const detail =
      typeof prediction.error === "string"
        ? prediction.error
        : JSON.stringify(prediction.error ?? null);
    logError("primary_generation_failed", { model, status: prediction.status ?? null });
    throw new LiveImageError(
      "generation_failed",
      `Rendering failed: ${detail.slice(0, 300)}`.trim(),
    );
  }

  const url = extractUrl(prediction.output);
  if (!url) {
    logError("primary_no_output", { model });
    throw new LiveImageError("generation_failed", "The engine returned no picture.");
  }

  logInfo("primary_succeeded", { model, ms: Date.now() - startedAt });
  return { url, contentType: "image/jpeg", fileExtension: "jpg", model };
}

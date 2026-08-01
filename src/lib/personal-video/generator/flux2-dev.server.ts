// ---------------------------------------------------------------------------
// Independent starting-scene image engine of the Personal Video Greeting
// section (FLUX.2 Dev). It shares no state, no client and no configuration
// with the greeting-card or live-card generators, so it can be swapped for a
// different engine later without touching the page logic.
// ---------------------------------------------------------------------------

const API_BASE = "https://api.replicate.com/v1";

export type PvgEngineErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "rate_limited"
  | "api_error"
  | "generation_failed";

export class PvgEngineError extends Error {
  code: PvgEngineErrorCode;
  constructor(code: PvgEngineErrorCode, message: string) {
    super(message);
    this.name = "PvgEngineError";
    this.code = code;
  }
}

export const PVG_ENGINE_KEY = "flux2_dev";

export function pvgEngineModel(): string {
  return process.env["PVG_IMAGE_MODEL"] || "black-forest-labs/flux-2-dev";
}

function token(): string {
  const value = process.env["PVG_IMAGE_API_TOKEN"] || process.env["REPLICATE_API_TOKEN"] || "";
  if (!value) {
    throw new PvgEngineError("missing_token", "The starting-scene engine is not configured.");
  }
  return value;
}

function codeForStatus(status: number): PvgEngineErrorCode {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

export interface PvgStartResult {
  predictionId: string;
  model: string;
}

/**
 * Starts one starting-scene render and returns immediately. The work then
 * continues on the engine, so the person may safely leave the page.
 */
export async function startSceneRender(input: {
  prompt: string;
  referenceUrls: string[];
}): Promise<PvgStartResult> {
  const model = pvgEngineModel();
  const res = await fetch(`${API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        prompt: input.prompt,
        image_input: input.referenceUrls,
        aspect_ratio: "16:9",
        output_format: "jpg",
        num_outputs: 1,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PvgEngineError(
      codeForStatus(res.status),
      `Starting-scene engine error [${res.status}]: ${body.slice(0, 300)}`,
    );
  }
  const prediction = (await res.json()) as { id?: string };
  if (!prediction.id) {
    throw new PvgEngineError("api_error", "The engine did not accept the request.");
  }
  return { predictionId: prediction.id, model };
}

export type PvgProgress =
  | { state: "processing" }
  | { state: "ready"; url: string; contentType: string; fileExtension: string }
  | { state: "failed"; errorCode: string; errorMessage: string };

function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output.find((v) => typeof v === "string");
    return typeof first === "string" ? first : null;
  }
  if (output && typeof output === "object") {
    const maybe = (output as Record<string, unknown>)["url"];
    if (typeof maybe === "string") return maybe;
  }
  return null;
}

/** Asks the engine how one running render is doing. Never throws. */
export async function pollSceneRender(predictionId: string): Promise<PvgProgress> {
  try {
    const res = await fetch(`${API_BASE}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) {
      if (res.status === 404) {
        return { state: "failed", errorCode: "not_found", errorMessage: "The render was lost." };
      }
      return { state: "processing" };
    }
    const prediction = (await res.json()) as {
      status?: string;
      output?: unknown;
      error?: unknown;
    };
    if (prediction.status === "starting" || prediction.status === "processing") {
      return { state: "processing" };
    }
    if (prediction.status !== "succeeded") {
      const detail =
        typeof prediction.error === "string"
          ? prediction.error
          : JSON.stringify(prediction.error ?? null);
      return {
        state: "failed",
        errorCode: "generation_failed",
        errorMessage: detail.slice(0, 300),
      };
    }
    const url = extractUrl(prediction.output);
    if (!url) {
      return { state: "failed", errorCode: "no_output", errorMessage: "The engine returned no picture." };
    }
    return { state: "ready", url, contentType: "image/jpeg", fileExtension: "jpg" };
  } catch (err) {
    return {
      state: "failed",
      errorCode: "engine_unreachable",
      errorMessage: err instanceof Error ? err.message : "The engine could not be reached.",
    };
  }
}
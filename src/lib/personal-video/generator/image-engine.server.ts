// ---------------------------------------------------------------------------
// Independent starting-scene image engine of the Personal Video Greeting
// section. The engine is chosen through configuration, never hardcoded into
// the page, so it can be swapped later without rebuilding the flow.
//
//   image_generator = FLUX_2_MAX   (current setting, best identity keeping)
//
// Override with the environment variable PVG_IMAGE_GENERATOR, for example:
//   PVG_IMAGE_GENERATOR=FLUX_2_DEV
// A specific Replicate model may still be forced with PVG_IMAGE_MODEL.
//
// This module shares no state, no client and no configuration with the
// greeting-card or live-card generators.
// ---------------------------------------------------------------------------

const API_BASE = "https://api.replicate.com/v1";

/** The engine used when nothing is configured. */
export const PVG_DEFAULT_ENGINE = "FLUX_2_MAX";

type EngineDefinition = {
  /** Stable key stored with every scene. */
  key: string;
  /** Replicate model the engine talks to. */
  model: string;
  /** Builds the engine-specific request body. */
  buildInput: (input: { prompt: string; referenceUrls: string[] }) => Record<string, unknown>;
};

const ENGINES: Record<string, EngineDefinition> = {
  FLUX_2_MAX: {
    key: "flux2_max",
    model: "black-forest-labs/flux-2-max",
    buildInput: ({ prompt, referenceUrls }) => ({
      prompt,
      input_images: referenceUrls.slice(0, 8),
      aspect_ratio: "16:9",
      resolution: "2 MP",
      output_format: "jpg",
      safety_tolerance: 2,
    }),
  },
  FLUX_2_PRO: {
    key: "flux2_pro",
    model: "black-forest-labs/flux-2-pro",
    buildInput: ({ prompt, referenceUrls }) => ({
      prompt,
      input_images: referenceUrls.slice(0, 8),
      aspect_ratio: "16:9",
      output_format: "jpg",
      safety_tolerance: 2,
    }),
  },
  FLUX_2_DEV: {
    key: "flux2_dev",
    model: "black-forest-labs/flux-2-dev",
    buildInput: ({ prompt, referenceUrls }) => ({
      prompt,
      image_input: referenceUrls,
      aspect_ratio: "16:9",
      output_format: "jpg",
      num_outputs: 1,
    }),
  },
};

function engine(): EngineDefinition {
  const name = (process.env["PVG_IMAGE_GENERATOR"] || PVG_DEFAULT_ENGINE).trim().toUpperCase();
  const chosen = ENGINES[name] ?? ENGINES[PVG_DEFAULT_ENGINE]!;
  const override = process.env["PVG_IMAGE_MODEL"];
  return override ? { ...chosen, model: override } : chosen;
}

/** Key of the engine currently in use, stored with every generated scene. */
export function pvgEngineKey(): string {
  return engine().key;
}

/** Replicate model currently in use. */
export function pvgEngineModel(): string {
  return engine().model;
}

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
  engineKey: string;
}

/**
 * Starts one starting-scene render and returns immediately. The work then
 * continues on the engine, so the person may safely leave the page.
 */
export async function startSceneRender(input: {
  prompt: string;
  referenceUrls: string[];
}): Promise<PvgStartResult> {
  const active = engine();
  const res = await fetch(`${API_BASE}/models/${active.model}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: active.buildInput(input) }),
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
  return { predictionId: prediction.id, model: active.model, engineKey: active.key };
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

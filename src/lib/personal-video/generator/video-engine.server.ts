// ---------------------------------------------------------------------------
// The moving-picture engine of the Personal Video Greeting section.
//
//   video_generator = OMNIHUMAN_15   (bytedance/omni-human-1.5, image + audio)
//
// The approved starting scene of page one becomes the picture, and the
// greeting voice already prepared on page two drives the speaking and the lip
// movement. The engine never invents a voice of its own, so the greeting is
// never spoken twice. Background music is added afterwards by Project Joy.
//
// This module shares no state with the starting-scene, greeting-card or
// live-card engines.
// ---------------------------------------------------------------------------

const API_BASE = "https://api.replicate.com/v1";

export const PVG_DEFAULT_VIDEO_ENGINE = "OMNIHUMAN_15";

interface VideoEngineDefinition {
  key: string;
  model: string;
  buildInput: (input: {
    prompt: string;
    imageUrl: string;
    audioUrl: string;
    durationSeconds: number;
    sceneSounds: boolean;
    seed?: number | undefined;
  }) => Record<string, unknown>;
}

const ENGINES: Record<string, VideoEngineDefinition> = {
  OMNIHUMAN_15: {
    key: "omni_human_15",
    model: "bytedance/omni-human-1.5",
    // The engine accepts exactly these inputs: picture, speech, words, seed.
    buildInput: ({ prompt, imageUrl, audioUrl, seed }) => ({
      prompt,
      image: imageUrl,
      audio: audioUrl,
      ...(typeof seed === "number" ? { seed } : {}),
    }),
  },
};

function configured(): VideoEngineDefinition {
  const name = (process.env["PVG_VIDEO_GENERATOR"] || PVG_DEFAULT_VIDEO_ENGINE)
    .trim()
    .toUpperCase();
  const chosen = ENGINES[name] ?? ENGINES[PVG_DEFAULT_VIDEO_ENGINE]!;
  const override = process.env["PVG_VIDEO_MODEL"];
  return override ? { ...chosen, model: override } : chosen;
}

/** Engine keys as they appear in the Admin Panel's Generator Control Centre. */
const ENGINE_BY_ADMIN_KEY: Record<string, string> = { omni_human_15: "OMNIHUMAN_15" };

async function activeEngine(): Promise<VideoEngineDefinition> {
  try {
    const { primaryGenerator } = await import("@/lib/admin/generators/runtime.server");
    const key = await primaryGenerator("personal_video.video", Object.keys(ENGINE_BY_ADMIN_KEY));
    const name = key ? ENGINE_BY_ADMIN_KEY[key] : undefined;
    const chosen = name ? ENGINES[name] : undefined;
    if (chosen) {
      const override = process.env["PVG_VIDEO_MODEL"];
      return override ? { ...chosen, model: override } : chosen;
    }
  } catch {
    // fall back to the environment configuration
  }
  return configured();
}

export type PvgVideoEngineErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "rate_limited"
  | "api_error";

export class PvgVideoEngineError extends Error {
  code: PvgVideoEngineErrorCode;
  constructor(code: PvgVideoEngineErrorCode, message: string) {
    super(message);
    this.name = "PvgVideoEngineError";
    this.code = code;
  }
}

function token(): string {
  const value = process.env["PVG_VIDEO_API_TOKEN"] || process.env["REPLICATE_API_TOKEN"] || "";
  if (!value) {
    throw new PvgVideoEngineError("missing_token", "The video engine is not configured.");
  }
  return value;
}

function codeForStatus(status: number): PvgVideoEngineErrorCode {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

export interface PvgVideoStartResult {
  predictionId: string;
  model: string;
  engineKey: string;
}

/**
 * Starts one film and returns at once. The work continues on the engine, so
 * the person may safely close the page.
 */
export async function startVideoRender(input: {
  prompt: string;
  imageUrl: string;
  audioUrl: string;
  durationSeconds: number;
  sceneSounds: boolean;
  seed?: number | undefined;
}): Promise<PvgVideoStartResult> {
  const active = await activeEngine();
  const res = await fetch(`${API_BASE}/models/${active.model}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: active.buildInput(input) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PvgVideoEngineError(
      codeForStatus(res.status),
      `Video engine error [${res.status}]: ${body.slice(0, 300)}`,
    );
  }
  const prediction = (await res.json()) as { id?: string };
  if (!prediction.id) {
    throw new PvgVideoEngineError("api_error", "The engine did not accept the request.");
  }
  return { predictionId: prediction.id, model: active.model, engineKey: active.key };
}

export type PvgVideoProgress =
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
    const record = output as Record<string, unknown>;
    for (const key of ["video", "url", "output"]) {
      const value = record[key];
      if (typeof value === "string") return value;
    }
  }
  return null;
}

/** Asks the engine how one running film is doing. Never throws. */
export async function pollVideoRender(predictionId: string): Promise<PvgVideoProgress> {
  try {
    const res = await fetch(`${API_BASE}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) {
      if (res.status === 404) {
        return { state: "failed", errorCode: "not_found", errorMessage: "The film was lost." };
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
      return { state: "failed", errorCode: "generation_failed", errorMessage: detail.slice(0, 300) };
    }
    const url = extractUrl(prediction.output);
    if (!url) {
      return { state: "failed", errorCode: "no_output", errorMessage: "The engine returned no film." };
    }
    return { state: "ready", url, contentType: "video/mp4", fileExtension: "mp4" };
  } catch (err) {
    return {
      state: "failed",
      errorCode: "engine_unreachable",
      errorMessage: err instanceof Error ? err.message : "The engine could not be reached.",
    };
  }
}

/** Stops one running film, for example when its order is removed. */
export async function cancelVideoRender(predictionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/predictions/${predictionId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
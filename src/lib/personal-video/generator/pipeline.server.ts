// ---------------------------------------------------------------------------
// The final film of the Personal Video Greeting.
//
// One single stage: the approved starting scene and the greeting voice that
// ElevenLabs already produced are given to one engine, which returns the
// finished speaking film. The voice inside that film is the ElevenLabs voice
// itself — Project Joy never speaks the greeting a second time on top of it.
//
// FINAL_VIDEO_ENGINES is a registry, not a single engine: another engine of
// the same purpose can be added later without touching the pipeline or page
// two. Which engine serves one job is decided by the Admin Panel's Generator
// Control Centre (primary, backup, load distribution, parallel limits).
// ---------------------------------------------------------------------------

const API_BASE = "https://api.replicate.com/v1";

/** The admin function id of the final-video group. */
export const FINAL_VIDEO_FUNCTION_ID = "personal_video.final_video";

export interface FinalVideoInput {
  /** The approved starting scene, exactly as page one produced it. */
  imageUrl: string;
  /** The finished ElevenLabs greeting, already in the customer's language. */
  audioUrl: string;
  /** English scene control, describing who speaks and who only reacts. */
  prompt: string;
  seed?: number | undefined;
}

export interface FinalVideoEngine {
  /** Key as it appears in the Generator Control Centre. */
  key: string;
  model: string;
  /** Longest greeting voice this engine accepts, in seconds. */
  maxAudioSeconds: number;
  /** Provider price of one second of finished film, in US dollars. */
  usdPerSecond: number;
  /** How the engine ran, recorded for the administrator. */
  variant?: string;
  buildInput: (input: FinalVideoInput) => Record<string, unknown>;
}

/** Quality mode of Kling Avatar V2: "std" (cheaper) or "pro". */
function klingMode(): "std" | "pro" {
  return process.env["PVG_KLING_AVATAR_MODE"] === "pro" ? "pro" : "std";
}

export const FINAL_VIDEO_ENGINES: Record<string, FinalVideoEngine> = {
  kling_avatar_v2: {
    key: "kling_avatar_v2",
    model: "kwaivgi/kling-avatar-v2",
    variant: klingMode(),
    // The film lasts as long as the greeting voice; the engine accepts a
    // voice of at most one minute.
    maxAudioSeconds: Number(process.env["PVG_KLING_AVATAR_MAX_AUDIO_SECONDS"] || 60),
    // Provider price per second of finished film: std $0.056, pro $0.11.
    usdPerSecond: Number(
      process.env["PVG_KLING_AVATAR_USD_PER_SECOND"] || (klingMode() === "pro" ? 0.11 : 0.056),
    ),
    buildInput: ({ imageUrl, audioUrl, prompt }) => ({
      image: imageUrl,
      // The completed greeting voice. No voice is ever generated here.
      audio: audioUrl,
      prompt,
      mode: klingMode(),
    }),
  },
};

/** The longest greeting voice the active engines can speak. */
export function maxGreetingAudioSeconds(): number {
  const values = Object.values(FINAL_VIDEO_ENGINES).map((e) => e.maxAudioSeconds);
  return values.length ? Math.max(...values) : 0;
}

/**
 * The engines of the group, in the order this job should try them: the
 * administrator's primary first, then any allowed alternative.
 */
export async function finalVideoOrder(): Promise<string[]> {
  const keys = Object.keys(FINAL_VIDEO_ENGINES);
  try {
    const { generatorOrder } = await import("@/lib/admin/generators/runtime.server");
    return await generatorOrder(FINAL_VIDEO_FUNCTION_ID, keys);
  } catch {
    return [];
  }
}

// --- Replicate plumbing ----------------------------------------------------

export type PvgStageErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "rate_limited"
  | "audio_too_long"
  | "api_error";

export class PvgStageError extends Error {
  code: PvgStageErrorCode;
  constructor(code: PvgStageErrorCode, message: string) {
    super(message);
    this.name = "PvgStageError";
    this.code = code;
  }
}

function token(): string {
  const value = process.env["PVG_VIDEO_API_TOKEN"] || process.env["REPLICATE_API_TOKEN"] || "";
  if (!value) throw new PvgStageError("missing_token", "The video engine is not configured.");
  return value;
}

function codeForStatus(status: number): PvgStageErrorCode {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

export interface FinalVideoStartResult {
  predictionId: string;
  engineKey: string;
  model: string;
  /** Length of the greeting voice the engine received, in seconds. */
  audioSeconds: number;
}

async function createPrediction(model: string, input: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PvgStageError(
      codeForStatus(res.status),
      `[${res.status}] ${model}: ${body.slice(0, 300)}`,
    );
  }
  const prediction = (await res.json()) as { id?: string };
  if (!prediction.id) throw new PvgStageError("api_error", "The engine did not accept the request.");
  return prediction.id;
}

/**
 * The finished film: picture and completed greeting voice in, speaking film
 * out. The greeting is never shortened — a voice the engine cannot accept is
 * refused openly instead.
 */
export async function startFinalVideo(
  input: FinalVideoInput & { audioSeconds: number },
): Promise<FinalVideoStartResult> {
  let lastError: unknown = null;
  for (const key of await finalVideoOrder()) {
    const engine = FINAL_VIDEO_ENGINES[key];
    if (!engine) continue;
    if (input.audioSeconds > engine.maxAudioSeconds) {
      lastError = new PvgStageError(
        "audio_too_long",
        `The greeting voice lasts ${input.audioSeconds.toFixed(1)}s; ${engine.model} accepts at most ${engine.maxAudioSeconds}s.`,
      );
      continue;
    }
    try {
      const { withGeneratorSlot } = await import("@/lib/admin/generators/runtime.server");
      const predictionId = await withGeneratorSlot(engine.key, () =>
        createPrediction(engine.model, engine.buildInput(input)),
      );
      return {
        predictionId,
        engineKey: engine.key,
        model: engine.variant ? `${engine.model} (${engine.variant})` : engine.model,
        audioSeconds: input.audioSeconds,
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new PvgStageError("api_error", "No final-video engine is available.");
}

export type StageProgress =
  | { state: "processing" }
  | { state: "ready"; url: string; contentType: string; fileExtension: string; predictSeconds: number }
  | { state: "failed"; errorCode: string; errorMessage: string };

function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output.find((v) => typeof v === "string");
    return typeof first === "string" ? first : null;
  }
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    for (const key of ["video", "output", "url"]) {
      const value = record[key];
      if (typeof value === "string") return value;
    }
  }
  return null;
}

/** Asks one running film how it is doing. Never throws. */
export async function pollStage(predictionId: string): Promise<StageProgress> {
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
      metrics?: { predict_time?: number };
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
    return {
      state: "ready",
      url,
      contentType: "video/mp4",
      fileExtension: "mp4",
      predictSeconds: Number(prediction.metrics?.predict_time ?? 0),
    };
  } catch (err) {
    return {
      state: "failed",
      errorCode: "engine_unreachable",
      errorMessage: err instanceof Error ? err.message : "The engine could not be reached.",
    };
  }
}

/** Stops one running film, for example when its order is removed. */
export async function cancelStage(predictionId: string): Promise<boolean> {
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

/** What one finished film really cost the provider, in US dollars. */
export function finalVideoCostUsd(engineKey: string, seconds: number): number {
  const engine = FINAL_VIDEO_ENGINES[engineKey];
  if (!engine || seconds <= 0) return 0;
  return Math.round(engine.usdPerSecond * seconds * 10_000) / 10_000;
}

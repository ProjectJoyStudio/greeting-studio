// ---------------------------------------------------------------------------
// The two-stage moving-picture pipeline of the Personal Video Greeting.
//
//   Group A — silent video   : the approved starting scene comes alive.
//   Group B — lip-sync       : the prepared greeting voice is spoken by the
//                              right participant, and by nobody else.
//
// Both groups are registries, not single engines: another engine of the same
// purpose can be added to a group later without touching the pipeline. Which
// engine of a group serves one job is decided by the Admin Panel's Generator
// Control Centre (primary, backup, load distribution, parallel limits).
//
// The greeting voice is NEVER sent to the silent-video stage, and the film is
// never given the greeting a second time afterwards.
// ---------------------------------------------------------------------------

const API_BASE = "https://api.replicate.com/v1";

export type PvgStage = "silent_video" | "lipsync";

/** The admin function id of each group inside the Generator Control Centre. */
export const STAGE_FUNCTION_ID: Record<PvgStage, string> = {
  silent_video: "personal_video.silent_video",
  lipsync: "personal_video.lipsync",
};

export interface SilentVideoInput {
  prompt: string;
  imageUrl: string;
  durationSeconds: number;
  seed?: number | undefined;
}

export interface LipsyncInput {
  videoUrl: string;
  audioUrl: string;
  /** True when the scene holds more than one face. */
  multipleFaces: boolean;
}

export interface StageEngine<I> {
  /** Key as it appears in the Generator Control Centre. */
  key: string;
  model: string;
  /** Resolution the engine is asked for, shown in Admin/Test mode. */
  resolution: string;
  /** Provider price of one second of finished film, in US dollars. */
  usdPerSecond: number;
  buildInput: (input: I) => Record<string, unknown>;
}

// --- Group A — silent video ------------------------------------------------

function wanResolution(): string {
  return process.env["PVG_WAN_RESOLUTION"] || "720p";
}

/** The order's own duration, kept exactly as chosen, within the engine's range. */
function exactDuration(seconds: number): number {
  return Math.min(15, Math.max(5, Math.round(seconds)));
}

export const SILENT_VIDEO_ENGINES: Record<string, StageEngine<SilentVideoInput>> = {
  vidu_q3_turbo: {
    key: "vidu_q3_turbo",
    model: "vidu/q3-turbo",
    resolution: wanResolution(),
    usdPerSecond: Number(process.env["PVG_WAN_USD_PER_SECOND"] || 0.04),
    buildInput: ({ prompt, imageUrl, durationSeconds }) => ({
      start_image: imageUrl,
      prompt,
      duration: exactDuration(durationSeconds),
      resolution: wanResolution(),
      // The silent stage must never speak: no voice is sent, and none is made.
      audio: false,
    }),
  },
};

// --- Group B — lip-sync ----------------------------------------------------

export const LIPSYNC_ENGINES: Record<string, StageEngine<LipsyncInput>> = {
  sync_lipsync_2: {
    key: "sync_lipsync_2",
    model: "sync/lipsync-2",
    resolution: "source",
    usdPerSecond: Number(process.env["PVG_SYNC_USD_PER_SECOND"] || 0.05),
    buildInput: ({ videoUrl, audioUrl, multipleFaces }) => ({
      video: videoUrl,
      audio: audioUrl,
      sync_mode: "loop",
      // Only the person who is actually speaking receives the lip movement.
      active_speaker: multipleFaces,
    }),
  },
};

export function stageEngines(stage: PvgStage): Record<string, StageEngine<never>> {
  return (stage === "silent_video" ? SILENT_VIDEO_ENGINES : LIPSYNC_ENGINES) as unknown as Record<
    string,
    StageEngine<never>
  >;
}

/**
 * The engines of one group, in the order this job should try them: the
 * administrator's primary first, then any allowed alternative. Adding another
 * engine to a group is enough for it to take part in routing.
 */
export async function stageOrder(stage: PvgStage): Promise<string[]> {
  const keys = Object.keys(stageEngines(stage));
  try {
    const { generatorOrder } = await import("@/lib/admin/generators/runtime.server");
    const order = await generatorOrder(STAGE_FUNCTION_ID[stage], keys);
    return order.length ? order : keys;
  } catch {
    return keys;
  }
}

// --- Replicate plumbing shared by both groups ------------------------------

export type PvgStageErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "rate_limited"
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

export interface StageStartResult {
  predictionId: string;
  engineKey: string;
  model: string;
  resolution: string;
  audioEnabled: boolean;
  activeSpeaker: boolean | null;
}

async function createPrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<string> {
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

/** Stage one: the approved picture comes alive, in complete silence. */
export async function startSilentVideo(input: SilentVideoInput): Promise<StageStartResult> {
  let lastError: unknown = null;
  for (const key of await stageOrder("silent_video")) {
    const engine = SILENT_VIDEO_ENGINES[key];
    if (!engine) continue;
    try {
      const { withGeneratorSlot } = await import("@/lib/admin/generators/runtime.server");
      const predictionId = await withGeneratorSlot(engine.key, () =>
        createPrediction(engine.model, engine.buildInput(input)),
      );
      return {
        predictionId,
        engineKey: engine.key,
        model: engine.model,
        resolution: engine.resolution,
        audioEnabled: false,
        activeSpeaker: null,
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new PvgStageError("api_error", "No silent-video engine is available.");
}

/** Stage two: the prepared greeting voice is given to the right mouth. */
export async function startLipsync(input: LipsyncInput): Promise<StageStartResult> {
  let lastError: unknown = null;
  for (const key of await stageOrder("lipsync")) {
    const engine = LIPSYNC_ENGINES[key];
    if (!engine) continue;
    try {
      const { withGeneratorSlot } = await import("@/lib/admin/generators/runtime.server");
      const built = engine.buildInput(input);
      const predictionId = await withGeneratorSlot(engine.key, () =>
        createPrediction(engine.model, built),
      );
      return {
        predictionId,
        engineKey: engine.key,
        model: engine.model,
        resolution: engine.resolution,
        audioEnabled: true,
        activeSpeaker: Boolean(built["active_speaker"]),
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new PvgStageError("api_error", "No lip-sync engine is available.");
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

/** Asks one running stage how it is doing. Never throws. */
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

/** Stops one running stage, for example when its order is removed. */
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

/** What one stage really cost the provider, in US dollars. */
export function stageCostUsd(stage: PvgStage, engineKey: string, seconds: number): number {
  const engine = stageEngines(stage)[engineKey];
  if (!engine || seconds <= 0) return 0;
  return Math.round(engine.usdPerSecond * seconds * 10_000) / 10_000;
}
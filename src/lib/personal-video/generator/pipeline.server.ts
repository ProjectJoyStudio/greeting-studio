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

/**
 * Personal Video Greeting is a talking-person product; the only film made
 * here is the one with the added person speaking the greeting.
 */
export type FinalVideoRoute = "person" | "scene";

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
  /** Which provider runs this engine. */
  provider?: "replicate" | "runware";
  /** Longest greeting voice this engine accepts, in seconds. */
  maxAudioSeconds: number;
  /** Provider price of one second of finished film, in US dollars. */
  usdPerSecond: number;
  /** How the engine ran, recorded for the administrator. */
  variant?: string;
  /**
   * True when the engine really keeps the prepared ElevenLabs greeting in the
   * finished film. An engine that cannot is never used here: a film with
   * moving lips and no greeting is a failure, not a result.
   */
  keepsPreparedVoice: boolean;
  /**
   * True for avatar engines that animate a speaking human face. They cannot
   * serve a scene that contains no added person.
   */
  requiresPerson?: boolean;
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
    provider: "replicate",
    variant: klingMode(),
    keepsPreparedVoice: true,
    requiresPerson: true,
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
  // --- Runware engines (official Runware API, never through Replicate) ------
  rw_pvideo_avatar: {
    key: "rw_pvideo_avatar",
    model: "prunaai:p-video@avatar",
    provider: "runware",
    // The film lasts as long as the prepared greeting handed to the engine.
    maxAudioSeconds: Number(process.env["PVG_PVIDEO_AVATAR_MAX_AUDIO_SECONDS"] || 60),
    usdPerSecond: Number(process.env["PVG_PVIDEO_AVATAR_USD_PER_SECOND"] || 0.09),
    keepsPreparedVoice: true,
    requiresPerson: true,
    buildInput: () => ({}),
  },
  rw_wan26_flash: {
    key: "rw_wan26_flash",
    model: "alibaba:wan@2.6-flash",
    provider: "runware",
    // The film is as long as the greeting voice; the model accepts 15 seconds.
    maxAudioSeconds: Number(process.env["PVG_RUNWARE_MAX_AUDIO_SECONDS"] || 15),
    usdPerSecond: Number(process.env["PVG_RUNWARE_WAN_USD_PER_SECOND"] || 0.05),
    keepsPreparedVoice: true,
    buildInput: () => ({}),
  },
};

/** Prefix of a film that runs at Runware instead of Replicate. */
const RUNWARE_PREFIX = "runware:";

/** Engines able to serve the talking-person film with the greeting inside. */
function enginesFor(route: FinalVideoRoute = "person"): FinalVideoEngine[] {
  // The no-speaker film (route "scene") animates the approved scene under the
  // greeting voice-over; avatar engines that need a visible talking face are
  // never used for it.
  return Object.values(FINAL_VIDEO_ENGINES).filter(
    (e) => e.keepsPreparedVoice && (route === "person" || !e.requiresPerson),
  );
}

/** The longest greeting voice the active engines of one route can speak. */
export function maxGreetingAudioSeconds(route: FinalVideoRoute = "person"): number {
  const values = enginesFor(route).map((e) => e.maxAudioSeconds);
  return values.length ? Math.max(...values) : 0;
}

/**
 * The engines of the group, in the order this job should try them: the
 * administrator's primary first, then any allowed alternative.
 */
export async function finalVideoOrder(route: FinalVideoRoute = "person"): Promise<string[]> {
  // The administrator's own choice decides which engine is called: primary
  // first, then the configured reserve. No engine is ever chosen implicitly.
  const usable = enginesFor(route).map((e) => e.key);
  try {
    const { generatorOrder } = await import("@/lib/admin/generators/runtime.server");
    return await generatorOrder(FINAL_VIDEO_FUNCTION_ID, usable);
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
  | "engine_incompatible"
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

export class PvgSubmissionUncertain extends Error {
  constructor() {
    super("submission_uncertain");
    this.name = "PvgSubmissionUncertain";
  }
}

/** Stable fingerprint of what was handed to the provider, used to match a lost submission. */
export async function dispatchFingerprint(model: string, imageUrl: string, audioUrl: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${model}|${imageUrl}|${audioUrl}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createPrediction(
  model: string,
  input: Record<string, unknown>,
  webhook: string | null,
): Promise<string> {
  const apiToken = token(); // Missing configuration is a definite pre-submit failure.
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/models/${model}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      // Replicate documents no idempotency key. The signed webhook (start +
      // completed) carries our operation id, so a response lost in transit is
      // still matched to the paid job without a second submission.
      body: JSON.stringify(
        webhook ? { input, webhook, webhook_events_filter: ["start", "completed"] } : { input },
      ),
    });
  } catch {
    throw new PvgSubmissionUncertain();
  }
  if (!res.ok) {
    if (res.status >= 500 || res.status === 408) throw new PvgSubmissionUncertain();
    throw new PvgStageError(codeForStatus(res.status), `Provider rejected request (${res.status})`);
  }
  try {
    const prediction = (await res.json()) as { id?: string };
    if (prediction.id) return prediction.id;
  } catch {
    /* Acceptance is unknown; never fall through to a second engine. */
  }
  throw new PvgSubmissionUncertain();
}

/**
 * The finished film: picture and completed greeting voice in, speaking film
 * out. The greeting is never shortened — a voice the engine cannot accept is
 * refused openly instead.
 */
export async function startFinalVideo(
  input: FinalVideoInput & {
    audioSeconds: number;
    route?: FinalVideoRoute;
    /** Signed provider callback address for this operation, when configured. */
    webhookUrl?: string | null;
    beforeSubmit?: (attempt: {
      engineKey: string;
      model: string;
      predictionId: string | null;
      fingerprint: string;
    }) => Promise<void>;
  },
): Promise<FinalVideoStartResult> {
  const route: FinalVideoRoute = input.route ?? "person";
  let lastError: unknown = null;
  for (const key of await finalVideoOrder(route)) {
    const engine = FINAL_VIDEO_ENGINES[key];
    if (!engine) continue;
    if (!engine.keepsPreparedVoice) {
      lastError = new PvgStageError(
        "engine_incompatible",
        `${engine.model} cannot carry the prepared greeting voice, so it is not used for personal video greetings.`,
      );
      continue;
    }
    if (input.audioSeconds > engine.maxAudioSeconds) {
      lastError = new PvgStageError(
        "audio_too_long",
        `The greeting voice lasts ${input.audioSeconds.toFixed(1)}s; ${engine.model} accepts at most ${engine.maxAudioSeconds}s.`,
      );
      continue;
    }
    let attempted = false;
    try {
      const { withGeneratorSlot } = await import("@/lib/admin/generators/runtime.server");
      const predictionId = await withGeneratorSlot(engine.key, async () => {
        const taskUUID = engine.provider === "runware" ? crypto.randomUUID() : null;
        await input.beforeSubmit?.({
          engineKey: engine.key,
          model: engine.model,
          predictionId: taskUUID ? `${RUNWARE_PREFIX}${taskUUID}` : null,
          fingerprint: await dispatchFingerprint(engine.model, input.imageUrl, input.audioUrl),
        });
        attempted = true;
        if (engine.provider === "runware") {
          const { runwareStartVideo, RunwareError } = await import("@/lib/runware/runware.server");
          try {
            if (!process.env["RUNWARE_API_KEY"])
              throw new PvgStageError("missing_token", "The video engine is not configured.");
            const acceptedTask = await runwareStartVideo({
              ...(taskUUID ? { taskUUID } : {}),
              generatorKey: engine.key,
              prompt: input.prompt,
              imageUrl: input.imageUrl,
              // The film lasts as long as the sound it receives: the greeting
              // plus the silence that carries the scene to the chosen length.
              durationSeconds: Math.ceil(input.audioSeconds),
              aspectRatio: "16:9",
              // Engines that accept a voice track receive the ElevenLabs
              // greeting; no engine ever speaks the greeting a second time.
              audioUrl: input.audioUrl,
            });
            return `${RUNWARE_PREFIX}${acceptedTask}`;
          } catch (err) {
            if (err instanceof PvgStageError) throw err;
            if (
              err instanceof RunwareError &&
              (err.definitelyRejected ||
                ["missing_token", "invalid_token", "insufficient_credit", "rate_limited"].includes(
                  err.code,
                ))
            ) {
              throw new PvgStageError(err.code as PvgStageErrorCode, err.message);
            }
            throw new PvgSubmissionUncertain();
          }
        }
        return createPrediction(engine.model, engine.buildInput(input), input.webhookUrl ?? null);
      });
      return {
        predictionId,
        engineKey: engine.key,
        model: engine.variant ? `${engine.model} (${engine.variant})` : engine.model,
        audioSeconds: input.audioSeconds,
      };
    } catch (err) {
      if (err instanceof PvgSubmissionUncertain) throw err;
      if (attempted && !(err instanceof PvgStageError)) throw new PvgSubmissionUncertain();
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new PvgStageError("api_error", "No final-video engine is available.");
}

export type StageProgress =
  | { state: "processing"; transient?: boolean; unknown?: boolean }
  | {
      state: "ready";
      url: string;
      contentType: string;
      fileExtension: string;
      predictSeconds: number;
    }
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
  if (predictionId.startsWith(RUNWARE_PREFIX)) {
    const { runwareProgress } = await import("@/lib/runware/runware.server");
    const state = await runwareProgress(predictionId.slice(RUNWARE_PREFIX.length));
    if (state.state === "processing") return { state: "processing" };
    if (state.state === "failed") {
      if (state.errorCode !== "generation_failed") return { state: "processing", transient: true };
      return { state: "failed", errorCode: state.errorCode, errorMessage: state.errorMessage };
    }
    return {
      state: "ready",
      url: state.url,
      contentType: "video/mp4",
      fileExtension: "mp4",
      predictSeconds: 0,
    };
  }
  try {
    const res = await fetch(`${API_BASE}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) {
      // A missing prediction is not proof of failure (wrong token, retention):
      // it goes to administrator review instead of an automatic refund.
      if (res.status === 404) return { state: "processing", unknown: true };
      return { state: "processing", transient: true };
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
      return {
        state: "failed",
        errorCode: "generation_failed",
        errorMessage: detail.slice(0, 300),
      };
    }
    const url = extractUrl(prediction.output);
    if (!url) {
      return {
        state: "failed",
        errorCode: "no_output",
        errorMessage: "The engine returned no film.",
      };
    }
    return {
      state: "ready",
      url,
      contentType: "video/mp4",
      fileExtension: "mp4",
      predictSeconds: Number(prediction.metrics?.predict_time ?? 0),
    };
  } catch {
    // An unreachable polling endpoint is not evidence that generation failed.
    return { state: "processing", transient: true };
  }
}

/** Stops one running film, for example when its order is removed. */
export async function cancelStage(predictionId: string): Promise<boolean> {
  // Runware jobs cannot be recalled; their result is dropped instead.
  if (predictionId.startsWith(RUNWARE_PREFIX)) return false;
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

/** One Replicate prediction, read server-side with our own token. Never throws. */
export async function readReplicatePrediction(
  predictionId: string,
): Promise<{ id: string; model: string; input: Record<string, unknown> } | null> {
  if (!/^[a-z0-9]{10,64}$/i.test(predictionId)) return null;
  try {
    const res = await fetch(`${API_BASE}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) return null;
    const p = (await res.json()) as { id?: string; model?: string; input?: Record<string, unknown> };
    return p.id ? { id: p.id, model: String(p.model ?? ""), input: p.input ?? {} } : null;
  } catch {
    return null;
  }
}

/**
 * Searches recent predictions (documented GET /v1/predictions) for the one a
 * lost submission created. Adopts only a single exact fingerprint match.
 */
export async function findLostReplicatePrediction(
  model: string,
  fingerprint: string,
  since: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/predictions`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) return null;
    const page = (await res.json()) as {
      results?: { id?: string; model?: string; created_at?: string; input?: Record<string, unknown> }[];
    };
    const sinceMs = Date.parse(since) - 60_000;
    const matches: string[] = [];
    for (const p of page.results ?? []) {
      if (!p.id || p.model !== model || Date.parse(p.created_at ?? "") < sinceMs) continue;
      const image = String(p.input?.["image"] ?? "");
      const audio = String(p.input?.["audio"] ?? "");
      if (image && audio && (await dispatchFingerprint(model, image, audio)) === fingerprint)
        matches.push(p.id);
    }
    return matches.length === 1 ? matches[0]! : null;
  } catch {
    return null;
  }
}

/** Replicate's documented webhook signing secret for this account. */
let webhookSecretCache: { value: string; at: number } | null = null;
export async function replicateWebhookSecret(): Promise<string | null> {
  if (webhookSecretCache && Date.now() - webhookSecretCache.at < 3_600_000)
    return webhookSecretCache.value;
  try {
    const res = await fetch(`${API_BASE}/webhooks/default/secret`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { key?: string };
    if (!body.key) return null;
    webhookSecretCache = { value: body.key, at: Date.now() };
    return body.key;
  } catch {
    return null;
  }
}

/** Model key of a Replicate engine, used to verify an adopted prediction. */
export function engineModel(engineKey: string | null | undefined): string | null {
  return engineKey ? (FINAL_VIDEO_ENGINES[engineKey]?.model ?? null) : null;
}

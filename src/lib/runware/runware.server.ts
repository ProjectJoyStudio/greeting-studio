// ---------------------------------------------------------------------------
// Server-only adapter for the official Runware API (https://api.runware.ai/v1).
//
// The Runware key is read here and never leaves the server. This adapter never
// touches the Lovable AI gateway and never touches Replicate.
// ---------------------------------------------------------------------------

import {
  RUNWARE_IMAGE_MODELS,
  RUNWARE_VIDEO_MODELS,
  type RunwareVideoModel,
} from "./catalog";

const API_URL = "https://api.runware.ai/v1";

export type RunwareErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "rate_limited"
  | "timeout"
  | "api_error"
  | "generation_failed";

export class RunwareError extends Error {
  code: RunwareErrorCode;
  taskUUID: string | null;

  constructor(code: RunwareErrorCode, message: string, taskUUID: string | null = null) {
    super(message);
    this.name = "RunwareError";
    this.code = code;
    this.taskUUID = taskUUID;
  }
}

/** Failures another engine of the same kind cannot fix. */
export function isTerminalRunwareCode(code: string): boolean {
  return code === "missing_token" || code === "invalid_token" || code === "insufficient_credit";
}

function token(): string {
  const value = process.env["RUNWARE_API_KEY"];
  if (!value) {
    throw new RunwareError("missing_token", "The Runware provider is not configured.");
  }
  return value;
}

function codeForStatus(status: number): RunwareErrorCode {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

function codeForError(raw: { code?: string; message?: string }): RunwareErrorCode {
  const code = (raw.code ?? "").toLowerCase();
  if (code.includes("unauthor") || code.includes("apikey") || code.includes("authentic")) {
    return "invalid_token";
  }
  if (code.includes("credit") || code.includes("balance") || code.includes("insufficient")) {
    return "insufficient_credit";
  }
  if (code.includes("ratelimit") || code.includes("toomany")) return "rate_limited";
  return "api_error";
}

type RunwareTask = Record<string, unknown>;
type RunwareRow = Record<string, unknown>;

/** Sends one task batch and returns the rows the provider produced. */
export async function runwareTasks(tasks: RunwareTask[]): Promise<RunwareRow[]> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify(tasks),
    });
  } catch (err) {
    throw new RunwareError(
      "api_error",
      err instanceof Error ? err.message : "Runware could not be reached.",
    );
  }

  const raw = await res.text().catch(() => "");
  let parsed: { data?: RunwareRow[]; errors?: Array<{ code?: string; message?: string }> } = {};
  try {
    parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
  } catch {
    parsed = {};
  }

  if (!res.ok && !parsed.errors?.length) {
    throw new RunwareError(
      codeForStatus(res.status),
      `Runware error [${res.status}]: ${raw.slice(0, 300)}`,
    );
  }
  if (parsed.errors?.length) {
    const first = parsed.errors[0]!;
    throw new RunwareError(
      codeForError(first),
      `Runware error [${first.code ?? res.status}]: ${(first.message ?? raw).slice(0, 300)}`,
    );
  }
  return parsed.data ?? [];
}

/** Cheap, non-generative check that the key works and the model exists. */
export async function checkRunwareModel(air: string): Promise<{ ok: boolean; detail: string }> {
  const rows = await runwareTasks([
    { taskType: "modelSearch", taskUUID: crypto.randomUUID(), search: air, limit: 5 },
  ]);
  const results = (rows[0]?.["results"] ?? []) as Array<{ air?: string; name?: string }>;
  const found = results.find((r) => r.air === air);
  if (found) return { ok: true, detail: `Provider and model reachable (${found.name ?? air}).` };
  return { ok: false, detail: `The model ${air} is not available for this account.` };
}

// --- picture sizes ---------------------------------------------------------

const IMAGE_SIZES: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
  "4:3": { width: 1152, height: 896 },
  "3:4": { width: 896, height: 1152 },
  "3:2": { width: 1216, height: 832 },
  "2:3": { width: 832, height: 1216 },
  "4:5": { width: 896, height: 1088 },
};

export function runwareImageSize(aspectRatio?: string): { width: number; height: number } {
  return IMAGE_SIZES[aspectRatio ?? "1:1"] ?? IMAGE_SIZES["1:1"]!;
}

const VIDEO_SIZES: Record<string, { width: number; height: number }> = {
  "1:1": { width: 960, height: 960 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "4:5": { width: 832, height: 1088 },
  "4:3": { width: 1088, height: 832 },
  "3:4": { width: 832, height: 1088 },
};

/**
 * Every animation engine accepts its own list of picture sizes. Sending a size
 * an engine does not know is refused before anything is generated, so each
 * engine gets the size it really supports for the requested shape.
 */
const ENGINE_VIDEO_SIZES: Record<string, Record<string, { width: number; height: number }>> = {
  // PixVerse V6 only accepts its own fixed grid of sizes.
  rw_pixverse_v6: {
    "1:1": { width: 720, height: 720 },
    "16:9": { width: 1280, height: 720 },
    "9:16": { width: 720, height: 1280 },
    "4:5": { width: 720, height: 960 },
    "4:3": { width: 960, height: 720 },
    "3:4": { width: 720, height: 960 },
  },
};

/** Engines that choose the shape from the picture and only take a quality. */
const ENGINE_VIDEO_RESOLUTION: Record<string, string> = {
  rw_kling3_standard: "720p",
};

export function runwareVideoSize(
  aspectRatio?: string,
  generatorKey?: string,
): { width: number; height: number } {
  const table = (generatorKey && ENGINE_VIDEO_SIZES[generatorKey]) || VIDEO_SIZES;
  return table[aspectRatio ?? "16:9"] ?? table["16:9"] ?? VIDEO_SIZES["16:9"]!;
}


// --- pictures --------------------------------------------------------------

export interface RunwareImageInput {
  /** Generator key of the Admin Panel. */
  generatorKey: string;
  prompt: string;
  aspectRatio?: string;
  /** Reference pictures for identity keeping, when the model supports them. */
  referenceImages?: string[];
}

function imageTask(input: RunwareImageInput, taskUUID: string): RunwareTask {
  const model = RUNWARE_IMAGE_MODELS[input.generatorKey];
  if (!model) {
    throw new RunwareError("api_error", `Unknown Runware image engine: ${input.generatorKey}.`);
  }
  const { width, height } = runwareImageSize(input.aspectRatio);
  const task: RunwareTask = {
    taskType: "imageInference",
    taskUUID,
    model: model.air,
    positivePrompt: input.prompt,
    width,
    height,
    numberResults: 1,
    outputType: "URL",
    outputFormat: "JPG",
    includeCost: true,
  };
  const references = (input.referenceImages ?? []).filter(Boolean).slice(0, 8);
  if (model.supportsReferenceImages && references.length) {
    task["inputs"] = { referenceImages: references };
  }
  return task;
}

export interface RunwareImageResult {
  url: string;
  model: string;
  contentType: string;
  fileExtension: string;
  costUsd: number;
  taskUUID: string;
}

/** Renders one picture and waits for it (Runware answers pictures inline). */
export async function runwareRenderImage(input: RunwareImageInput): Promise<RunwareImageResult> {
  const taskUUID = crypto.randomUUID();
  const rows = await runwareTasks([imageTask(input, taskUUID)]);
  const row = rows[0];
  const url = typeof row?.["imageURL"] === "string" ? (row["imageURL"] as string) : null;
  if (!url) throw new RunwareError("generation_failed", "Runware returned no picture.", taskUUID);
  return {
    url,
    model: RUNWARE_IMAGE_MODELS[input.generatorKey]!.air,
    contentType: "image/jpeg",
    fileExtension: "jpg",
    costUsd: Number(row?.["cost"] ?? 0),
    taskUUID,
  };
}

/** The same render, downloaded, for callers that store the bytes themselves. */
export async function runwareRenderImageBytes(input: RunwareImageInput): Promise<{
  bytes: Uint8Array;
  contentType: string;
  fileExtension: string;
  model: string;
  costUsd: number;
}> {
  const rendered = await runwareRenderImage(input);
  const download = await fetch(rendered.url);
  if (!download.ok) {
    throw new RunwareError(
      "generation_failed",
      `Could not download the picture (${download.status}).`,
      rendered.taskUUID,
    );
  }
  const contentType = download.headers.get("content-type") ?? "image/jpeg";
  return {
    bytes: new Uint8Array(await download.arrayBuffer()),
    contentType,
    fileExtension: contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg",
    model: rendered.model,
    costUsd: rendered.costUsd,
  };
}

/** Starts a picture in the background; the caller polls for the result. */
export async function runwareStartImage(input: RunwareImageInput): Promise<string> {
  const taskUUID = crypto.randomUUID();
  await runwareTasks([{ ...imageTask(input, taskUUID), deliveryMethod: "async" }]);
  return taskUUID;
}

// --- animations ------------------------------------------------------------

export interface RunwareVideoInput {
  generatorKey: string;
  prompt: string;
  /** Publicly reachable starting picture. */
  imageUrl: string;
  durationSeconds: number;
  aspectRatio?: string;
  /** Prepared voice track, used only by engines that accept audio. */
  audioUrl?: string | undefined;
}

function clampDuration(model: RunwareVideoModel, seconds: number): number {
  const rounded = Math.round(seconds);
  return Math.min(model.maxDuration, Math.max(model.minDuration, rounded));
}

/**
 * Starts one image-to-video job. Native audio generation is switched OFF for
 * every engine: the only sound a film may carry is the one Project Joy adds.
 */
export async function runwareStartVideo(input: RunwareVideoInput): Promise<string> {
  const model = RUNWARE_VIDEO_MODELS[input.generatorKey];
  if (!model) {
    throw new RunwareError("api_error", `Unknown Runware video engine: ${input.generatorKey}.`);
  }
  const taskUUID = crypto.randomUUID();
  const resolution = ENGINE_VIDEO_RESOLUTION[model.key];
  const size = resolution ? null : runwareVideoSize(input.aspectRatio, model.key);
  const inputs: Record<string, unknown> = { frameImages: [input.imageUrl] };
  const preparedAudio = Boolean(model.supportsAudioInput && input.audioUrl);
  if (preparedAudio) inputs["audio"] = input.audioUrl;

  const task: RunwareTask = {
    taskType: "videoInference",
    taskUUID,
    model: model.air,
    positivePrompt: input.prompt,
    inputs,
    // Kling takes a quality and keeps the shape of the starting picture; the
    // other engines take an exact size from their own supported list.
    ...(resolution ? { resolution } : { width: size!.width, height: size!.height }),
    duration: clampDuration(model, input.durationSeconds),
    numberResults: 1,
    outputType: "URL",
    outputFormat: "MP4",
    deliveryMethod: "async",
    includeCost: true,
  };


  // Native audio is switched off model by model — but never when a prepared
  // voice track was handed in: switching audio off would silence that voice
  // too and the film would show moving lips without a greeting.
  if (!preparedAudio) {
    if (model.key === "rw_wan26_flash") task["providerSettings"] = { alibaba: { audio: false } };
    if (model.key === "rw_kling3_standard") task["providerSettings"] = { klingai: { sound: false } };
    if (model.key === "rw_pixverse_v6") task["settings"] = { audio: false };
  }

  await runwareTasks([task]);
  return taskUUID;
}

export type RunwareProgress =
  | { state: "processing" }
  | { state: "ready"; url: string; costUsd: number }
  | { state: "failed"; errorCode: string; errorMessage: string };

function outputUrl(row: RunwareRow): string | null {
  for (const key of ["videoURL", "imageURL", "audioURL"]) {
    const value = row[key];
    if (typeof value === "string") return value;
  }
  return null;
}

/** Reads the state of one background job. Never throws. */
export async function runwareProgress(taskUUID: string): Promise<RunwareProgress> {
  try {
    const rows = await runwareTasks([{ taskType: "getResponse", taskUUID }]);
    const row = rows[0];
    if (!row) return { state: "processing" };
    const status = String(row["status"] ?? "");
    if (status === "error") {
      return {
        state: "failed",
        errorCode: "generation_failed",
        errorMessage: String(row["errorMessage"] ?? "Runware could not finish the job.").slice(0, 300),
      };
    }
    const url = outputUrl(row);
    if (url) return { state: "ready", url, costUsd: Number(row["cost"] ?? 0) };
    return { state: "processing" };
  } catch (err) {
    if (err instanceof RunwareError && isTerminalRunwareCode(err.code)) {
      return { state: "failed", errorCode: err.code, errorMessage: err.message };
    }
    return { state: "processing" };
  }
}
// --- writing (Prompt Preparation) ------------------------------------------

export interface RunwareTextInput {
  /** Generator key of the Admin Panel. */
  generatorKey: string;
  system: string;
  user: string;
}

/**
 * Runs one text inference request and returns the produced text. Every call
 * builds its own task with its own UUID, so simultaneous requests of different
 * people never share state.
 */
export async function runwareGenerateText(input: RunwareTextInput): Promise<string> {
  const { RUNWARE_TEXT_MODELS } = await import("./catalog");
  const model = RUNWARE_TEXT_MODELS[input.generatorKey];
  if (!model) {
    throw new RunwareError("api_error", `Unknown Runware writing engine: ${input.generatorKey}.`);
  }
  const taskUUID = crypto.randomUUID();
  await runwareTasks([
    {
      taskType: "textInference",
      taskUUID,
      model: model.air,
      deliveryMethod: "async",
      settings: {
        systemPrompt: input.system,
        maxTokens: 800,
        temperature: 0.2,
        thinkingLevel: "low",
      },
      messages: [{ role: "user", content: input.user }],
      includeCost: true,
    },
  ]);

  // The provider answers writing tasks in the background; this request waits
  // for its own task only, so simultaneous requests never mix.
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const rows = await runwareTasks([{ taskType: "getResponse", taskUUID }]);
    const row = rows[0];
    if (!row) continue;
    if (String(row["status"] ?? "") === "error") {
      throw new RunwareError(
        "generation_failed",
        String(row["errorMessage"] ?? "Runware could not finish the writing task.").slice(0, 300),
        taskUUID,
      );
    }
    const text = typeof row["text"] === "string" ? (row["text"] as string).trim() : "";
    if (text) return text;
  }
  throw new RunwareError("timeout", "Runware did not return the prepared text in time.", taskUUID);
}

// --- speech (Personal Video voice) -----------------------------------------

export interface RunwareSpeechInput {
  /** Generator key of the Admin Panel. */
  generatorKey: string;
  text: string;
  /** Voice name or voice model id already validated for this studio. */
  voice?: string | null;
  /** Speaking pace, 1 = natural. */
  speed?: number;
  /**
   * Authorized recording of the chosen voice, used for real voice cloning.
   * The transcript must match what is spoken in the recording.
   */
  referenceVoice?: { audio: string; text: string } | null;
}

export interface RunwareSpeechOutput {
  audio: Uint8Array;
  mimeType: string;
  extension: string;
  air: string;
  cost: number | null;
}

/**
 * Speaks one text with a Runware speech model and returns the finished audio
 * bytes. Every call carries its own task UUID, so simultaneous greetings of
 * different people never mix.
 */
export async function runwareSynthesizeSpeech(
  input: RunwareSpeechInput,
): Promise<RunwareSpeechOutput> {
  const { RUNWARE_SPEECH_MODELS } = await import("./catalog");
  const model = RUNWARE_SPEECH_MODELS[input.generatorKey];
  if (!model) {
    throw new RunwareError("api_error", `Unknown Runware speech engine: ${input.generatorKey}.`);
  }

  const speech: Record<string, unknown> = { text: input.text };
  // A reference recording and a chosen voice name exclude each other: when the
  // voice is cloned from a recording, only the recording decides how it sounds.
  if (input.referenceVoice) {
    // nothing else to set on `speech`
  } else if (input.voice) {
    speech["voice"] = input.voice;
  }
  const pace = Number(input.speed);
  if (Number.isFinite(pace) && pace > 0.5 && pace <= 2 && Math.abs(pace - 1) > 0.001) {
    speech["speed"] = Math.round(pace * 100) / 100;
  }

  const taskUUID = crypto.randomUUID();
  const rows = await runwareTasks([
    {
      taskType: "audioInference",
      taskUUID,
      model: model.air,
      speech,
      ...(input.referenceVoice
        ? {
            inputs: {
              referenceVoices: [
                {
                  audio: input.referenceVoice.audio,
                  text: input.referenceVoice.text.slice(0, 1000),
                },
              ],
            },
          }
        : {}),
      outputType: "URL",
      outputFormat: "MP3",
      deliveryMethod: "sync",
      includeCost: true,
    },
  ]);

  const row = rows.find((r) => r["taskUUID"] === taskUUID) ?? rows[0];
  const url = typeof row?.["audioURL"] === "string" ? (row["audioURL"] as string) : "";
  if (!url) {
    throw new RunwareError("generation_failed", "Runware returned no speech audio.", taskUUID);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new RunwareError("api_error", `Runware audio download failed [${res.status}].`, taskUUID);
  }
  const audio = new Uint8Array(await res.arrayBuffer());
  if (audio.byteLength === 0) {
    throw new RunwareError("generation_failed", "Runware returned empty speech audio.", taskUUID);
  }

  const cost = Number(row?.["cost"] ?? NaN);
  return {
    audio,
    mimeType: "audio/mpeg",
    extension: "mp3",
    air: model.air,
    cost: Number.isFinite(cost) ? cost : null,
  };
}

// --- listening (Voice Sample Verification) ---------------------------------

export interface RunwareTranscribeInput {
  /** Generator key of the Admin Panel. */
  generatorKey: string;
  /** The authorized recording, as raw base64 (never logged). */
  base64: string;
  mimeType: string;
  /** Two-letter code of the language spoken, when it is known. */
  language?: string | null;
}

const TRANSCRIBE_SYSTEM = [
  "You write down speech exactly as it is heard.",
  "Return only the spoken words, with no commentary, labels, quotes or timestamps.",
  "Keep the language that is actually spoken; never translate.",
  "Never rewrite, improve, correct, summarise, shorten or extend what was said.",
  "Keep names and wording exactly as spoken.",
  "If a part cannot be understood, leave it out instead of inventing words.",
  "If no speech can be heard, return an empty answer.",
].join(" ");

/**
 * Writes down the words heard in one authorized recording. The audio travels
 * to the provider inside this request only; it is never logged or stored here.
 */
export async function runwareTranscribeAudio(
  input: RunwareTranscribeInput,
): Promise<string | null> {
  const { RUNWARE_TRANSCRIBE_MODELS } = await import("./catalog");
  const model = RUNWARE_TRANSCRIBE_MODELS[input.generatorKey];
  if (!model) {
    throw new RunwareError("api_error", `Unknown Runware listening engine: ${input.generatorKey}.`);
  }

  const type = (input.mimeType || "audio/webm").split(";")[0]!.toLowerCase();
  const language = input.language && /^[a-z]{2}$/.test(input.language) ? input.language : null;
  const taskUUID = crypto.randomUUID();

  const rows = await runwareTasks([
    {
      taskType: "textInference",
      taskUUID,
      model: model.air,
      inputs: { audios: [`data:${type};base64,${input.base64}`] },
      settings: { systemPrompt: TRANSCRIBE_SYSTEM, temperature: 0, maxTokens: 800 },
      messages: [
        {
          role: "user",
          content: language
            ? `Write down word for word what is said in the attached recording. The speech is in "${language}"; keep that language.`
            : "Write down word for word what is said in the attached recording, in the language spoken.",
        },
      ],
      includeCost: true,
    },
  ]);

  const row = rows.find((r) => r["taskUUID"] === taskUUID) ?? rows[0];
  const text = typeof row?.["text"] === "string" ? (row["text"] as string).trim() : "";
  return text || null;
}

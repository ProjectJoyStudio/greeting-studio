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
  "4:5": { width: 864, height: 1080 },
  "4:3": { width: 960, height: 720 },
  "3:4": { width: 720, height: 960 },
};

export function runwareVideoSize(aspectRatio?: string): { width: number; height: number } {
  return VIDEO_SIZES[aspectRatio ?? "16:9"] ?? VIDEO_SIZES["16:9"]!;
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
  const { width, height } = runwareVideoSize(input.aspectRatio);
  const inputs: Record<string, unknown> = { frameImages: [input.imageUrl] };
  if (model.supportsAudioInput && input.audioUrl) inputs["audio"] = input.audioUrl;

  const task: RunwareTask = {
    taskType: "videoInference",
    taskUUID,
    model: model.air,
    positivePrompt: input.prompt,
    inputs,
    width,
    height,
    duration: clampDuration(model, input.durationSeconds),
    numberResults: 1,
    outputType: "URL",
    outputFormat: "MP4",
    deliveryMethod: "async",
    includeCost: true,
  };

  // Native audio is switched off model by model.
  if (model.key === "rw_wan26_flash") task["providerSettings"] = { alibaba: { audio: false } };
  if (model.key === "rw_kling3_standard") task["providerSettings"] = { klingai: { sound: false } };
  if (model.key === "rw_pixverse_v6") task["settings"] = { audio: false };

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
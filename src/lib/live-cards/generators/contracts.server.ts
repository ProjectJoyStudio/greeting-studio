// Contracts every Project Joy generation engine implements. The rest of the
// application only ever talks to these interfaces, never to a vendor SDK, so
// engines can be added, replaced, disabled or combined without UI changes.

export interface ImageRequest {
  /** English prompt, already prepared by the translation layer. */
  prompt: string;
  aspectRatio: string;
}

export interface ImageOutput {
  /** Temporary URL of the rendered picture at the provider. */
  url: string;
  contentType: string;
  fileExtension: string;
}

export interface GeneratorMetrics {
  /** 1 (lowest) … 10 (highest). Used by the routing layer only. */
  quality: number;
  /** Relative cost per render, 1 (cheapest) … 10. */
  cost: number;
  /** 1 (slowest) … 10 (fastest). */
  speed: number;
}

export interface ImageGenerator {
  key: string;
  /** Internal only — never shown to a user. */
  model: string;
  metrics: GeneratorMetrics;
  /** False when its credentials are missing in this environment. */
  isAvailable(): boolean;
  generate(request: ImageRequest): Promise<ImageOutput>;
}

// --- Animation (image → video) --------------------------------------------

export interface VideoRequest {
  /** Publicly reachable URL of the source picture. */
  imageUrl: string;
  /** English prompt, already prepared by the translation layer. */
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  resolution: string;
}

/** Handle of an animation the engine has accepted but not finished. */
export interface VideoJob {
  jobId: string;
}

export type VideoProgress =
  | { state: "queued" }
  | { state: "processing" }
  | { state: "succeeded"; url: string; contentType: string; fileExtension: string }
  | { state: "failed"; errorCode: string; errorMessage: string };

export interface VideoGenerator {
  key: string;
  model: string;
  metrics: GeneratorMetrics;
  /** Animation lengths this engine offers, in seconds. Never hardcoded in the UI. */
  durations(): number[];
  isAvailable(): boolean;
  /** Accepts the work and returns immediately — generation is asynchronous. */
  start(request: VideoRequest): Promise<VideoJob>;
  /** Reads the current state of an accepted animation. */
  progress(jobId: string): Promise<VideoProgress>;
}

export class GeneratorError extends Error {
  code: string;
  generatorKey: string;

  constructor(code: string, message: string, generatorKey: string) {
    super(message);
    this.name = "GeneratorError";
    this.code = code;
    this.generatorKey = generatorKey;
  }
}

/** Failures that another engine cannot fix. */
export function isTerminal(code: string): boolean {
  return code === "missing_token" || code === "invalid_token" || code === "insufficient_credit";
}
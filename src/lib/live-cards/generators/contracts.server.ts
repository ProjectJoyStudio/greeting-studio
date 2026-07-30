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

/** Reserved for the next phase: image → video animation engines. */
export interface VideoRequest {
  imageUrl: string;
  prompt: string;
  durationSeconds: number;
}

export interface VideoOutput {
  url: string;
  contentType: string;
  fileExtension: string;
  durationSeconds: number;
}

export interface VideoGenerator {
  key: string;
  model: string;
  metrics: GeneratorMetrics;
  isAvailable(): boolean;
  animate(request: VideoRequest): Promise<VideoOutput>;
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
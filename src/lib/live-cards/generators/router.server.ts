// The single internal routing layer. Everything in the application asks this
// module for a picture; it decides which engine runs, in which order, and
// silently moves to the next one when an engine is unavailable or fails.

import {
  configuredImageGenerators,
  configuredVideoGenerators,
  disabledGenerators,
  routingStrategy,
} from "../env.server";
import {
  GeneratorError,
  isTerminal,
  type ImageGenerator,
  type ImageRequest,
  type VideoGenerator,
  type VideoProgress,
  type VideoRequest,
} from "./contracts.server";
import { fluxProGenerator, fluxUltraGenerator } from "./replicate-image.server";
import { wanImageToVideoGenerator } from "./replicate-video.server";

/** Registered image engines. Add, remove or replace entries here only. */
const IMAGE_GENERATORS: ImageGenerator[] = [fluxUltraGenerator, fluxProGenerator];

/** Registered animation engines. Add, remove or replace entries here only. */
const VIDEO_GENERATORS: VideoGenerator[] = [wanImageToVideoGenerator];

export function listVideoGenerators(): VideoGenerator[] {
  return VIDEO_GENERATORS.filter((g) => !disabledGenerators().includes(g.key) && g.isAvailable());
}

function rankVideo(a: VideoGenerator, b: VideoGenerator, strategy: string): number {
  if (strategy === "cost") return a.metrics.cost - b.metrics.cost;
  if (strategy === "speed") return b.metrics.speed - a.metrics.speed;
  return b.metrics.quality - a.metrics.quality;
}

/** Ordered list of animation engines this environment may use for one request. */
export function resolveVideoGenerators(): VideoGenerator[] {
  const available = listVideoGenerators();
  const configured = configuredVideoGenerators();
  const strategy = routingStrategy();
  if (configured.length) {
    const ordered = configured
      .map((key) => available.find((g) => g.key === key))
      .filter((g): g is VideoGenerator => Boolean(g));
    if (ordered.length) return ordered;
  }
  if (strategy === "configured") return available;
  return [...available].sort((a, b) => rankVideo(a, b, strategy));
}

/** Animation lengths the active engine offers — the interface never hardcodes them. */
export function availableDurations(): number[] {
  const engine = resolveVideoGenerators()[0];
  return engine ? engine.durations() : [];
}

export type RoutedAnimation = {
  jobId: string;
  generatorKey: string;
  generatorModel: string;
};

/** Hands the animation to the best available engine, with silent fallback. */
export async function startVideoRequest(request: VideoRequest): Promise<RoutedAnimation> {
  const engines = resolveVideoGenerators();
  if (!engines.length) {
    throw new GeneratorError("no_generator", "No animation engine is available right now.", "-");
  }
  let lastError: GeneratorError | null = null;
  for (const engine of engines) {
    try {
      const job = await engine.start(request);
      return { jobId: job.jobId, generatorKey: engine.key, generatorModel: engine.model };
    } catch (err) {
      lastError =
        err instanceof GeneratorError
          ? err
          : new GeneratorError("unknown", err instanceof Error ? err.message : "Unexpected error.", engine.key);
      if (isTerminal(lastError.code)) break;
    }
  }
  throw lastError ?? new GeneratorError("generation_failed", "The animation could not be started.", "-");
}

/** Reads the progress of an accepted animation from the engine that owns it. */
export async function pollVideoRequest(generatorKey: string, jobId: string): Promise<VideoProgress> {
  const engine = VIDEO_GENERATORS.find((g) => g.key === generatorKey);
  if (!engine) {
    return { state: "failed", errorCode: "no_generator", errorMessage: "The engine is no longer available." };
  }
  return engine.progress(jobId);
}

function rank(a: ImageGenerator, b: ImageGenerator, strategy: string): number {
  if (strategy === "cost") return a.metrics.cost - b.metrics.cost;
  if (strategy === "speed") return b.metrics.speed - a.metrics.speed;
  return b.metrics.quality - a.metrics.quality;
}

/** Ordered list of engines this environment may use for one request. */
export function resolveImageGenerators(): ImageGenerator[] {
  const disabled = disabledGenerators();
  const available = IMAGE_GENERATORS.filter((g) => !disabled.includes(g.key) && g.isAvailable());
  const configured = configuredImageGenerators();
  const strategy = routingStrategy();

  if (configured.length) {
    const ordered = configured
      .map((key) => available.find((g) => g.key === key))
      .filter((g): g is ImageGenerator => Boolean(g));
    if (ordered.length) return ordered;
  }
  if (strategy === "configured") return available;
  return [...available].sort((a, b) => rank(a, b, strategy));
}

export type RoutedImage = {
  url: string;
  contentType: string;
  fileExtension: string;
  generatorKey: string;
  generatorModel: string;
};

/** Runs the request through the best available engine, with silent fallback. */
export async function routeImageRequest(request: ImageRequest): Promise<RoutedImage> {
  const engines = resolveImageGenerators();
  if (!engines.length) {
    throw new GeneratorError("no_generator", "No image engine is available right now.", "-");
  }

  let lastError: GeneratorError | null = null;
  for (const engine of engines) {
    try {
      const output = await engine.generate(request);
      return { ...output, generatorKey: engine.key, generatorModel: engine.model };
    } catch (err) {
      lastError =
        err instanceof GeneratorError
          ? err
          : new GeneratorError("unknown", err instanceof Error ? err.message : "Unexpected error.", engine.key);
      if (isTerminal(lastError.code)) break;
    }
  }
  throw lastError ?? new GeneratorError("generation_failed", "The picture could not be created.", "-");
}
// The single internal routing layer. Everything in the application asks this
// module for a picture; it decides which engine runs, in which order, and
// silently moves to the next one when an engine is unavailable or fails.

import { configuredImageGenerators, disabledGenerators, routingStrategy } from "../env.server";
import {
  GeneratorError,
  isTerminal,
  type ImageGenerator,
  type ImageRequest,
  type VideoGenerator,
} from "./contracts.server";
import { fluxProGenerator, fluxUltraGenerator } from "./replicate-image.server";

/** Registered image engines. Add, remove or replace entries here only. */
const IMAGE_GENERATORS: ImageGenerator[] = [fluxUltraGenerator, fluxProGenerator];

/** Reserved for the animation phase — intentionally empty for now. */
const VIDEO_GENERATORS: VideoGenerator[] = [];

export function listVideoGenerators(): VideoGenerator[] {
  return VIDEO_GENERATORS.filter((g) => !disabledGenerators().includes(g.key) && g.isAvailable());
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
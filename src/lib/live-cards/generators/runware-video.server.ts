// ---------------------------------------------------------------------------
// Live Cards animation engines served by the official Runware API.
//
// All three engines run in image-to-video mode and never generate their own
// sound: the animation of a live greeting card is silent by design.
// ---------------------------------------------------------------------------

import { RUNWARE_VIDEO_MODELS } from "@/lib/runware/catalog";
import {
  GeneratorError,
  type VideoGenerator,
  type VideoProgress,
  type VideoRequest,
} from "./contracts.server";

/** The only animation lengths the Live Cards section offers. */
const DURATIONS = [3, 5, 7];

function metricsFor(key: string): { quality: number; cost: number; speed: number } {
  if (key === "rw_kling3_standard") return { quality: 9, cost: 6, speed: 5 };
  if (key === "rw_pixverse_v6") return { quality: 8, cost: 5, speed: 7 };
  return { quality: 8, cost: 3, speed: 8 };
}

function makeGenerator(key: string): VideoGenerator {
  const model = RUNWARE_VIDEO_MODELS[key]!;
  return {
    key,
    model: model.air,
    metrics: metricsFor(key),
    durations: () => [...DURATIONS],
    isAvailable: () => Boolean(process.env["RUNWARE_API_KEY"]),
    async start(request: VideoRequest) {
      const { runwareStartVideo, RunwareError } = await import("@/lib/runware/runware.server");
      try {
        const taskUUID = await runwareStartVideo({
          generatorKey: key,
          prompt: request.prompt,
          imageUrl: request.imageUrl,
          durationSeconds: request.durationSeconds,
          aspectRatio: request.aspectRatio,
        });
        return { jobId: taskUUID };
      } catch (err) {
        const code = err instanceof RunwareError ? err.code : "generation_failed";
        throw new GeneratorError(
          code,
          err instanceof Error ? err.message : "The animation could not be started.",
          key,
        );
      }
    },
    async progress(jobId: string): Promise<VideoProgress> {
      const { runwareProgress } = await import("@/lib/runware/runware.server");
      const state = await runwareProgress(jobId);
      if (state.state === "processing") return { state: "processing" };
      if (state.state === "failed") {
        return {
          state: "failed",
          errorCode: state.errorCode,
          errorMessage: state.errorMessage,
        };
      }
      return {
        state: "succeeded",
        url: state.url,
        contentType: "video/mp4",
        fileExtension: "mp4",
      };
    },
  };
}

export const runwareWanFlashGenerator = makeGenerator("rw_wan26_flash");
export const runwarePixverseGenerator = makeGenerator("rw_pixverse_v6");
export const runwareKlingStandardGenerator = makeGenerator("rw_kling3_standard");

export const RUNWARE_VIDEO_GENERATORS: VideoGenerator[] = [
  runwareWanFlashGenerator,
  runwarePixverseGenerator,
  runwareKlingStandardGenerator,
];
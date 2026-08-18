// The Live Cards image service. Everything the Live Cards section needs for a
// starting picture goes through here: its own queue, its own configuration,
// its own logging and its own failure handling.
//
// Primary  — the low-cost engine of this service (own integration).
// Backup   — the existing high-cost engines. CURRENTLY DISABLED: automatic
//            fallback is off, so a failed request stops and is reported to the
//            person, who may try again. The integration stays in place for
//            later use and is guarded by two explicit switches.

import { backupHandoverAllowed, primaryCostUsd, primaryModel } from "./config.server";
import {
  isConfirmedFailure,
  LiveImageError,
  renderPrimaryImage,
  type LiveImageRender,
} from "./client.server";
import { logError, logInfo, logWarn } from "./log.server";
import { queueStats, QueueFullError, QueueTimeoutError, withImageSlot } from "./queue.server";

export type LiveCardImageResult = {
  url: string;
  /** Set when the engine returned the picture inline instead of by URL. */
  bytes?: Uint8Array;
  contentType: string;
  fileExtension: string;
  generatorKey: string;
  generatorModel: string;
  usedBackup: boolean;
};

export type LiveCardImageFailure = {
  code: string;
  message: string;
};

export class LiveCardImageServiceError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LiveCardImageServiceError";
    this.code = code;
  }
}

/**
 * OpenAI start-image engines, served through the server-side Replicate
 * adapter. Whether one of them runs is decided solely by Admin → Generators;
 * they are never connected to the animation stage.
 */
const OPENAI_START_IMAGE: Record<string, { model: string; quality: "low" | "medium" | "high" }> = {
  gpt_image_15_medium: { model: "openai/gpt-image-1.5", quality: "medium" },
};

/** The OpenAI engine the administrator selected for the start image, if any. */
async function selectedOpenAiEngine(): Promise<string | null> {
  try {
    const { primaryGenerator } = await import("@/lib/admin/generators/runtime.server");
    const { RUNWARE_CARD_IMAGE_KEYS } = await import("@/lib/runware/catalog");
    const key = await primaryGenerator("live_cards.start_image", [
      "flux_schnell",
      "flux_ultra",
      "flux_1_1_pro",
      ...Object.keys(OPENAI_START_IMAGE),
      ...RUNWARE_CARD_IMAGE_KEYS,
    ]);
    return key && OPENAI_START_IMAGE[key] ? key : null;
  } catch {
    return null;
  }
}

/** The Runware engine the administrator selected for the start image, if any. */
async function selectedRunwareEngine(): Promise<string | null> {
  try {
    const { primaryGenerator } = await import("@/lib/admin/generators/runtime.server");
    const { RUNWARE_CARD_IMAGE_KEYS, isRunwareImageKey } = await import("@/lib/runware/catalog");
    const key = await primaryGenerator("live_cards.start_image", [
      "flux_schnell",
      "flux_ultra",
      "flux_1_1_pro",
      ...Object.keys(OPENAI_START_IMAGE),
      ...RUNWARE_CARD_IMAGE_KEYS,
    ]);
    return key && isRunwareImageKey(key) ? key : null;
  } catch {
    return null;
  }
}

/**
 * Creates one starting picture for a live greeting card.
 * The request is admitted by this service's own queue, rendered by the
 * primary engine and — only on a confirmed engine error — retried once on the
 * backup engine.
 */
export async function createLiveCardImage(input: {
  prompt: string;
  aspectRatio: string;
  requestId?: string;
  userId?: string;
}): Promise<LiveCardImageResult> {
  const requestId = input.requestId ?? crypto.randomUUID();
  const base = { requestId, userId: input.userId ?? null, section: "live_cards" };

  try {
    return await withImageSlot(async () => {
      logInfo("request_started", { ...base, ratio: input.aspectRatio, ...queueStats() });

      // Runware leads when the administrator selected one of its engines.
      const runwareKey = await selectedRunwareEngine();
      if (runwareKey) {
        const { runwareRenderImage, RunwareError } = await import(
          "@/lib/runware/runware.server"
        );
        try {
          const rendered = await runwareRenderImage({
            generatorKey: runwareKey,
            prompt: input.prompt,
            aspectRatio: input.aspectRatio,
          });
          logInfo("request_completed", {
            ...base,
            engine: "primary",
            model: rendered.model,
            status: "succeeded",
            costUsd: rendered.costUsd,
          });
          return {
            url: rendered.url,
            contentType: rendered.contentType,
            fileExtension: rendered.fileExtension,
            generatorKey: runwareKey,
            generatorModel: rendered.model,
            usedBackup: false,
          };
        } catch (err) {
          const code = err instanceof RunwareError ? err.code : "generation_failed";
          const message = err instanceof Error ? err.message : "The picture could not be created.";
          logError("request_failed", {
            ...base,
            engine: "primary",
            model: runwareKey,
            status: "failed",
            code,
            error: message,
            fallback: "off",
          });
          throw new LiveCardImageServiceError(code, message);
        }
      }

      // Administrator's choice first: when an OpenAI start-image engine leads,
      // it renders the picture through the shared provider adapter.
      const openAiKey = await selectedOpenAiEngine();
      if (openAiKey) {
        const engine = OPENAI_START_IMAGE[openAiKey]!;
        const { renderGptImage, GptImageError } = await import(
          "@/lib/replicate/gpt-image.server"
        );
        try {
          const rendered = await renderGptImage({
            quality: engine.quality,
            prompt: input.prompt,
            aspectRatio: input.aspectRatio,
          });
          logInfo("request_completed", {
            ...base,
            engine: "primary",
            model: rendered.model,
            status: "succeeded",
          });
          return {
            url: "",
            bytes: rendered.bytes,
            contentType: rendered.contentType,
            fileExtension: rendered.fileExtension,
            generatorKey: openAiKey,
            generatorModel: rendered.model,
            usedBackup: false,
          };
        } catch (err) {
          const code = err instanceof GptImageError ? err.code : "generation_failed";
          const message = err instanceof Error ? err.message : "The picture could not be created.";
          logError("request_failed", {
            ...base,
            engine: "primary",
            model: engine.model,
            status: "failed",
            code,
            error: message,
            fallback: "off",
          });
          throw new LiveCardImageServiceError(code, message);
        }
      }

      let primaryError: LiveImageError | null = null;
      try {
        const render: LiveImageRender = await renderPrimaryImage(input.prompt, input.aspectRatio);
        logInfo("request_completed", {
          ...base,
          engine: "primary",
          model: render.model,
          status: "succeeded",
          costUsd: primaryCostUsd(),
        });
        return {
          url: render.url,
          contentType: render.contentType,
          fileExtension: render.fileExtension,
          generatorKey: "live_primary",
          generatorModel: render.model,
          usedBackup: false,
        };
      } catch (err) {
        primaryError =
          err instanceof LiveImageError
            ? err
            : new LiveImageError(
                "generation_failed",
                err instanceof Error ? err.message : "Unknown failure.",
              );
      }

      // Backup hand-over is switched off: every failure — slow render,
      // timeout, temporary unavailability or a confirmed engine error —
      // stops here and is reported. The higher-cost engine never starts.
      if (!backupHandoverAllowed() || !isConfirmedFailure(primaryError.code)) {
        logError("request_failed", {
          ...base,
          engine: "primary",
          model: primaryModel(),
          status: "failed",
          code: primaryError.code,
          error: primaryError.message,
          fallback: "off",
        });
        throw new LiveCardImageServiceError(primaryError.code, primaryError.message);
      }

      logWarn("primary_failed_switching_to_backup", { ...base, code: primaryError.code });

      // The backup runs strictly after the primary has finished with a
      // confirmed error — never in parallel with it.
      const { routeImageRequest } = await import("../generators/router.server");
      const { GeneratorError } = await import("../generators/contracts.server");
      try {
        const routed = await routeImageRequest({
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
        });
        logInfo("request_completed", {
          ...base,
          engine: "backup",
          model: routed.generatorModel,
          status: "succeeded",
        });
        return {
          url: routed.url,
          contentType: routed.contentType,
          fileExtension: routed.fileExtension,
          generatorKey: routed.generatorKey,
          generatorModel: routed.generatorModel,
          usedBackup: true,
        };
      } catch (err) {
        const code = err instanceof GeneratorError ? err.code : "generation_failed";
        const message = err instanceof Error ? err.message : "The picture could not be created.";
        logError("request_failed", {
          ...base,
          engine: "backup",
          status: "failed",
          code,
          error: message,
        });
        throw new LiveCardImageServiceError(code, message);
      }
    });
  } catch (err) {
    if (err instanceof QueueFullError || err instanceof QueueTimeoutError) {
      logWarn("request_rejected", { ...base, status: "rejected", code: err.code });
      throw new LiveCardImageServiceError(err.code, err.message);
    }
    throw err;
  }
}

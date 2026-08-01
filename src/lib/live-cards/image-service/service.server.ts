// The Live Cards image service. Everything the Live Cards section needs for a
// starting picture goes through here: its own queue, its own configuration,
// its own logging and its own failure handling.
//
// Primary  — the low-cost engine of this service (own integration).
// Backup   — the existing high-quality engines, used only after a confirmed
//            primary failure. Slowness alone never triggers the backup, and
//            the two engines never run at the same time for one request.

import { backupEnabled } from "./config.server";
import { isConfirmedFailure, LiveImageError, renderPrimaryImage, type LiveImageRender } from "./client.server";
import { logError, logInfo, logWarn } from "./log.server";
import { queueStats, QueueFullError, QueueTimeoutError, withImageSlot } from "./queue.server";

export type LiveCardImageResult = {
  url: string;
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
 * Creates one starting picture for a live greeting card.
 * The request is admitted by this service's own queue, rendered by the
 * primary engine and — only on a confirmed engine error — retried once on the
 * backup engine.
 */
export async function createLiveCardImage(input: {
  prompt: string;
  aspectRatio: string;
  requestId?: string;
}): Promise<LiveCardImageResult> {
  const requestId = input.requestId ?? crypto.randomUUID();

  try {
    return await withImageSlot(async () => {
      logInfo("request_started", { requestId, ratio: input.aspectRatio, ...queueStats() });

      let primaryError: LiveImageError | null = null;
      try {
        const render: LiveImageRender = await renderPrimaryImage(input.prompt, input.aspectRatio);
        logInfo("request_completed", { requestId, engine: "primary", model: render.model });
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
            : new LiveImageError("generation_failed", err instanceof Error ? err.message : "Unknown failure.");
      }

      // A slow render is not a failure: it never hands the work to the backup.
      if (!isConfirmedFailure(primaryError.code)) {
        logError("request_failed", { requestId, engine: "primary", code: primaryError.code });
        throw new LiveCardImageServiceError(primaryError.code, primaryError.message);
      }

      if (!backupEnabled()) {
        logError("request_failed", { requestId, engine: "primary", code: primaryError.code, backup: "disabled" });
        throw new LiveCardImageServiceError(primaryError.code, primaryError.message);
      }

      logWarn("primary_failed_switching_to_backup", { requestId, code: primaryError.code });

      // The backup runs strictly after the primary has finished with a
      // confirmed error — never in parallel with it.
      const { routeImageRequest } = await import("../generators/router.server");
      const { GeneratorError } = await import("../generators/contracts.server");
      try {
        const routed = await routeImageRequest({ prompt: input.prompt, aspectRatio: input.aspectRatio });
        logInfo("request_completed", { requestId, engine: "backup", model: routed.generatorModel });
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
        logError("request_failed", { requestId, engine: "backup", code });
        throw new LiveCardImageServiceError(code, message);
      }
    });
  } catch (err) {
    if (err instanceof QueueFullError || err instanceof QueueTimeoutError) {
      logWarn("request_rejected", { requestId, code: err.code });
      throw new LiveCardImageServiceError(err.code, err.message);
    }
    throw err;
  }
}
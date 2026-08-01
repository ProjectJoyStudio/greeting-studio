// The Live Cards image service. Everything the Live Cards section needs for a
// starting picture goes through here: its own queue, its own configuration,
// its own logging and its own failure handling.
//
// Primary  — the low-cost engine of this service (own integration).
// Backup   — the existing high-cost engines. CURRENTLY DISABLED: automatic
//            fallback is off, so a failed request stops and is reported to the
//            person, who may try again. The integration stays in place for
//            later use and is guarded by two explicit switches.

import { backupHandoverAllowed, primaryCostUsd } from "./config.server";
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
  userId?: string;
}): Promise<LiveCardImageResult> {
  const requestId = input.requestId ?? crypto.randomUUID();
  const base = { requestId, userId: input.userId ?? null, section: "live_cards" };

  try {
    return await withImageSlot(async () => {
      logInfo("request_started", { ...base, ratio: input.aspectRatio, ...queueStats() });

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
            : new LiveImageError("generation_failed", err instanceof Error ? err.message : "Unknown failure.");
      }

      // Backup hand-over is switched off: every failure — slow render,
      // timeout, temporary unavailability or a confirmed engine error —
      // stops here and is reported. The higher-cost engine never starts.
      if (!backupHandoverAllowed() || !isConfirmedFailure(primaryError.code)) {
        logError("request_failed", {
          ...base,
          engine: "primary",
          model: primaryModelName(),
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
        const routed = await routeImageRequest({ prompt: input.prompt, aspectRatio: input.aspectRatio });
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
        logError("request_failed", { ...base, engine: "backup", status: "failed", code, error: message });
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
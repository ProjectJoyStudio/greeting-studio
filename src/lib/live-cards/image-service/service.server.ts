// The Live Cards image service. Everything the Live Cards section needs for a
// starting picture goes through here: its own queue, its own configuration,
// its own logging and its own failure handling.
//
// Primary  — the low-cost engine of this service (own integration).
// Backup   — the existing high-cost engines. CURRENTLY DISABLED: automatic
//            fallback is off, so a failed request stops and is reported to the
//            person, who may try again. The integration stays in place for
//            later use and is guarded by two explicit switches.

import { primaryCostUsd } from "./config.server";
import { LiveImageError, MODEL_BY_KEY, renderPrimaryImage } from "./client.server";
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

/**
 * Every start-image engine an administrator may route to this section, in one
 * list. The saved Admin → Generators configuration decides which of them runs
 * and in which order — nothing here is chosen implicitly.
 */
async function engineKeys(): Promise<string[]> {
  const { RUNWARE_CARD_IMAGE_KEYS } = await import("@/lib/runware/catalog");
  return [
    ...Object.keys(MODEL_BY_KEY),
    ...Object.keys(OPENAI_START_IMAGE),
    ...RUNWARE_CARD_IMAGE_KEYS,
  ];
}

type EngineRender = {
  url: string;
  bytes?: Uint8Array;
  contentType: string;
  fileExtension: string;
  model: string;
  costUsd?: number;
};

type EngineFailure = { code: string; message: string };

/** Runs exactly one engine, whichever provider it belongs to. */
async function renderWithEngine(
  key: string,
  input: { prompt: string; aspectRatio: string },
): Promise<EngineRender> {
  const { isRunwareImageKey } = await import("@/lib/runware/catalog");

  if (isRunwareImageKey(key)) {
    const { runwareRenderImage } = await import("@/lib/runware/runware.server");
    const rendered = await runwareRenderImage({
      generatorKey: key,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
    });
    return {
      url: rendered.url,
      contentType: rendered.contentType,
      fileExtension: rendered.fileExtension,
      model: rendered.model,
      costUsd: rendered.costUsd,
    };
  }

  const openAi = OPENAI_START_IMAGE[key];
  if (openAi) {
    const { renderGptImage } = await import("@/lib/replicate/gpt-image.server");
    const rendered = await renderGptImage({
      quality: openAi.quality,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
    });
    return {
      url: "",
      bytes: rendered.bytes,
      contentType: rendered.contentType,
      fileExtension: rendered.fileExtension,
      model: rendered.model,
    };
  }

  const model = MODEL_BY_KEY[key];
  if (!model) throw new LiveImageError("api_error", "This engine cannot render a start picture.");
  const rendered = await renderPrimaryImage(input.prompt, input.aspectRatio, model);
  return {
    url: rendered.url,
    contentType: rendered.contentType,
    fileExtension: rendered.fileExtension,
    model: rendered.model,
    costUsd: primaryCostUsd(),
  };
}

/** Turns any provider error into one shape, keeping the provider's own code. */
async function toFailure(err: unknown): Promise<EngineFailure> {
  const message = err instanceof Error ? err.message : "The picture could not be created.";
  if (err instanceof LiveImageError) return { code: err.code, message };
  const { RunwareError } = await import("@/lib/runware/runware.server");
  if (err instanceof RunwareError) return { code: err.code, message };
  const { GptImageError } = await import("@/lib/replicate/gpt-image.server");
  if (err instanceof GptImageError) return { code: err.code, message };
  return { code: "generation_failed", message };
}

/** Credential and billing problems that no other engine can repair. */
function isTerminal(code: string): boolean {
  return code === "missing_token" || code === "invalid_token" || code === "insufficient_credit";
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

      // The saved administrator configuration is the only source of truth:
      // it returns the chosen engine first and, when automatic failover is
      // switched on, the selected backup right after it.
      const { generatorOrder } = await import("@/lib/admin/generators/runtime.server");
      const order = await generatorOrder("live_cards.start_image", await engineKeys());

      if (!order.length) {
        const message = "No start-image engine is selected and switched on for Live Cards.";
        logError("request_failed", { ...base, status: "failed", code: "no_generator" });
        throw new LiveCardImageServiceError("no_generator", message);
      }

      let failure: EngineFailure | null = null;
      for (const [index, key] of order.entries()) {
        const role = index === 0 ? "primary" : "backup";
        try {
          const rendered = await renderWithEngine(key, input);
          logInfo("request_completed", {
            ...base,
            engine: role,
            generator: key,
            model: rendered.model,
            status: "succeeded",
            costUsd: rendered.costUsd ?? null,
          });
          return {
            url: rendered.url,
            ...(rendered.bytes ? { bytes: rendered.bytes } : {}),
            contentType: rendered.contentType,
            fileExtension: rendered.fileExtension,
            generatorKey: key,
            generatorModel: rendered.model,
            usedBackup: index > 0,
          };
        } catch (err) {
          failure = await toFailure(err);
          const nextKey = order[index + 1];
          logWarn("engine_failed", {
            ...base,
            engine: role,
            generator: key,
            code: failure.code,
            error: failure.message,
            handover: nextKey && !isTerminal(failure.code) ? nextKey : "none",
          });
          if (isTerminal(failure.code)) break;
        }
      }

      const final = failure ?? {
        code: "generation_failed",
        message: "The picture could not be created.",
      };
      logError("request_failed", { ...base, status: "failed", code: final.code, error: final.message });
      throw new LiveCardImageServiceError(final.code, final.message);
    });
  } catch (err) {
    if (err instanceof QueueFullError || err instanceof QueueTimeoutError) {
      logWarn("request_rejected", { ...base, status: "rejected", code: err.code });
      throw new LiveCardImageServiceError(err.code, err.message);
    }
    throw err;
  }
}

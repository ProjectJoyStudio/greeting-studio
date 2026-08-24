// The single place where Project Joy decides which voice studio speaks a
// greeting. The administrator's choice in the Admin Panel is the source of
// truth: the configured engine is asked first, and the configured backup only
// after a real technical failure. One greeting stays one operation.

import { getVoiceEngine, DEFAULT_VOICE_PROVIDER } from "./providers.server";
import type { SynthesisRequest, SynthesisResult } from "./providers.server";

/** Engines an administrator may choose for the Personal Video voice. */
const VOICE_GENERATORS = ["elevenlabs_tts", "rw_fish_s21_pro"];

/** Engines that reproduce a voice from an authorized reference recording. */
const REFERENCE_ENGINES = new Set(["rw_fish_s21_pro"]);

/** The voice engine that serves one configured generator key. */
function engineIdFor(generatorKey: string): string {
  return generatorKey === "elevenlabs_tts" ? "elevenlabs" : generatorKey;
}

export interface SpokenResult extends SynthesisResult {
  /** The studio that actually spoke this greeting. */
  providerId: string;
  /** Name of the model, as shown in the order facts. */
  modelLabel: string;
  /** Voice credits charged per character when the studio reports none. */
  creditMultiplier: number;
}

async function elevenLabsModel(): Promise<{ modelKey: string; label: string; multiplier: number }> {
  const { getProductionVoiceModelInfo } = await import("@/lib/admin/voice-settings/models.server");
  const info = await getProductionVoiceModelInfo("elevenlabs");
  return { modelKey: info.modelKey, label: info.label, multiplier: info.creditMultiplier };
}

/**
 * Speaks one text.
 *
 * A personal, cloned voice always stays with the studio that holds the clone —
 * its routing is never changed. Every other voice follows the configured
 * primary engine, with the configured backup used only when the primary fails
 * for a technical reason.
 */
export async function speak(args: {
  request: Omit<SynthesisRequest, "modelId">;
  /** True when the voice is a cloned personal voice of the customer. */
  personal: boolean;
  /** The studio the chosen voice belongs to. */
  voiceProvider: string;
  /** The voice exactly as the customer chose it, used to find its recording. */
  selection?: string;
  /** Owner of a personal voice, needed to read their own recording. */
  userId?: string;
}): Promise<SpokenResult> {
  const order: string[] = [];
  const cloneKey = args.voiceProvider === "elevenlabs" ? "elevenlabs_tts" : args.voiceProvider;

  const { generatorOrder } = await import("@/lib/admin/generators/runtime.server");
  const configured = await generatorOrder("personal_video.voice", VOICE_GENERATORS);

  if (args.personal) {
    // A cloned voice stays either with the studio that holds the clone, or with
    // a studio that reproduces it from the customer's own recording.
    order.push(...configured.filter((key) => REFERENCE_ENGINES.has(key) || key === cloneKey));
    if (order.length === 0) order.push(cloneKey);
  } else {
    order.push(...configured);
    if (order.length === 0) {
      order.push((args.voiceProvider || DEFAULT_VOICE_PROVIDER) === "elevenlabs" ? "elevenlabs_tts" : cloneKey);
    }
  }

  // The same recording is used by every engine in the route, so a backup never
  // changes how the greeting sounds. It is read once and only when needed.
  let reference: { audio: string; text: string } | null | undefined;
  const referenceFor = async (): Promise<{ audio: string; text: string } | null> => {
    if (reference !== undefined) return reference;
    const { resolveVoiceReference } = await import("./voice-reference.server");
    reference = await resolveVoiceReference({
      selection: args.selection || args.request.voiceId,
      userId: args.userId,
      language: args.request.language,
    }).catch(() => null);
    return reference;
  };

  let lastError: unknown = null;
  for (const key of order) {
    const providerId = engineIdFor(key);
    try {
      const engine = getVoiceEngine(providerId);
      const isElevenLabs = providerId === "elevenlabs";
      const model = isElevenLabs
        ? await elevenLabsModel()
        : await (async () => {
            const { RUNWARE_SPEECH_MODELS } = await import("@/lib/runware/catalog");
            const entry = RUNWARE_SPEECH_MODELS[key];
            return { modelKey: entry?.air ?? key, label: entry?.label ?? key, multiplier: 1 };
          })();

      const needsReference = REFERENCE_ENGINES.has(key);
      const result = await engine.synthesize({
        ...args.request,
        modelId: model.modelKey,
        reference: needsReference ? await referenceFor() : null,
      });
      if (!result.audio || result.audio.byteLength === 0) throw new Error("voice_empty_response");
      return {
        ...result,
        providerId,
        modelLabel: model.label,
        creditMultiplier: model.multiplier,
      };
    } catch (error) {
      lastError = error;
      console.error(`[pvg-voice] engine "${key}" failed:`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("voice_service_unavailable");
}

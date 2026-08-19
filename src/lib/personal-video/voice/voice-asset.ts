import type { PvgVoiceover } from "./catalog";

export const pvgVoiceQueryKey = (projectId: string) => ["pvg", "voice", projectId] as const;

/** A speech asset is usable only when it points at non-empty generated audio. */
export function isPlayablePvgVoiceover(
  value: PvgVoiceover | null | undefined,
): value is PvgVoiceover {
  return Boolean(
    value?.audioUrl &&
      value.audioUrl.trim().length > 0 &&
      Number.isFinite(value.durationSeconds) &&
      value.durationSeconds > 0 &&
      value.greetingText.trim().length > 0 &&
      value.voiceId.trim().length > 0,
  );
}

export interface PvgMixSources {
  voiceUrl: string | null;
  musicUrl: string | null;
}

/** Voice and music are independent sources; music never substitutes for speech. */
export function pvgMixSources(
  voiceover: PvgVoiceover | null | undefined,
  musicUrl: string | null | undefined,
): PvgMixSources {
  return {
    voiceUrl: isPlayablePvgVoiceover(voiceover) ? voiceover.audioUrl : null,
    musicUrl: musicUrl?.trim() ? musicUrl : null,
  };
}
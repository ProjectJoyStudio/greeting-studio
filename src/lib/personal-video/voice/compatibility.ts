// Which replacement voices Project Joy may honestly call "recommended".
//
// A voice is never recommended because it merely has the right gender. Before
// it is shown, it is measured against the greeting as it stands right now: the
// words being spoken, the language, the time the video leaves, and the other
// voices already chosen. Only a voice that would truly speak together with the
// others, naturally, ever carries the word "recommended".

import {
  previewFor,
  voiceCategory,
  type LibraryVoice,
  type VoiceCategory,
} from "@/lib/voice-library/types";
import { groupSyncCheck, naturalTarget } from "./sync-limits";

export interface SyncContext {
  /** Natural length of every other chosen voice, in seconds. */
  others: number[];
  /** Words of the greeting each voice speaks. */
  words: number;
  /** Time the video leaves for speech, 0 when there is no limit yet. */
  budgetSeconds: number;
  /** How long one word takes with a given voice, as measured before. */
  secondsPerWord: (voiceId: string) => number;
  /** True when that pace comes from a real recording, not a general guess. */
  measured?: (voiceId: string) => boolean;
  /** Voices that already failed for exactly this greeting and duration. */
  blocked?: ReadonlySet<string>;
}

/** Whether one candidate voice would speak together with the others. */
export function fitsWithGroup(voiceId: string, context: SyncContext): boolean {
  if (context.blocked?.has(voiceId)) return false;
  const expected = context.words * context.secondsPerWord(voiceId);
  if (!Number.isFinite(expected) || expected <= 0) return false;
  return groupSyncCheck([...context.others, expected], context.budgetSeconds).ok;
}

/**
 * The best few replacements for the voice that could not keep step: the same
 * group as the participant, a sample to listen to, not already singing along,
 * and — above all — able to speak together with the current voices.
 */
export function compatibleReplacements(
  voices: LibraryVoice[],
  category: VoiceCategory,
  language: string,
  context: SyncContext,
  options: { exclude?: string[]; limit?: number } = {},
): LibraryVoice[] {
  const taken = new Set(options.exclude ?? []);
  const sameGroup = voices.filter(
    (voice) =>
      voiceCategory(voice) === category &&
      !taken.has(voice.externalVoiceId) &&
      Boolean(previewFor(voice, language)),
  );

  const middle = naturalTarget(context.others) ?? 0;
  const scored = sameGroup
    .filter((voice) => fitsWithGroup(voice.externalVoiceId, context))
    .map((voice) => {
      const expected = context.words * context.secondsPerWord(voice.externalVoiceId);
      // Closest to what the other voices naturally do comes first, and a pace
      // Project Joy has really heard before is trusted over a general guess.
      const distance = middle > 0 ? Math.abs(Math.log(expected / middle)) : 0;
      const known = context.measured?.(voice.externalVoiceId) ? 0 : 1;
      return { voice, known, distance };
    })
    .sort(
      (a, b) =>
        a.known - b.known ||
        a.distance - b.distance ||
        a.voice.sortOrder - b.voice.sortOrder ||
        a.voice.name.localeCompare(b.voice.name),
    );

  return scored.slice(0, options.limit ?? 3).map((entry) => entry.voice);
}

/**
 * Everything a recommendation depends on. When any of it changes — the words,
 * the language, the length of the video, the other voices — every earlier
 * judgement is forgotten and the voices are considered again.
 */
export function compatibilityKey(input: {
  projectId: string;
  greeting: string;
  language: string;
  videoSeconds: number;
  speechMode: string;
  otherVoiceIds: string[];
}): string {
  return [
    input.projectId,
    input.language,
    input.speechMode,
    String(input.videoSeconds),
    String(input.greeting.trim().length),
    input.greeting.trim().slice(0, 120),
    [...input.otherVoiceIds].sort().join(","),
  ].join("|");
}

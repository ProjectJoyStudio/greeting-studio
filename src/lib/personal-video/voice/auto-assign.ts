// Automatic voice assignment for the Personal Video Greeting.
//
// Project Joy suggests a voice for every participant, and it never leaves the
// group the participant belongs to: a male participant is only ever offered
// male voices, a female participant only female voices, and a child only
// children's voices. Nothing here is final — every suggestion is shown to the
// person and only counts once they keep it.

import {
  previewFor,
  voiceCategory,
  type LibraryVoice,
  type VoiceCategory,
} from "@/lib/voice-library/types";

export interface AutoAssignParticipant {
  id: string;
  /** The group this participant belongs to, when it is already known. */
  category: VoiceCategory | null;
  /** True when the person has already kept a voice for this participant. */
  confirmed: boolean;
  /** The voice this participant has right now, if any. */
  voiceId: string | null;
  /** How many words this participant speaks, used for the length check. */
  words: number;
}

export interface AutoAssignSuggestion {
  personId: string;
  voiceId: string;
  voiceName: string;
  category: VoiceCategory;
  provider: string;
}

/** Voices of exactly one group that can be listened to in this language. */
export function voicesOfCategory(
  voices: LibraryVoice[],
  category: VoiceCategory,
  language: string,
): LibraryVoice[] {
  const same = voices.filter((v) => voiceCategory(v) === category);
  const withPreview = same.filter((v) => Boolean(previewFor(v, language)));
  return withPreview.length > 0 ? withPreview : same;
}

/**
 * Voices Project Joy would suggest for one participant: same group, a ready
 * sample, not already spoken by somebody else in this greeting.
 */
export function recommendVoices(
  voices: LibraryVoice[],
  category: VoiceCategory,
  language: string,
  options: { exclude?: string[]; limit?: number } = {},
): LibraryVoice[] {
  const taken = new Set(options.exclude ?? []);
  return voicesOfCategory(voices, category, language)
    .filter((v) => !taken.has(v.externalVoiceId))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .slice(0, options.limit ?? 5);
}

/**
 * A voice for every participant that still needs one. Voices the person has
 * already kept are never touched unless they are explicitly included.
 */
export function autoAssignVoices(input: {
  participants: AutoAssignParticipant[];
  voices: LibraryVoice[];
  language: string;
  /** Seconds the speech may take in total, 0 when there is no limit yet. */
  budgetSeconds: number;
  secondsPerWord: (voiceId: string) => number;
  /** True to give a new voice to participants whose voice was kept too. */
  includeConfirmed?: boolean;
}): AutoAssignSuggestion[] {
  const suggestions: AutoAssignSuggestion[] = [];
  // Voices that stay as they are may not be handed out a second time.
  const used = new Set(
    input.participants
      .filter((p) => p.voiceId && p.confirmed && !input.includeConfirmed)
      .map((p) => p.voiceId as string),
  );

  for (const person of input.participants) {
    if (person.confirmed && !input.includeConfirmed) continue;
    const category = person.category ?? "female";
    const options = recommendVoices(input.voices, category, input.language, {
      exclude: [...used],
      limit: 50,
    });
    if (options.length === 0) continue;

    // Of the fitting voices, the one that comfortably speaks this many words
    // inside the time the video lasts is preferred.
    const chosen =
      (input.budgetSeconds > 0 && person.words > 0
        ? options.find(
            (v) => person.words * input.secondsPerWord(v.externalVoiceId) <= input.budgetSeconds,
          )
        : undefined) ?? options[0]!;

    used.add(chosen.externalVoiceId);
    suggestions.push({
      personId: person.id,
      voiceId: chosen.externalVoiceId,
      voiceName: chosen.displayName || chosen.name,
      category,
      provider: chosen.provider,
    });
  }
  return suggestions;
}

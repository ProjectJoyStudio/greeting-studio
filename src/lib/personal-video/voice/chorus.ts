// Who really speaks when all participants speak together. A place in the
// chorus is filled by any valid voice: a Project Joy voice or a personal voice
// from "My voices". Where the voice comes from never changes whether it
// counts, and every voice speaks the very same greeting text.

import { personalVoiceRef, type PersonalVoice } from "./personal-voices";
import type { PvgVoiceRecording } from "./recordings";

/** One place in the chorus. */
export type ChorusEntry =
  | { kind: "voice"; id: string; name: string }
  | { kind: "audio"; url: string; name: string; seconds: number };

export interface ChorusParticipant {
  id: string;
  label: string;
  personalVoiceId: string | null;
}

export interface ChorusInput {
  participants: ChorusParticipant[];
  /** The Project Joy voice chosen for a participant. */
  assignments: Record<string, { id: string; name: string } | undefined>;
  /** A recording the participant made themselves, kept for other modes. */
  recordings: Record<string, PvgVoiceRecording | undefined>;
  /** Everything in "My voices" plus the voices kept for this project. */
  personalVoices: PersonalVoice[];
  /** Voices picked freely for the chorus, used when a place is still open. */
  chosen: { id: string; name: string }[];
}

export function chorusEntriesFor(input: ChorusInput): ChorusEntry[] {
  const entries: ChorusEntry[] = [];
  input.participants.forEach((person, index) => {
    const personal = person.personalVoiceId
      ? input.personalVoices.find((voice) => voice.id === person.personalVoiceId)
      : undefined;
    // A personal voice speaks the current greeting itself: the short sample it
    // was made from is never played back as the greeting.
    if (personal && personal.providerVoiceId && personal.processingStatus === "ready") {
      entries.push({
        kind: "voice",
        id: personalVoiceRef(personal.id),
        name: personal.displayName,
      });
      return;
    }
    const library = input.assignments[person.id] ?? input.chosen[index];
    if (library) entries.push({ kind: "voice", id: library.id, name: library.name });
  });
  // Voices picked beyond the participants themselves still sing along.
  for (let index = input.participants.length; index < input.chosen.length; index += 1) {
    const extra = input.chosen[index]!;
    entries.push({ kind: "voice", id: extra.id, name: extra.name });
  }
  return entries;
}

// Project Joy solves voice compatibility itself.
//
// When several people speak one greeting together, a voice never fails alone:
// it fails inside a group. So Project Joy never hands the person a single new
// voice and hopes. It searches complete combinations — keeping every voice it
// can, changing as few as possible — and only shows a replacement once the
// whole group has been checked together. Combinations already proven wrong are
// remembered, so the same circle is never walked twice.

import {
  previewFor,
  voiceCategory,
  type LibraryVoice,
  type VoiceCategory,
} from "@/lib/voice-library/types";
import { groupSyncCheck, naturalTarget } from "./sync-limits";

/** How dearly a voice is held on to when a combination has to change. */
export type Preservation = "personal" | "manual" | "auto";

const HOLD: Record<Preservation, number> = { personal: 0, manual: 1, auto: 2 };

export interface GroupMember {
  personId: string;
  label: string;
  /** The id used for speaking; empty when the place is a recording. */
  voiceId: string;
  voiceName: string;
  /** The voice group of this participant: female, male or children. */
  category: VoiceCategory | null;
  preservation: Preservation;
  /** True when nothing may be exchanged here, e.g. a recording of their own. */
  locked?: boolean;
  /** A length Project Joy really measured, when it has one. */
  seconds?: number;
}

export interface GroupContext {
  words: number;
  budgetSeconds: number;
  secondsPerWord: (voiceId: string) => number;
  measured?: (voiceId: string) => boolean;
  /** Voices that already failed for exactly this greeting and duration. */
  blocked?: ReadonlySet<string>;
  /** Complete combinations already proven not to work. */
  failedCombos?: ReadonlySet<string>;
}

export interface GroupChange {
  personId: string;
  label: string;
  fromVoiceId: string;
  fromVoiceName: string;
  to: LibraryVoice;
}

export interface GroupPlan {
  /** True when the voices as they stand already speak together naturally. */
  alreadyFine: boolean;
  /** The smallest set of changes that makes the whole group work. */
  changes: GroupChange[];
  /** Other single replacements checked against the very same whole group. */
  alternatives: LibraryVoice[];
  /** True when no natural combination exists within this video length. */
  impossible: boolean;
}

/** One combination of voices, written the same way every time. */
export function comboKey(voiceIds: string[]): string {
  return [...voiceIds].sort().join("+");
}

function lengthOf(member: GroupMember, voiceId: string, context: GroupContext): number {
  if (member.locked && member.seconds) return member.seconds;
  return context.words * context.secondsPerWord(voiceId);
}

function worksTogether(ids: string[], lengths: number[], context: GroupContext): boolean {
  if (context.failedCombos?.has(comboKey(ids))) return false;
  if (lengths.some((value) => !Number.isFinite(value) || value <= 0)) return false;
  return groupSyncCheck(lengths, context.budgetSeconds).ok;
}

/** Voices that may stand in for a participant: same group, sample ready, free. */
function candidatesFor(
  voices: LibraryVoice[],
  category: VoiceCategory | null,
  language: string,
  taken: ReadonlySet<string>,
  context: GroupContext,
): LibraryVoice[] {
  return voices.filter(
    (voice) =>
      (category === null || voiceCategory(voice) === category) &&
      !taken.has(voice.externalVoiceId) &&
      !context.blocked?.has(voice.externalVoiceId) &&
      Boolean(previewFor(voice, language)),
  );
}

function scoreOf(expected: number, middle: number, known: boolean): number {
  const distance = middle > 0 ? Math.abs(Math.log(expected / middle)) : 0;
  return distance + (known ? 0 : 0.25);
}

/**
 * The whole search. Project Joy tries, in this order: the voices exactly as
 * they are; then one single change, starting with the voice it holds least
 * dearly; then two changes. The first complete combination that speaks
 * naturally together wins — nothing more is ever changed than it must be.
 */
export function solveGroup(
  members: GroupMember[],
  voices: LibraryVoice[],
  language: string,
  context: GroupContext,
  options: { failingPersonId?: string; maxChanges?: number; alternatives?: number } = {},
): GroupPlan {
  const maxChanges = options.maxChanges ?? 2;
  const empty: GroupPlan = {
    alreadyFine: false,
    changes: [],
    alternatives: [],
    impossible: true,
  };
  if (members.length < 2) return { ...empty, alreadyFine: true, impossible: false };

  const currentIds = members.map((m) => m.voiceId);
  const currentLengths = members.map((m) => lengthOf(m, m.voiceId, context));
  if (worksTogether(currentIds, currentLengths, context)) {
    return { alreadyFine: true, changes: [], alternatives: [], impossible: false };
  }

  const taken = new Set(currentIds.filter(Boolean));
  // The voice that broke first is tried before anything else, then the ones
  // Project Joy chose itself, and personal voices only as a last resort.
  const order = members
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => !member.locked)
    .sort(
      (a, b) =>
        Number(b.member.personId === options.failingPersonId) -
          Number(a.member.personId === options.failingPersonId) ||
        HOLD[b.member.preservation] - HOLD[a.member.preservation] ||
        a.index - b.index,
    );

  // ---- one single change -------------------------------------------------
  const singles: { change: GroupChange; score: number }[] = [];
  for (const { member, index } of order) {
    const others = currentLengths.filter((_, i) => i !== index);
    const middle = naturalTarget(others) ?? 0;
    for (const voice of candidatesFor(voices, member.category, language, taken, context)) {
      const id = voice.externalVoiceId;
      const expected = context.words * context.secondsPerWord(id);
      const ids = currentIds.map((value, i) => (i === index ? id : value));
      const lengths = currentLengths.map((value, i) => (i === index ? expected : value));
      if (!worksTogether(ids, lengths, context)) continue;
      singles.push({
        change: {
          personId: member.personId,
          label: member.label,
          fromVoiceId: member.voiceId,
          fromVoiceName: member.voiceName,
          to: voice,
        },
        // The voice held least dearly is changed first, and inside that the
        // pace closest to what the rest of the group naturally does.
        score:
          (member.personId === options.failingPersonId ? 0 : 10) +
          (2 - HOLD[member.preservation]) +
          scoreOf(expected, middle, Boolean(context.measured?.(id))),
      });
    }
    if (singles.length >= 24) break;
  }
  if (singles.length > 0) {
    singles.sort((a, b) => a.score - b.score);
    const best = singles[0]!.change;
    const alternatives = singles
      .filter((entry) => entry.change.personId === best.personId)
      .slice(1, 1 + (options.alternatives ?? 3))
      .map((entry) => entry.change.to);
    return { alreadyFine: false, changes: [best], alternatives, impossible: false };
  }

  // ---- two changes -------------------------------------------------------
  if (maxChanges >= 2) {
    for (let a = 0; a < order.length; a += 1) {
      for (let b = a + 1; b < order.length; b += 1) {
        const first = order[a]!;
        const second = order[b]!;
        const listA = candidatesFor(voices, first.member.category, language, taken, context);
        const listB = candidatesFor(voices, second.member.category, language, taken, context);
        for (const voiceA of listA.slice(0, 12)) {
          for (const voiceB of listB.slice(0, 12)) {
            if (voiceA.externalVoiceId === voiceB.externalVoiceId) continue;
            const ids = [...currentIds];
            const lengths = [...currentLengths];
            ids[first.index] = voiceA.externalVoiceId;
            ids[second.index] = voiceB.externalVoiceId;
            lengths[first.index] = context.words * context.secondsPerWord(voiceA.externalVoiceId);
            lengths[second.index] = context.words * context.secondsPerWord(voiceB.externalVoiceId);
            if (!worksTogether(ids, lengths, context)) continue;
            return {
              alreadyFine: false,
              alternatives: [],
              impossible: false,
              changes: [
                {
                  personId: first.member.personId,
                  label: first.member.label,
                  fromVoiceId: first.member.voiceId,
                  fromVoiceName: first.member.voiceName,
                  to: voiceA,
                },
                {
                  personId: second.member.personId,
                  label: second.member.label,
                  fromVoiceId: second.member.voiceId,
                  fromVoiceName: second.member.voiceName,
                  to: voiceB,
                },
              ],
            };
          }
        }
      }
    }
  }

  return empty;
}

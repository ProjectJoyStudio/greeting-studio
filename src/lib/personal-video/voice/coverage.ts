// Client-safe comparison between the sentence a person was asked to read and
// the words Project Joy actually heard. Speech is never compared letter by
// letter: small differences in pronunciation, endings, punctuation or a
// harmless substitution never count as a missing word.

export interface CoverageResult {
  /** Share of the sample that was clearly spoken, 0…1. */
  coverage: number;
  /** How many words at the very end were not heard at all. */
  missingTail: number;
  totalWords: number;
  matchedWords: number;
}

/** Words without punctuation, case or accents, so only the sounds are left. */
export function normaliseWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u0301\u0308]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, i) => i);
  for (let i = 1; i < rows; i++) {
    const current = [i];
    for (let j = 1; j < cols; j++) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[cols - 1]!;
}

/** How alike two spoken words are, 0…1. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - distance(a, b) / longest;
}

/** Two words count as the same word when they simply sound alike enough. */
function sameWord(expected: string, heard: string): boolean {
  if (expected === heard) return true;
  // Short words are forgiving about a single different letter, longer words
  // about endings and inflections.
  const threshold = expected.length <= 4 ? 0.5 : 0.62;
  if (similarity(expected, heard) >= threshold) return true;
  const stem = Math.min(expected.length, heard.length, 5);
  return stem >= 4 && expected.slice(0, stem) === heard.slice(0, stem);
}

/**
 * How much of the prepared sentence was really spoken. Words may be heard in
 * a slightly different shape, and a stray extra word never counts against the
 * person: only words that are truly absent are missing.
 */
export function coverageOf(expected: string, heard: string): CoverageResult {
  const want = normaliseWords(expected);
  const got = normaliseWords(heard);
  const matched: boolean[] = want.map(() => false);
  let cursor = 0;
  for (let i = 0; i < want.length; i++) {
    const word = want[i]!;
    // Look ahead a little so extra or merged words never break the alignment.
    for (let j = cursor; j < Math.min(got.length, cursor + 6); j++) {
      if (sameWord(word, got[j]!)) {
        matched[i] = true;
        cursor = j + 1;
        break;
      }
    }
  }
  // A word still counts when it was heard anywhere else in the recording.
  for (let i = 0; i < want.length; i++) {
    if (matched[i]) continue;
    if (got.some((word) => sameWord(want[i]!, word))) matched[i] = true;
  }

  let missingTail = 0;
  for (let i = want.length - 1; i >= 0 && !matched[i]; i--) missingTail++;

  const matchedWords = matched.filter(Boolean).length;
  return {
    coverage: want.length === 0 ? 1 : matchedWords / want.length,
    missingTail,
    totalWords: want.length,
    matchedWords,
  };
}

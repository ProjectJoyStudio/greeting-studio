// What still sounds like a person. When several voices speak one greeting
// together, Project Joy may hurry a voice a little and hold another back a
// little — but never so far that the speech turns slow, drawn out, hurried or
// mechanical. These are the limits every synchronisation stays inside, and the
// same limits decide which replacement voices may ever be recommended.

/** The most a voice may be hurried: speech can carry a little quickening. */
export const PVG_SYNC_MAX_SPEEDUP = 1.3;

/**
 * The most a voice may be held back. Slowing speech is heard far sooner than
 * quickening it, so a voice is never stretched the way it may be hurried.
 */
export const PVG_SYNC_MAX_STRETCH = 1.15;

/** A hair of tolerance, so rounding alone never fails a voice. */
export const PVG_SYNC_TOLERANCE = 1.03;

export interface SyncFit {
  /** True when all the voices can meet at one natural length. */
  ok: boolean;
  /** The length they would meet at, in the same unit as the input. */
  target: number;
  /** The voice furthest from that length, when they cannot meet. */
  worstIndex: number;
  /** How much that voice would have to be hurried (>1) or held back (<1). */
  factor: number;
  /** True when the voices simply need more time than the video allows. */
  overflow?: boolean;
}

/**
 * The one length a group of voices can naturally agree on: never the longest
 * voice, never the shortest, but the middle ground that keeps every single one
 * of them inside its own natural range.
 */
export function naturalTarget(lengths: number[]): number | null {
  const clean = lengths.filter((value) => Number.isFinite(value) && value > 0);
  if (clean.length === 0) return null;
  const shortest = Math.min(...clean);
  const longest = Math.max(...clean);
  const lowest = longest / PVG_SYNC_MAX_SPEEDUP;
  const highest = shortest * PVG_SYNC_MAX_STRETCH;
  if (lowest > highest * PVG_SYNC_TOLERANCE) return null;
  // The balanced middle: equally far from the quickest and the calmest voice.
  const middle = Math.sqrt(shortest * longest);
  return Math.min(Math.max(middle, Math.min(lowest, highest)), Math.max(lowest, highest));
}

/** Whether this group of voices can speak the greeting together, naturally. */
export function groupSyncCheck(lengths: number[], budgetSeconds = 0): SyncFit {
  const target = naturalTarget(lengths);
  if (target === null) {
    const middle = Math.sqrt(Math.min(...lengths) * Math.max(...lengths));
    let worstIndex = 0;
    let factor = 1;
    lengths.forEach((length, index) => {
      const value = length / middle;
      if (Math.abs(Math.log(value)) > Math.abs(Math.log(factor))) {
        factor = value;
        worstIndex = index;
      }
    });
    return { ok: false, target: middle, worstIndex, factor };
  }
  if (budgetSeconds > 0 && target > budgetSeconds) {
    // Time is short: the voices may be hurried, but only inside their range.
    const quickest = Math.max(...lengths) / PVG_SYNC_MAX_SPEEDUP;
    if (quickest > budgetSeconds) {
      return { ok: false, target, worstIndex: -1, factor: target / budgetSeconds, overflow: true };
    }
    return { ok: true, target: budgetSeconds, worstIndex: -1, factor: 1 };
  }
  return { ok: true, target, worstIndex: -1, factor: 1 };
}

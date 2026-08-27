// Single source of truth for the animation lengths a person may choose and for
// the credit price of each length. Only three lengths exist: 3, 5 and 7
// seconds, priced at 2, 4 and 6 credits.

/** 3, 5, 7 — the only selectable animation lengths. */
export const ANIMATION_DURATIONS: number[] = [3, 5, 7];

export const ANIMATION_DURATION_MIN = 3;
export const ANIMATION_DURATION_MAX = 7;
export const ANIMATION_DURATION_DEFAULT = 3;

/** Credits per length, for the first animation of a live card project. */
export const ANIMATION_DURATION_CREDITS: Record<number, number> = {
  3: 2,
  5: 4,
  7: 6,
};

export function animationDurationCredits(seconds: number): number {
  return ANIMATION_DURATION_CREDITS[normaliseAnimationDuration(seconds)] ?? 2;
}

/** Every further animation of the same project costs the same flat price. */
export const ANIMATION_REGENERATE_CREDITS = 2;

/** How many successful paid regenerations one project may ever produce. */
export const MAX_ANIMATION_REGENERATIONS = 5;

/** Snaps any incoming value onto the nearest supported length. */
export function normaliseAnimationDuration(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return ANIMATION_DURATION_DEFAULT;
  return ANIMATION_DURATIONS.reduce((best, option) =>
    Math.abs(option - n) < Math.abs(best - n) ? option : best,
  ANIMATION_DURATIONS[0]);
}

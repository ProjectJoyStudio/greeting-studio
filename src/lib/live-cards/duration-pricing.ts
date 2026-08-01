// Single source of truth for the animation lengths a person may choose and for
// the future credit price of each length. The price table is intentionally
// empty for now: credits are not connected yet, so the interface shows a
// placeholder instead of a made-up number. Filling the table later is enough —
// the slider and the summary need no further change.

export const ANIMATION_DURATION_MIN = 3;
export const ANIMATION_DURATION_MAX = 7;
export const ANIMATION_DURATION_STEP = 1;
export const ANIMATION_DURATION_DEFAULT = 3;

/** 3, 4, 5, 6, 7 — kept in one place for the page and the server. */
export const ANIMATION_DURATIONS: number[] = Array.from(
  { length: (ANIMATION_DURATION_MAX - ANIMATION_DURATION_MIN) / ANIMATION_DURATION_STEP + 1 },
  (_, i) => ANIMATION_DURATION_MIN + i * ANIMATION_DURATION_STEP,
);

/** Credits per length. `null` = not priced yet; nothing is ever deducted. */
export const ANIMATION_DURATION_CREDITS: Record<number, number | null> = {
  3: null,
  4: null,
  5: null,
  6: null,
  7: null,
};

export function animationDurationCredits(seconds: number): number | null {
  return ANIMATION_DURATION_CREDITS[seconds] ?? null;
}

/** Keeps any incoming value inside the supported range. */
export function normaliseAnimationDuration(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return ANIMATION_DURATION_DEFAULT;
  if (n < ANIMATION_DURATION_MIN) return ANIMATION_DURATION_MIN;
  if (n > ANIMATION_DURATION_MAX) return ANIMATION_DURATION_MAX;
  return n;
}

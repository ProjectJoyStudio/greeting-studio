// Client-safe rules for the generation attempts of one card creation.

/** Every new card creation starts with this many free generation attempts. */
export const FREE_CARD_ATTEMPTS = 5;
/** How many extra attempts one paid package unlocks. */
export const ATTEMPTS_PER_PACK = 5;
/** Price of one extra package, in credits. */
export const ATTEMPT_PACK_CREDITS = 1;

export interface CardAttemptState {
  used: number;
  allowed: number;
  remaining: number;
  packs: number;
}

export function attemptState(used: number, packs: number): CardAttemptState {
  const allowed = FREE_CARD_ATTEMPTS + packs * ATTEMPTS_PER_PACK;
  return { used, allowed, remaining: Math.max(0, allowed - used), packs };
}

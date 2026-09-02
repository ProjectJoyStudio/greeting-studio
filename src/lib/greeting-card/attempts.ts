// Client-safe rules for the generation attempts of one card creation.

/** A card creation starts without attempts; every attempt is bought in packages. */
export const FREE_CARD_ATTEMPTS = 0;
/** How many attempts one paid package unlocks. */
export const ATTEMPTS_PER_PACK = 3;
/** Price of one extra package, in credits. */
export const ATTEMPT_PACK_CREDITS = 4;

export interface CardAttemptState {
  used: number;
  allowed: number;
  remaining: number;
  packs: number;
}

/**
 * `freeAttempts` is the one-time first-free-card right of a new account: it
 * adds exactly one generation and never changes the paid economics.
 */
export function attemptState(
  used: number,
  packs: number,
  freeAttempts = 0,
): CardAttemptState {
  const allowed = FREE_CARD_ATTEMPTS + packs * ATTEMPTS_PER_PACK + freeAttempts;
  return { used, allowed, remaining: Math.max(0, allowed - used), packs };
}

/** One free generation is granted by the first-free entitlement. */
export const FREE_FIRST_CARD_ATTEMPTS = 1;

/** Credits spent on attempt packages for this card order — never a wallet diff. */
export function spentCredits(state: CardAttemptState): number {
  return state.packs * ATTEMPT_PACK_CREDITS;
}

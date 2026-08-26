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

export function attemptState(used: number, packs: number): CardAttemptState {
  const allowed = FREE_CARD_ATTEMPTS + packs * ATTEMPTS_PER_PACK;
  return { used, allowed, remaining: Math.max(0, allowed - used), packs };
}

/** Credits spent on attempt packages for this card order — never a wallet diff. */
export function spentCredits(state: CardAttemptState): number {
  return state.packs * ATTEMPT_PACK_CREDITS;
}

// Client-safe rules for the start-image attempts of one live greeting card.

/** How many start-image attempts one paid package unlocks. */
export const LIVE_CARD_ATTEMPTS_PER_PACK = 3;
/** Price of one package, in credits. */
export const LIVE_CARD_PACK_CREDITS = 4;

export interface LiveCardAttemptState {
  used: number;
  packs: number;
  allowed: number;
  remaining: number;
}

export function liveCardAttemptState(used: number, packs: number): LiveCardAttemptState {
  const allowed = packs * LIVE_CARD_ATTEMPTS_PER_PACK;
  return { used, packs, allowed, remaining: Math.max(0, allowed - used) };
}

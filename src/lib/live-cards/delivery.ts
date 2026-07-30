// ---------------------------------------------------------------------------
// Contracts for what happens AFTER a live greeting card has been animated.
//
// Nothing here is wired to the interface yet: the animation phase fills these
// in. Declaring them now keeps the finished-card actions (download, save to
// the account, send to the recipient, share, copy link) part of the same data
// model instead of a later redesign.
// ---------------------------------------------------------------------------

export type LiveCardAction = "download" | "save" | "send" | "share" | "copy_link";

/** Every action a finished live greeting card will offer, in display order. */
export const LIVE_CARD_ACTIONS: LiveCardAction[] = [
  "download",
  "save",
  "send",
  "share",
  "copy_link",
];

/** Channels the "send" and "share" actions will use. */
export type LiveCardChannel =
  | "telegram"
  | "whatsapp"
  | "viber"
  | "facebook"
  | "messenger"
  | "email"
  | "native";

/** What the finished-card panel needs once the animation exists. */
export interface FinishedLiveCard {
  id: string;
  videoUrl: string | null;
  /** Public link, present only after the person shares the card. */
  shareUrl: string | null;
  isSaved: boolean;
}

/** True while the card is not finished, so actions stay disabled. */
export function actionsAvailable(card: { videoStatus: string | null }): boolean {
  return card.videoStatus === "ready";
}

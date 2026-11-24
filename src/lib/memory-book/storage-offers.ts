// Client-safe rules of the two separate Memory Book storage services:
// "working" = extra time to FINISH an unfinished book,
// "completed" = online storage of a COMPLETED, read-only book.

export type StorageService = "working" | "completed";

export interface StorageOffer {
  code: string;
  service: StorageService;
  durationDays: number;
  durationMonths: number;
  /** null = no price set yet; such an offer can never be bought. */
  credits: number | null;
  enabled: boolean;
  updatedAt: string | null;
}

export type StoragePurchaseError =
  | "insufficient_credits"
  | "not_found"
  | "wrong_status"
  | "offer_unavailable"
  | "price_changed"
  | "assets_unavailable"
  | "failed";

/** An offer is purchasable only when switched on AND it has a real price. */
export function offerAvailable(offer: Pick<StorageOffer, "enabled" | "credits">): boolean {
  return offer.enabled && typeof offer.credits === "number" && offer.credits >= 1;
}

/** Offers that apply to one book, never mixing the two services. */
export function offersForBook<T extends Pick<StorageOffer, "service">>(offers: T[], status: string): T[] {
  const service: StorageService = status === "completed" ? "completed" : "working";
  return offers.filter((o) => o.service === service);
}

/**
 * New end date: an active period is extended from its current end; an
 * expired period restarts from now, so expired time is never paid for.
 * Mirrors the database purchase action.
 */
export function extendedExpiry(
  current: string | null,
  offer: Pick<StorageOffer, "durationDays" | "durationMonths">,
  now: Date = new Date(),
): Date {
  const end = current ? new Date(current) : null;
  const base = end && Number.isFinite(end.getTime()) && end > now ? new Date(end) : new Date(now);
  if (offer.durationMonths) base.setUTCMonth(base.getUTCMonth() + offer.durationMonths);
  if (offer.durationDays) base.setUTCDate(base.getUTCDate() + offer.durationDays);
  return base;
}

/** Validates an administrator's price input: whole credits 1..100000 or empty. */
export function parseOfferPrice(raw: string): number | null | "invalid" {
  const value = raw.trim();
  if (value === "") return null;
  if (!/^\d+$/.test(value)) return "invalid";
  const n = Number(value);
  return n >= 1 && n <= 100000 ? n : "invalid";
}

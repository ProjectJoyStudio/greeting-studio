// ---------------------------------------------------------------------------
// First Free Greeting — shared, client-safe helpers.
//
// The entitlement itself lives server-side (public.user_entitlements) and is
// consumed by an atomic database function. Nothing here is authoritative; it
// only mirrors the server rules so the UI can stay consistent.
// ---------------------------------------------------------------------------

/** The only two products that may ever consume the first-free entitlement. */
export const FIRST_FREE_ELIGIBLE_PRODUCTS = ["card", "animated"] as const;
export type FirstFreeProduct = (typeof FIRST_FREE_ELIGIBLE_PRODUCTS)[number];

export function isFirstFreeEligibleProduct(value: unknown): value is FirstFreeProduct {
  return typeof value === "string" && (FIRST_FREE_ELIGIBLE_PRODUCTS as readonly string[]).includes(value);
}

export interface FirstFreeStatus {
  used: boolean;
  usedAt: string | null;
  orderId: string | null;
  productType: string | null;
}

export const FIRST_FREE_UNKNOWN: FirstFreeStatus = {
  used: false,
  usedAt: null,
  orderId: null,
  productType: null,
};

/** Maps a database error code to a localized message key. */
export function firstFreeErrorKey(message: string | undefined | null): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("already_used")) return "ff_err_already_used";
  if (m.includes("product_not_eligible")) return "ff_err_product";
  if (m.includes("not_authenticated") || m.includes("unauthorized")) return "ff_err_auth";
  if (m.includes("reason_required")) return "ff_err_reason";
  if (m.includes("forbidden")) return "ff_err_forbidden";
  return "ff_err_generic";
}

/**
 * Keeps the "intended action" across a sign-in / sign-up detour.
 * Only same-origin paths are ever accepted.
 */
export function sanitizeRedirect(value: unknown, fallback = "/free-greeting"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
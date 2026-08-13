// One card creation keeps the same key across reloads, so its generation
// attempts are counted per card and not per page visit.
const STORAGE_KEY = "pj.card-session";

export function currentCardSession(): string {
  if (typeof window === "undefined") return "";
  const existing = window.sessionStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const key = crypto.randomUUID();
  window.sessionStorage.setItem(STORAGE_KEY, key);
  return key;
}

/** Starts a completely new card creation with a fresh attempt budget. */
export function resetCardSession(): string {
  if (typeof window === "undefined") return "";
  const key = crypto.randomUUID();
  window.sessionStorage.setItem(STORAGE_KEY, key);
  return key;
}

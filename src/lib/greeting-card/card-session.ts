// One card creation keeps the same key across reloads, so its generation
// attempts are counted per card and not per page visit.
const STORAGE_KEY = "pj.card-session";

/**
 * True only when the browser itself loaded the card editor (first load or a
 * refresh). Arriving from Studio, the cabinet or any in-app link is a new card,
 * so an active session is never silently restored there.
 */
export function isEditorPageReload(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const bootUrl = nav?.name ?? window.location.href;
    return new URL(bootUrl, window.location.origin).pathname.startsWith("/create-card");
  } catch {
    return true;
  }
}

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

/**
 * Continuing an unfinished card from the personal cabinet makes that card's own
 * package the active one, so a refresh keeps working on the same card.
 */
export function adoptCardSession(key: string): string {
  if (typeof window === "undefined" || !key) return key;
  window.sessionStorage.setItem(STORAGE_KEY, key);
  return key;
}


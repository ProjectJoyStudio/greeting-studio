// One card creation keeps the same key across reloads, so its generation
// attempts are counted per card and not per page visit.
const STORAGE_KEY = "pj.card-session";

/**
 * Some mobile browsers (private mode, evicted tabs, blocked storage) throw on
 * every sessionStorage access. Storage must never be able to crash the page, so
 * all reads and writes go through these guarded helpers with an in-memory
 * fallback for the current runtime.
 */
let memoryKey = "";
let storageBroken = false;

function readStore(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    storageBroken = true;
    return null;
  }
}

function writeStore(value: string): void {
  memoryKey = value;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    storageBroken = true;
  }
}

/** True when browser storage cannot persist the session across a reload. */
export function isCardSessionStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (storageBroken) return false;
  try {
    const probe = `${STORAGE_KEY}.probe`;
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return true;
  } catch {
    storageBroken = true;
    return false;
  }
}

/** crypto.randomUUID is missing on older / non-secure-context mobile browsers. */
function safeUuid(): string {
  try {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
    if (c && typeof c.getRandomValues === "function") {
      const b = c.getRandomValues(new Uint8Array(16));
      return Array.from(b, (n) => n.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through to the non-crypto fallback below */
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

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
  const existing = readStore() ?? memoryKey;
  if (existing) return existing;
  const key = safeUuid();
  writeStore(key);
  return key;
}

/** Starts a completely new card creation with a fresh attempt budget. */
export function resetCardSession(): string {
  if (typeof window === "undefined") return "";
  const key = safeUuid();
  writeStore(key);
  return key;
}

/**
 * Continuing an unfinished card from the personal cabinet makes that card's own
 * package the active one, so a refresh keeps working on the same card.
 */
export function adoptCardSession(key: string): string {
  if (typeof window === "undefined" || !key) return key;
  writeStore(key);
  return key;
}

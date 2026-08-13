// One browser tab is the writer of a personal video greeting draft. The
// identifier is kept for the lifetime of the tab, so a simple page refresh
// reclaims the same writing session immediately instead of waiting for the
// previous one to expire.
const KEY = "joy.pvg.edit-session";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random());
}

export function getPvgEditSessionId(): string {
  if (typeof window === "undefined") return newId();
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored) return stored;
    const fresh = newId();
    window.sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return newId();
  }
}

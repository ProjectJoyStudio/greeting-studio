// One browser is the writer of a personal video greeting draft. The identifier
// is kept for the whole browser, not for a single tab, so a refresh, a second
// tab or a reopened page continues as the same writer instead of locking the
// person out of their own draft.
const KEY = "joy.pvg.edit-session";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random());
}

export function getPvgEditSessionId(): string {
  if (typeof window === "undefined") return newId();
  try {
    const stored = window.localStorage.getItem(KEY) ?? window.sessionStorage.getItem(KEY);
    if (stored) return stored;
    const fresh = newId();
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return newId();
  }
}

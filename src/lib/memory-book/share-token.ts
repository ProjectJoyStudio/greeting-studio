/** 32 cryptographically random bytes, base64url — 43 characters. */
export function newShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Only well-formed tokens are ever looked up; a UUID (book ID) never matches. */
export function isValidShareToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

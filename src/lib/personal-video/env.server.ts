// Every environment-specific value of the Personal Video Greeting section.
// Nothing is hardcoded, so the section can be pointed at other storage or
// another engine without touching the page logic.

export function pvgPhotoBucket(): string {
  return process.env["PVG_PHOTO_BUCKET"] || "pvg-photos";
}

export function pvgSceneBucket(): string {
  return process.env["PVG_SCENE_BUCKET"] || "pvg-scenes";
}

/** Longest a signed link stays valid, in seconds. */
export function pvgSignedUrlTtl(): number {
  const parsed = Number(process.env["PVG_SIGNED_URL_TTL"] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 12;
}

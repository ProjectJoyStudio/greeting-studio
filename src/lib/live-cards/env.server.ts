// Every environment-specific value of the Live Greeting Cards section lives
// here. Nothing is hardcoded, so the same source code runs unchanged against a
// different backend, different storage and different provider keys.

export function liveCardsImageBucket(): string {
  return process.env.LIVE_CARDS_IMAGE_BUCKET || "live-greeting-cards";
}

export function liveCardsVideoBucket(): string {
  return process.env.LIVE_CARDS_VIDEO_BUCKET || "live-greeting-card-videos";
}

/**
 * Optional ordered allow-list of animation engines, e.g. "wan_i2v".
 * When unset, the routing layer uses its own ranking.
 */
export function configuredVideoGenerators(): string[] {
  return (process.env.LIVE_CARDS_VIDEO_GENERATORS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Animation lengths offered by the first engine, configurable per environment. */
export function liveCardsDurations(): number[] {
  const raw = (process.env.LIVE_CARDS_DURATIONS || "5,10").split(",");
  const parsed = raw.map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
  return parsed.length ? parsed : [5, 10];
}

/** Output resolution handed to the animation engine. */
export function liveCardsVideoResolution(): string {
  return process.env.LIVE_CARDS_VIDEO_RESOLUTION || "1080p";
}

/**
 * Optional ordered allow-list of image engines, e.g. "flux_ultra,flux_pro".
 * When unset, the routing layer uses its own ranking.
 */
export function configuredImageGenerators(): string[] {
  return (process.env.LIVE_CARDS_IMAGE_GENERATORS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Engines that are temporarily switched off without a code change. */
export function disabledGenerators(): string[] {
  return (process.env.LIVE_CARDS_DISABLED_GENERATORS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Selection strategy of the routing layer. */
export function routingStrategy(): "quality" | "cost" | "speed" | "configured" {
  const value = (process.env.LIVE_CARDS_ROUTING_STRATEGY || "quality").trim();
  return value === "cost" || value === "speed" || value === "configured" ? value : "quality";
}
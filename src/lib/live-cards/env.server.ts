// Every environment-specific value of the Live Greeting Cards section lives
// here. Nothing is hardcoded, so the same source code runs unchanged against a
// different backend, different storage and different provider keys.

export function liveCardsImageBucket(): string {
  return process.env.LIVE_CARDS_IMAGE_BUCKET || "live-greeting-cards";
}

export function liveCardsVideoBucket(): string {
  return process.env.LIVE_CARDS_VIDEO_BUCKET || "live-greeting-cards";
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
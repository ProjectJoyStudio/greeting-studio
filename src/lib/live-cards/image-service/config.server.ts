// Configuration of the Live Cards image service. It is deliberately separate
// from every other image configuration in the project, so the Live Cards
// service can be tuned, throttled or switched off without touching the
// greeting-card generator.

function num(value: string | undefined, fallback: number): number {
  const parsed = Number((value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ---------------------------------------------------------------------------
// Live Cards image generator — current setting
//
//   Primary generator ....... low-cost engine (~$0.01 per picture)
//   Backup generator ........ DISABLED (kept in the code for later use)
//   Automatic fallback ...... OFF
//
// Nothing switches to the higher-cost engine automatically: not on slowness,
// not on a timeout, not on a failed attempt, not on temporary unavailability.
// To turn the backup back on later, BOTH switches must be set explicitly:
//   LIVE_CARDS_IMAGE_BACKUP_ENABLED=1  and  LIVE_CARDS_IMAGE_AUTO_FALLBACK=1
// ---------------------------------------------------------------------------

function flagOn(value: string | undefined): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

/** Low-cost primary engine of the Live Cards section. */
export function primaryModel(): string {
  return process.env.LIVE_CARDS_IMAGE_PRIMARY_MODEL || "black-forest-labs/flux-schnell";
}

/** Indicative price of one primary picture, in US dollars. */
export function primaryCostUsd(): number {
  return num(process.env.LIVE_CARDS_IMAGE_PRIMARY_COST_USD, 0.01);
}

/** How many Live Cards pictures may render at the same time. */
export function maxConcurrency(): number {
  return num(process.env.LIVE_CARDS_IMAGE_CONCURRENCY, 3);
}

/** How many requests may wait in the Live Cards queue before it refuses more. */
export function maxQueueLength(): number {
  return num(process.env.LIVE_CARDS_IMAGE_QUEUE_LIMIT, 40);
}

/** Longest a request may wait for a free slot, in milliseconds. */
export function queueWaitMs(): number {
  return num(process.env.LIVE_CARDS_IMAGE_QUEUE_WAIT_MS, 120_000);
}

/** Longest one render may take before the service gives up, in milliseconds. */
export function renderTimeoutMs(): number {
  return num(process.env.LIVE_CARDS_IMAGE_TIMEOUT_MS, 180_000);
}

/** Poll interval while the primary engine is working, in milliseconds. */
export function pollIntervalMs(): number {
  return num(process.env.LIVE_CARDS_IMAGE_POLL_MS, 1200);
}

/**
 * The higher-cost backup engine. Off by default — it must be switched on
 * deliberately, it never enables itself.
 */
export function backupEnabled(): boolean {
  return flagOn(process.env.LIVE_CARDS_IMAGE_BACKUP_ENABLED);
}

/**
 * Automatic hand-over to the backup engine. Off by default: a failed request
 * simply stops and the person may try again themselves.
 */
export function automaticFallbackEnabled(): boolean {
  return flagOn(process.env.LIVE_CARDS_IMAGE_AUTO_FALLBACK);
}

/** True only when the backup engine may ever start on its own. */
export function backupHandoverAllowed(): boolean {
  return backupEnabled() && automaticFallbackEnabled();
}

/** Maximum number of starting pictures one project may generate. */
export function maxAttemptsPerProject(): number {
  return num(process.env.LIVE_CARDS_IMAGE_MAX_ATTEMPTS, 3);
}
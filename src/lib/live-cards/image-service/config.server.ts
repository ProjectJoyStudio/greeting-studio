// Configuration of the Live Cards image service. It is deliberately separate
// from every other image configuration in the project, so the Live Cards
// service can be tuned, throttled or switched off without touching the
// greeting-card generator.

function num(value: string | undefined, fallback: number): number {
  const parsed = Number((value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Low-cost primary engine of the Live Cards section. */
export function primaryModel(): string {
  return process.env.LIVE_CARDS_IMAGE_PRIMARY_MODEL || "black-forest-labs/flux-schnell";
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

/** Turns the backup engine off entirely when set to "0" or "false". */
export function backupEnabled(): boolean {
  const raw = (process.env.LIVE_CARDS_IMAGE_BACKUP_ENABLED || "").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "off");
}

/** Maximum number of starting pictures one project may generate. */
export function maxAttemptsPerProject(): number {
  return num(process.env.LIVE_CARDS_IMAGE_MAX_ATTEMPTS, 3);
}
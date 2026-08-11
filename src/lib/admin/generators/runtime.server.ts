// ---------------------------------------------------------------------------
// The routing layer used by the running product.
//
// It answers one question for every NEW generation request: which engines may
// serve this function, and in which order. Jobs that are already running are
// never touched by a change here.
// ---------------------------------------------------------------------------

import { findFunction } from "./registry";
import { defaultGeneratorSettings, type GeneratorControlSettings } from "./settings";

let cache: { at: number; value: GeneratorControlSettings } | null = null;
const TTL_MS = 15_000;

/** Current settings, cached briefly so hot paths stay fast. */
export async function generatorSettings(): Promise<GeneratorControlSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const { readGeneratorSettings } = await import("./settings.server");
  const value = await readGeneratorSettings();
  cache = { at: Date.now(), value };
  return value;
}

/** Drops the cache so an administrator change applies to the very next job. */
export function invalidateGeneratorSettings(): void {
  cache = null;
}

// --- round-robin cursor for load distribution ------------------------------

const cursors = new Map<string, number>();

function rotate(functionId: string, keys: string[]): string[] {
  if (keys.length < 2) return keys;
  const next = ((cursors.get(functionId) ?? 0) + 1) % keys.length;
  cursors.set(functionId, next);
  return [...keys.slice(next), ...keys.slice(0, next)];
}

/**
 * Ordered engine keys for ONE new job of one function.
 *
 *  • disabled engines are skipped;
 *  • the primary engine leads;
 *  • the backup follows only when automatic failover is on;
 *  • with load distribution on, different jobs start on different engines.
 *
 * One job is always served by one engine at a time — the list is walked in
 * order and only after a genuine technical failure of the previous engine.
 */
export async function generatorOrder(functionId: string, available: string[]): Promise<string[]> {
  const fn = findFunction(functionId);
  const settings = await generatorSettings().catch(() => defaultGeneratorSettings());
  const config = settings.functions[functionId];
  if (!fn || !config) return available;

  const enabled = available.filter((key) => settings.generators[key]?.enabled !== false);
  if (!enabled.length) return [];

  const primary = config.primary && enabled.includes(config.primary) ? config.primary : enabled[0]!;
  const backup =
    config.autoFailover && config.backup && enabled.includes(config.backup) ? config.backup : null;

  if (config.loadDistribution) {
    const pool = rotate(functionId, enabled);
    return [...new Set([...pool, ...(backup ? [backup] : [])])];
  }
  return [...new Set([primary, ...(backup ? [backup] : [])])];
}

/** The engine an administrator chose as primary, when it is switched on. */
export async function primaryGenerator(
  functionId: string,
  available: string[],
): Promise<string | null> {
  const order = await generatorOrder(functionId, available);
  return order[0] ?? null;
}

// --- parallel job limits ---------------------------------------------------

type Slot = { active: number; waiting: Array<() => void> };
const slots = new Map<string, Slot>();

function slotOf(key: string): Slot {
  const existing = slots.get(key);
  if (existing) return existing;
  const fresh: Slot = { active: 0, waiting: [] };
  slots.set(key, fresh);
  return fresh;
}

/** Active jobs an engine is currently handling on this server. */
export function activeJobs(key: string): number {
  return slots.get(key)?.active ?? 0;
}

/**
 * Runs one request under the engine's parallel-job limit. "Auto" means the
 * provider's own pacing is used and nothing is held back here. With a manual
 * limit a new job waits in the queue instead of being lost.
 */
export async function withGeneratorSlot<T>(key: string, run: () => Promise<T>): Promise<T> {
  const settings = await generatorSettings().catch(() => defaultGeneratorSettings());
  const limit = settings.generators[key]?.parallel;
  if (limit === undefined || limit === "auto") return run();

  const slot = slotOf(key);
  if (slot.active >= limit) {
    await new Promise<void>((resolve) => slot.waiting.push(resolve));
  }
  slot.active += 1;
  try {
    return await run();
  } finally {
    slot.active -= 1;
    slot.waiting.shift()?.();
  }
}

/** True when the engine has room for one more job right now. */
export async function hasCapacity(key: string): Promise<boolean> {
  const settings = await generatorSettings().catch(() => defaultGeneratorSettings());
  const limit = settings.generators[key]?.parallel;
  if (limit === undefined || limit === "auto") return true;
  return activeJobs(key) < limit;
}
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
// Kept short so an administrator change reaches every server instance quickly.
const TTL_MS = 3_000;

/** Current settings, cached briefly so hot paths stay fast. */
export async function generatorSettings(): Promise<GeneratorControlSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const { readGeneratorSettingsSafe } = await import("./settings.server");
  const value = await readGeneratorSettingsSafe();
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
 *  • only the primary engine is used;
 *  • the backup follows only when it is selected AND automatic failover is on;
 *  • with load distribution on, the enabled engines of the group share the load.
 *
 * The saved configuration is the source of truth: an engine that is not part
 * of the active routing configuration is NEVER used implicitly. When the
 * configured engine cannot serve the job, the list is empty and the caller
 * must report a generation failure instead of trying something else.
 */
export async function generatorOrder(functionId: string, available: string[]): Promise<string[]> {
  const fn = findFunction(functionId);
  const settings = await generatorSettings().catch(() => defaultGeneratorSettings());
  if (!fn) return [];

  const config = settings.functions[functionId] ?? {
    primary: fn.defaultPrimary,
    backup: fn.defaultBackup,
    autoFailover: fn.defaultAutoFailover,
    loadDistribution: false,
  };

  const usable = (key: string | null): key is string =>
    Boolean(key) && available.includes(key!) && settings.generators[key!]?.enabled !== false;

  const backup = config.autoFailover && usable(config.backup) ? config.backup : null;

  if (config.loadDistribution) {
    const pool = fn.candidates.map((c) => c.key).filter((key) => usable(key));
    if (!pool.length) return [];
    return [...new Set([...rotate(functionId, pool), ...(backup ? [backup] : [])])];
  }

  const primary = usable(config.primary) ? config.primary : null;
  return [...new Set([...(primary ? [primary] : []), ...(backup ? [backup] : [])])];
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

// Server-only: the platform-wide storage operating mode.
//
// normal    — R2 PRIMARY serves reads and writes, B2 is the independent BACKUP.
// emergency — a super-administrator switched reads of VERIFIED backup copies to B2.
//             Writes to PRIMARY, deletions and backup copying are paused; no
//             workflow writes to B2 instead (not safely reconcilable yet).
// recovery  — still reading from B2 while R2 is being re-verified/re-filled;
//             returning to normal is a separate manual approval.
// Nothing here switches automatically on a failed health check.

export type StorageMode = "normal" | "emergency" | "recovery";
export interface PlatformState { scope: string; mode: StorageMode; readProvider: string; version: number; changedAt: string; changedBy: string | null; reason: string | null; operationId: string | null }

async function db() { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as unknown as { from: (t: string) => any }; }

const cache = new Map<string, { at: number; state: PlatformState }>();
const CACHE_MS = 5000;

export function mapState(r: Record<string, any>): PlatformState {
  return { scope: r.scope, mode: r.mode, readProvider: r.read_provider, version: r.version, changedAt: r.changed_at, changedBy: r.changed_by ?? null, reason: r.reason ?? null, operationId: r.operation_id ?? null };
}

export async function readPlatformState(scope = "global", fresh = false): Promise<PlatformState> {
  const hit = cache.get(scope);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.state;
  const { data, error } = await (await db()).from("storage_platform_state").select("*").eq("scope", scope).maybeSingle();
  // Failing closed would stop every upload on a database hiccup; failing open
  // here is safe because a stale "normal" only reaches R2 as before.
  if (error) { if (hit) return hit.state; throw new Error("storage_state_unavailable"); }
  const state = data ? mapState(data) : { scope, mode: "normal" as const, readProvider: "r2", version: 0, changedAt: new Date(0).toISOString(), changedBy: null, reason: null, operationId: null };
  cache.set(scope, { at: Date.now(), state });
  return state;
}
export function forgetPlatformState(scope = "global") { cache.delete(scope); }

/** True while PRIMARY must not receive writes or deletions. */
export function primaryWritesBlocked(mode: StorageMode): boolean { return mode !== "normal"; }

/**
 * Atomic, version-fenced mode change. Concurrent admins: exactly one wins,
 * the other gets "state_changed" and must re-read.
 */
export async function transitionPlatformState(scope: string, expected: { version: number; mode: StorageMode }, next: { mode: StorageMode; readProvider: string; actor: string; reason: string; operationId: string | null }): Promise<PlatformState> {
  const { data, error } = await (await db()).from("storage_platform_state").update({
    mode: next.mode, read_provider: next.readProvider, version: expected.version + 1, changed_at: new Date().toISOString(), changed_by: next.actor, reason: next.reason.slice(0, 500), operation_id: next.operationId,
  }).eq("scope", scope).eq("version", expected.version).eq("mode", expected.mode).select("*").maybeSingle();
  if (error) throw new Error("state_update_failed");
  if (!data) throw new Error("state_changed");
  forgetPlatformState(scope);
  return mapState(data);
}

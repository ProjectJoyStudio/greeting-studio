// Server-only core of the Storage Admin. Every function takes an explicit
// scope: "global" is the real platform; "test:<uuid>" is an isolated scope
// whose recovery is limited to an exact key prefix (used for disposable tests).
import { providerById, knownProviders, storageFor } from "./registry.server";
import { readPlatformState, transitionPlatformState, type PlatformState } from "./platform-state.server";
import { transferObject, deleteExactObjectVersions, type TransferState } from "./transfer.server";
import { writePlacement } from "./backup.server";
import type { StorageAdapter } from "./types";
import { classifyKey, recoveryReadiness, EMERGENCY_PHRASE, RETURN_PHRASE, HEALTH_FRESH_MS } from "./storage-admin-policy";

type Row = Record<string, any>;
async function db() { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as unknown as { from: (t: string) => any; rpc: (f: string, a?: Row) => Promise<{ data: any; error: any }> }; }
const nowIso = () => new Date().toISOString();

export async function audit(actor: string, action: string, target: string | null, previous: unknown, next: unknown) {
  await (await db()).from("admin_audit_log").insert({ actor_user_id: actor, action: `storage.${action}`, entity_type: "storage", entity_id: target, previous_data: previous ?? null, new_data: next ?? null });
}

function need(id: string): StorageAdapter {
  const a = providerById(id);
  if (!a) throw new Error("unknown_or_unconfigured_provider");
  return a;
}

/* ---------------- Health ---------------- */
export async function checkProviderHealth(providerId: string, actor: string | null, scope = "global") {
  const a = need(providerId);
  const key = `system/health-checks/${a.id}/${crypto.randomUUID()}.txt`;
  const body = `project-joy-health ${nowIso()}`;
  const started = Date.now();
  let write_ok = false, read_ok = false, delete_ok = false, error: string | null = null;
  try {
    write_ok = await a.put(key, body, "text/plain");
    if (!write_ok) throw new Error("write_failed");
    const bytes = await a.getBytes(key);
    read_ok = !!bytes && new TextDecoder().decode(bytes) === body;
    if (!read_ok) throw new Error("read_mismatch");
    await deleteExactObjectVersions(a, key);
    delete_ok = true;
  } catch (e) { error = (e instanceof Error ? e.message : "health_failed").slice(0, 200); }
  const row = { scope, provider: a.id, ok: write_ok && read_ok && delete_ok, write_ok, read_ok, delete_ok, latency_ms: Date.now() - started, error, actor_user_id: actor };
  await (await db()).from("storage_provider_health").insert(row);
  return row;
}
export async function latestHealth(scope = "global") {
  const out: Row = {};
  for (const a of knownProviders()) {
    const { data } = await (await db()).from("storage_provider_health").select("*").eq("scope", scope).eq("provider", a.id).order("checked_at", { ascending: false }).limit(1).maybeSingle();
    const { data: lastOk } = await (await db()).from("storage_provider_health").select("checked_at").eq("scope", scope).eq("provider", a.id).eq("ok", true).order("checked_at", { ascending: false }).limit(1).maybeSingle();
    out[a.id] = { configured: a.isReady(), area: a.describe().split(":")[1] ?? null, last: data ?? null, lastOkAt: lastOk?.checked_at ?? null };
  }
  return out;
}

/* ---------------- Placement aggregates (database records, not physical) ---------------- */
async function allPlacements(prefix?: string | null): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; from < 200000; from += 1000) {
    let q = (await db()).from("storage_placements").select("object_key,provider,role,status,size_bytes,checksum,verified_at,backup_retry_count,retry_after,last_error,updated_at").order("id").range(from, from + 999);
    if (prefix) q = q.like("object_key", `${prefix}%`);
    const { data, error } = await q;
    if (error) throw new Error("placements_read_failed");
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function placementSummary() {
  const rows = await allPlacements();
  const byKey = new Map<string, Row>();
  for (const r of rows) { const e = byKey.get(r.object_key) ?? { key: r.object_key }; e[r.provider] = r; byKey.set(r.object_key, e); }
  const providers: Row = {};
  for (const r of rows) {
    const p = providers[r.provider] ??= { present: 0, presentBytes: 0, verified: 0, deleted: 0, pending: 0, copying: 0, failed: 0 };
    if (r.status === "present") { p.present++; p.presentBytes += Number(r.size_bytes ?? 0); if (r.verified_at && String(r.checksum ?? "").startsWith("sha256:")) p.verified++; }
    else if (p[r.status] !== undefined) p[r.status]++;
  }
  const areas: Row = {};
  let needed = 0, covered = 0;
  const unprotected: string[] = [];
  for (const e of byKey.values()) {
    const area = classifyKey(e.key);
    const a = areas[area.area] ??= { label: area.area, kind: area.kind, objects: 0, bytes: 0, protected: 0, unprotected: 0 };
    const r2 = e.r2, b2 = e.b2;
    if (r2?.status !== "present" && b2?.status !== "present") continue;
    a.objects++; a.bytes += Number((r2 ?? b2).size_bytes ?? 0);
    const ok = b2?.status === "present" && b2.verified_at && String(b2.checksum ?? "").startsWith("sha256:");
    if (r2?.status === "present") { needed++; if (ok) covered++; else if (unprotected.length < 50) unprotected.push(e.key); }
    if (ok) a.protected++; else a.unprotected++;
  }
  const backupQueue = rows.filter(r => r.role === "backup" && ["pending", "copying", "failed"].includes(r.status));
  const nextRetry = backupQueue.map(r => r.retry_after).filter(Boolean).sort()[0] ?? null;
  return { providers, areas: Object.values(areas), coverage: { needed, covered, unprotectedSample: unprotected }, backupQueue: { pending: backupQueue.filter(r => r.status === "pending").length, copying: backupQueue.filter(r => r.status === "copying").length, failed: backupQueue.filter(r => r.status === "failed").length, exhausted: backupQueue.filter(r => Number(r.backup_retry_count) >= 5).length, nextRetry } };
}

export async function legacyBucketUsage() {
  const { data, error } = await (await db()).rpc("storage_admin_bucket_usage");
  if (error) return null;
  return (data ?? []).map((r: Row) => ({ bucket: r.bucket_id, objects: Number(r.objects), bytes: Number(r.bytes) }));
}

export async function cleanupSummary() {
  const { data } = await (await db()).from("memory_book_storage_operations").select("book_id,stage,activated_at,cleanup_total,cleanup_deleted_primary,cleanup_deleted_backup,cleanup_remaining,cleanup_last_success_at,cleanup_completed_at,cleanup_next_at,last_error").not("activated_at", "is", null);
  const rows = data ?? [];
  const count = (s: string) => rows.filter((r: Row) => r.stage === s).length;
  return { pending: count("cleanup_pending"), running: count("cleanup_running"), completed: count("cleanup_completed"), failed: count("cleanup_failed"), deletedPrimary: rows.reduce((n: number, r: Row) => n + Number(r.cleanup_deleted_primary ?? 0), 0), deletedBackup: rows.reduce((n: number, r: Row) => n + Number(r.cleanup_deleted_backup ?? 0), 0), remaining: rows.reduce((n: number, r: Row) => n + Number(r.cleanup_remaining ?? 0), 0), lastRunAt: rows.map((r: Row) => r.cleanup_last_success_at).filter(Boolean).sort().pop() ?? null, books: rows };
}

/* ---------------- Inventory (physical, admin-started, bounded, resumable) ---------------- */
export async function advanceInventory(providerId: string, actor: string, budgetMs = 20000) {
  const a = need(providerId);
  if (!a.listPage) throw new Error("listing_unsupported");
  const client = await db();
  const kind = `inventory:${a.id}`;
  let { data: op } = await client.from("storage_admin_operations").select("*").eq("scope", "global").eq("kind", kind).in("status", ["pending", "running"]).maybeSingle();
  if (!op) {
    const ins = await client.from("storage_admin_operations").insert({ scope: "global", kind, actor_user_id: actor, source_provider: a.id, result: { byArea: {} } }).select("*").single();
    if (ins.error) throw new Error("inventory_busy"); op = ins.data;
    await audit(actor, "inventory_start", a.id, null, { operation: op.id });
  }
  const token = crypto.randomUUID();
  const { data: locked } = await client.from("storage_admin_operations").update({ lease_token: token, lease_until: new Date(Date.now() + 60000).toISOString() }).eq("id", op.id).or(`lease_until.is.null,lease_until.lt.${nowIso()}`).select("*").maybeSingle();
  if (!locked) return { pending: true, busy: true, operation: op.id };
  const byArea: Row = locked.result?.byArea ?? {};
  let cursor: string | null = locked.cursor, objects = Number(locked.total), bytes = Number(locked.bytes);
  const started = Date.now();
  try {
    do {
      const page = await a.listPage("", cursor);
      for (const o of page.objects) { const area = classifyKey(o.key).area; const e = byArea[area] ??= { objects: 0, bytes: 0 }; e.objects++; e.bytes += o.sizeBytes; objects++; bytes += o.sizeBytes; }
      cursor = page.next;
      await client.from("storage_admin_operations").update({ cursor, total: objects, bytes, result: { byArea }, updated_at: nowIso() }).eq("id", op.id).eq("lease_token", token);
    } while (cursor && Date.now() - started < budgetMs);
    if (cursor) { await client.from("storage_admin_operations").update({ lease_token: null, lease_until: null }).eq("id", op.id).eq("lease_token", token); return { pending: true, operation: op.id, objects, bytes }; }
    await client.from("storage_inventory_snapshots").insert({ operation_id: op.id, provider: a.id, objects, bytes, by_area: byArea, complete: true });
    await client.from("storage_admin_operations").update({ status: "completed", finished_at: nowIso(), lease_token: null, lease_until: null }).eq("id", op.id).eq("lease_token", token);
    await audit(actor, "inventory_completed", a.id, null, { operation: op.id, objects, bytes });
    return { pending: false, operation: op.id, objects, bytes };
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 200) : "inventory_failed";
    await client.from("storage_admin_operations").update({ error: message, lease_token: null, lease_until: null }).eq("id", op.id).eq("lease_token", token);
    throw e;
  }
}
export async function latestInventory() {
  const out: Row = {};
  for (const a of knownProviders()) {
    const { data } = await (await db()).from("storage_inventory_snapshots").select("*").eq("provider", a.id).order("taken_at", { ascending: false }).limit(1).maybeSingle();
    out[a.id] = data ?? null;
  }
  return out;
}

/* ---------------- Emergency ---------------- */
export async function emergencyPreflight(scope = "global", prefix: string | null = null) {
  const health = { r2: await checkProviderHealth("r2", null, scope), b2: await checkProviderHealth("b2", null, scope) };
  const rows = await allPlacements(prefix);
  const keys = new Map<string, Row>();
  for (const r of rows) { const e = keys.get(r.object_key) ?? {}; e[r.provider] = r; keys.set(r.object_key, e); }
  let required = 0, verified = 0, systemRequired = 0, systemVerified = 0;
  const missing: string[] = [];
  for (const [key, e] of keys) {
    if (e.r2?.status !== "present") continue;
    required++;
    const ok = e.b2?.status === "present" && e.b2.verified_at && String(e.b2.checksum ?? "").startsWith("sha256:");
    if (ok) verified++; else if (missing.length < 50) missing.push(key);
    if (key.startsWith("system/")) { systemRequired++; if (ok) systemVerified++; }
  }
  return { health, required, verified, unverified: required - verified, missingSample: missing, systemRequired, systemVerified, canActivate: health.b2.ok };
}

export async function activateEmergency(input: { scope?: string; actor: string; reason: string; phrase: string; expectedVersion: number; prefix?: string | null }) {
  const scope = input.scope ?? "global";
  if (input.phrase !== EMERGENCY_PHRASE) throw new Error("confirmation_phrase_mismatch");
  if (!input.reason.trim()) throw new Error("reason_required");
  const state = await readPlatformState(scope, true);
  if (state.mode !== "normal") throw new Error("not_in_normal_mode");
  if (state.version !== input.expectedVersion) throw new Error("state_changed");
  const preflight = await emergencyPreflight(scope, input.prefix ?? null);
  if (!preflight.health.b2.ok) throw new Error("backup_unavailable");
  const { data: op } = await (await db()).from("storage_admin_operations").insert({ scope, kind: "emergency_activate", status: "completed", actor_user_id: input.actor, source_provider: "r2", destination_provider: "b2", total: preflight.required, verified: preflight.verified, failed: preflight.unverified, result: preflight, finished_at: nowIso() }).select("id").single();
  const next = await transitionPlatformState(scope, { version: state.version, mode: "normal" }, { mode: "emergency", readProvider: "b2", actor: input.actor, reason: input.reason, operationId: op?.id ?? null });
  await audit(input.actor, "emergency_activated", scope, state, { state: next, operation: op?.id, verification: { required: preflight.required, verified: preflight.verified, r2: preflight.health.r2.ok, b2: preflight.health.b2.ok } });
  return { state: next, preflight, operation: op?.id };
}

/* ---------------- Recovery ---------------- */
export async function startRecovery(input: { scope?: string; actor: string; prefix?: string | null }) {
  const scope = input.scope ?? "global";
  const state = await readPlatformState(scope, true);
  if (state.mode !== "emergency" && state.mode !== "recovery") throw new Error("not_in_emergency");
  const r2 = await checkProviderHealth("r2", input.actor, scope);
  if (!r2.ok) throw new Error("primary_unavailable");
  const client = await db();
  const ins = await client.from("storage_admin_operations").insert({ scope, kind: "recovery", actor_user_id: input.actor, source_provider: "b2", destination_provider: "r2", key_prefix: input.prefix ?? null }).select("*").single();
  if (ins.error) throw new Error("recovery_already_running");
  const op = ins.data;
  // Inventory: every key with a VERIFIED reserve copy is a required object.
  const rows = await allPlacements(input.prefix ?? null);
  const items = rows.filter(r => r.provider === "b2" && r.status === "present" && r.verified_at && String(r.checksum ?? "").startsWith("sha256:")).map(r => ({ operation_id: op.id, object_key: r.object_key, expected_checksum: r.checksum, expected_size: r.size_bytes }));
  for (let i = 0; i < items.length; i += 500) { const { error } = await client.from("storage_recovery_items").insert(items.slice(i, i + 500)); if (error) throw new Error("recovery_inventory_failed"); }
  await client.from("storage_admin_operations").update({ total: items.length }).eq("id", op.id);
  let next = state;
  if (state.mode === "emergency") next = await transitionPlatformState(scope, { version: state.version, mode: "emergency" }, { mode: "recovery", readProvider: "b2", actor: input.actor, reason: "recovery_started", operationId: op.id });
  await audit(input.actor, "recovery_started", scope, state, { state: next, operation: op.id, items: items.length });
  return { operation: op.id, items: items.length, state: next };
}

export async function advanceRecovery(operationId: string, actor: string | null, options: { budgetMs?: number; maxItems?: number } = {}) {
  const client = await db();
  const started = Date.now(), budgetMs = options.budgetMs ?? 20000, maxItems = options.maxItems ?? 50;
  const token = crypto.randomUUID();
  const { data: op } = await client.from("storage_admin_operations").update({ lease_token: token, lease_until: new Date(Date.now() + 120000).toISOString(), status: "running" }).eq("id", operationId).eq("kind", "recovery").in("status", ["pending", "running"]).or(`lease_until.is.null,lease_until.lt.${nowIso()}`).select("*").maybeSingle();
  if (!op) return { pending: true, busy: true };
  const r2 = need("r2"), b2 = need("b2");
  let processed = 0;
  try {
    const { data: items } = await client.from("storage_recovery_items").select("*").eq("operation_id", operationId).in("state", ["pending", "copying"]).order("object_key").limit(maxItems);
    for (const item of items ?? []) {
      if (Date.now() - started > budgetMs) break;
      processed++;
      const set = async (patch: Row) => { await client.from("storage_recovery_items").update({ ...patch, updated_at: nowIso() }).eq("operation_id", operationId).eq("object_key", item.object_key); };
      try {
        const there = await r2.check(item.object_key);
        if (there.state === "error") throw new Error(`primary_check:${there.detail}`);
        if (there.state === "exists" && !item.transfer_state) {
          const d = await r2.digest(item.object_key);
          if (d.checksum === item.expected_checksum && d.sizeBytes === Number(item.expected_size)) { await set({ state: "verified", destination_checksum: d.checksum, error: null }); await writePlacement(item.object_key, "r2", { role: "primary", status: "present", checksum: d.checksum, sizeBytes: d.sizeBytes, verifiedAt: nowIso(), lastError: null }); continue; }
          // Different content on PRIMARY: never overwrite automatically.
          await set({ state: "conflict", destination_checksum: d.checksum, error: "primary_differs_from_verified_backup" }); continue;
        }
        const source = await b2.digest(item.object_key);
        if (source.checksum !== item.expected_checksum) { await set({ state: "failed", error: "backup_integrity_mismatch" }); continue; }
        await set({ state: "copying", attempts: Number(item.attempts) + 1 });
        const result = await transferObject({ source: b2, destination: r2, sourceKey: item.object_key, destinationKey: item.object_key, state: item.transfer_state as TransferState | null, save: async s => { await set({ transfer_state: s }); } });
        const verify = await r2.digest(item.object_key);
        if (verify.checksum !== item.expected_checksum || verify.sizeBytes !== result.sizeBytes) { await set({ state: "failed", error: "primary_verify_mismatch" }); continue; }
        await writePlacement(item.object_key, "r2", { role: "primary", status: "present", checksum: verify.checksum, sizeBytes: verify.sizeBytes, verifiedAt: nowIso(), lastError: null });
        await set({ state: "verified", destination_checksum: verify.checksum, transfer_state: null, error: null });
        await client.from("storage_admin_operations").update({ bytes: Number(op.bytes) + verify.sizeBytes }).eq("id", operationId);
        op.bytes = Number(op.bytes) + verify.sizeBytes;
      } catch (e) {
        const message = (e instanceof Error ? e.message : "recovery_item_failed").slice(0, 200);
        const attempts = Number(item.attempts) + 1;
        // Temporary provider errors stay pending (bounded); keeps the transfer checkpoint.
        await set({ state: attempts >= 4 ? "failed" : "pending", attempts, error: message });
      }
    }
    return await refreshRecovery(operationId, token, actor);
  } catch (e) {
    await client.from("storage_admin_operations").update({ error: e instanceof Error ? e.message.slice(0, 200) : "recovery_failed", lease_token: null, lease_until: null }).eq("id", operationId).eq("lease_token", token);
    throw e;
  }
}

async function refreshRecovery(operationId: string, token: string, actor: string | null) {
  const client = await db();
  const { data: all } = await client.from("storage_recovery_items").select("state").eq("operation_id", operationId);
  const c = (s: string) => (all ?? []).filter((r: Row) => r.state === s).length;
  const remaining = c("pending") + c("copying");
  const patch: Row = { done: (all ?? []).length - remaining, verified: c("verified"), conflicts: c("conflict"), failed: c("failed"), lease_token: null, lease_until: null, updated_at: nowIso() };
  if (!remaining) { patch.status = "completed"; patch.finished_at = nowIso(); }
  await client.from("storage_admin_operations").update(patch).eq("id", operationId).eq("lease_token", token);
  if (!remaining && actor) await audit(actor, "recovery_scan_completed", operationId, null, patch);
  return { pending: remaining > 0, remaining, ...patch };
}

export async function recoveryReport(scope = "global") {
  const client = await db();
  const { data: op } = await client.from("storage_admin_operations").select("*").eq("scope", scope).eq("kind", "recovery").order("started_at", { ascending: false }).limit(1).maybeSingle();
  const { data: health } = await client.from("storage_provider_health").select("*").eq("scope", scope).eq("provider", "r2").order("checked_at", { ascending: false }).limit(1).maybeSingle();
  const { data: problems } = op ? await client.from("storage_recovery_items").select("object_key,state,error,attempts").eq("operation_id", op.id).in("state", ["conflict", "failed", "pending", "copying"]).limit(100) : { data: [] };
  const state = await readPlatformState(scope, true);
  return { state, operation: op ?? null, problems: problems ?? [], readiness: recoveryReadiness({ mode: state.mode, operation: op, r2Health: health, now: Date.now() }) };
}

/** Explicit per-file decision: replace a conflicting PRIMARY copy with the verified BACKUP copy. */
export async function resolveConflictFromBackup(operationId: string, key: string, actor: string) {
  const client = await db();
  const { data: item } = await client.from("storage_recovery_items").select("*").eq("operation_id", operationId).eq("object_key", key).maybeSingle();
  if (!item || item.state !== "conflict") throw new Error("not_a_conflict");
  const r2 = need("r2"), b2 = need("b2");
  const src = await b2.digest(key);
  if (src.checksum !== item.expected_checksum) throw new Error("backup_integrity_mismatch");
  const before = await r2.digest(key);
  await deleteExactObjectVersions(r2, key);
  await client.from("storage_recovery_items").update({ state: "pending", transfer_state: null, error: null, attempts: 0 }).eq("operation_id", operationId).eq("object_key", key);
  await client.from("storage_admin_operations").update({ status: "running", finished_at: null }).eq("id", operationId);
  await audit(actor, "conflict_resolved_from_backup", key, { primaryChecksum: before.checksum }, { backupChecksum: src.checksum, operation: operationId });
}

export async function returnToPrimary(input: { scope?: string; actor: string; phrase: string; expectedVersion: number }) {
  const scope = input.scope ?? "global";
  if (input.phrase !== RETURN_PHRASE) throw new Error("confirmation_phrase_mismatch");
  await checkProviderHealth("r2", input.actor, scope);
  const report = await recoveryReport(scope);
  if (!report.readiness.ready) throw new Error(`not_ready:${report.readiness.blockers.join(",")}`);
  if (report.state.version !== input.expectedVersion) throw new Error("state_changed");
  const next = await transitionPlatformState(scope, { version: report.state.version, mode: "recovery" }, { mode: "normal", readProvider: "r2", actor: input.actor, reason: "returned_to_primary", operationId: report.operation?.id ?? null });
  await audit(input.actor, "returned_to_primary", scope, report.state, { state: next, recovery: report.operation?.id });
  return next;
}

/* ---------------- Files & backups (database records, paginated) ---------------- */
export async function listFiles(filter: { query?: string; area?: string; status?: string; page: number; pageSize: number }) {
  const client = await db();
  let q = client.from("storage_placements").select("object_key", { count: "exact" }).eq("provider", "r2");
  if (filter.query) {
    const v = filter.query.trim();
    if (/^[0-9a-f-]{36}$/i.test(v)) q = q.or(`user_id.eq.${v},project_id.eq.${v}`);
    else q = q.like("object_key", `${v.replace(/[%_]/g, "")}%`);
  }
  if (filter.area === "users") q = q.like("object_key", "users/%");
  if (filter.area === "system") q = q.like("object_key", "system/%");
  if (filter.status) q = q.eq("status", filter.status);
  const { data, count, error } = await q.order("object_key").range(filter.page * filter.pageSize, filter.page * filter.pageSize + filter.pageSize - 1);
  if (error) throw new Error("files_read_failed");
  const keys = (data ?? []).map((r: Row) => r.object_key);
  const { data: rows } = keys.length ? await client.from("storage_placements").select("object_key,provider,status,size_bytes,checksum,verified_at,last_error,backup_retry_count,retry_after,updated_at").in("object_key", keys) : { data: [] };
  const files = keys.map((key: string) => {
    const mine = (rows ?? []).filter((r: Row) => r.object_key === key);
    const r2 = mine.find((r: Row) => r.provider === "r2"), b2 = mine.find((r: Row) => r.provider === "b2");
    return { key, ...classifyKey(key), sizeBytes: Number((r2 ?? b2)?.size_bytes ?? 0) || null, r2: r2 ? { status: r2.status, verifiedAt: r2.verified_at, checksum: !!r2.checksum } : null, b2: b2 ? { status: b2.status, verifiedAt: b2.verified_at, checksum: !!b2.checksum, error: b2.last_error, retries: b2.backup_retry_count, retryAfter: b2.retry_after } : null };
  });
  return { files, total: count ?? 0 };
}

/** Independent re-read of one file in every provider against its recorded checksum. */
export async function verifyFile(key: string, actor: string) {
  if (!/^(users|system)\//.test(key) || key.includes("..")) throw new Error("invalid_key");
  const client = await db();
  const { data: rows } = await client.from("storage_placements").select("provider,status,checksum").eq("object_key", key);
  const expected = (rows ?? []).map((r: Row) => r.checksum).find((c: unknown) => typeof c === "string" && c.startsWith("sha256:")) ?? null;
  const out: Row = { key, expected };
  for (const a of knownProviders()) {
    if (!a.isReady()) continue;
    const c = await a.check(key);
    if (c.state !== "exists") { out[a.id] = { state: c.state }; continue; }
    const d = await a.digest(key);
    out[a.id] = { state: "exists", matches: expected ? d.checksum === expected : null, sizeBytes: d.sizeBytes };
  }
  await audit(actor, "file_verified", key, null, out);
  return out;
}

export async function operationsHistory(limit = 50) {
  const client = await db();
  const { data: ops } = await client.from("storage_admin_operations").select("id,scope,kind,status,actor_user_id,total,done,verified,conflicts,failed,bytes,error,started_at,finished_at").eq("scope", "global").order("started_at", { ascending: false }).limit(limit);
  const { data: log } = await client.from("admin_audit_log").select("id,actor_user_id,action,entity_id,created_at,new_data").eq("entity_type", "storage").order("created_at", { ascending: false }).limit(limit);
  return { operations: ops ?? [], audit: log ?? [] };
}

export { storageFor };
export type { PlatformState };

/**
 * Records SHA-256 for backup copies that were verified before checksums were
 * stored. Read-only on storage: both copies are digested independently and a
 * checksum is written only when R2 and B2 agree; disagreement is recorded as
 * an integrity problem and nothing is changed in either provider.
 */
export async function advanceChecksumBackfill(actor: string, budgetMs = 25000) {
  const client = await db();
  const r2 = need("r2"), b2 = need("b2");
  const started = Date.now();
  let done = 0, matched = 0, mismatched = 0, skipped = 0;
  const { data: rows, error } = await client.from("storage_placements").select("object_key").eq("provider", "b2").eq("status", "present").is("checksum", null).not("verified_at", "is", null).is("last_error", null).order("object_key").limit(100);
  if (error) throw new Error("placements_read_failed");
  for (const r of rows ?? []) {
    if (Date.now() - started > budgetMs) break;
    const key = r.object_key as string;
    try {
      const a = await r2.check(key);
      if (a.state !== "exists") { skipped++; await client.from("storage_placements").update({ last_error: a.state === "missing" ? "checksum_backfill_primary_missing" : `checksum_backfill_primary_${a.detail}` }).eq("object_key", key).eq("provider", "b2"); continue; }
      const [d1, d2] = [await r2.digest(key), await b2.digest(key)];
      if (d1.checksum === d2.checksum && d1.sizeBytes === d2.sizeBytes) {
        matched++;
        await writePlacement(key, "b2", { role: "backup", status: "present", checksum: d2.checksum, sizeBytes: d2.sizeBytes, verifiedAt: nowIso(), lastError: null });
        await writePlacement(key, "r2", { role: "primary", status: "present", checksum: d1.checksum, sizeBytes: d1.sizeBytes, verifiedAt: nowIso(), lastError: null });
      } else { mismatched++; await client.from("storage_placements").update({ last_error: "checksum_backfill_mismatch" }).eq("object_key", key).eq("provider", "b2"); }
    } catch (e) { skipped++; }
    done++;
  }
  const { count } = await client.from("storage_placements").select("object_key", { count: "exact", head: true }).eq("provider", "b2").eq("status", "present").is("checksum", null).not("verified_at", "is", null).is("last_error", null);
  await audit(actor, "checksum_backfill_batch", null, null, { done, matched, mismatched, skipped, remaining: count ?? null });
  return { pending: (count ?? 0) > 0 && done > 0, done, matched, mismatched, skipped, remaining: count ?? 0 };
}

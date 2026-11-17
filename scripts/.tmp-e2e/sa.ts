import { r2Adapter as r2, b2Adapter as b2 } from "@/lib/storage/providers.server";
import { guardWrites, providerById } from "@/lib/storage/registry.server";
import { writePlacement } from "@/lib/storage/backup.server";
import { deleteExactObjectVersions } from "@/lib/storage/transfer.server";
import { verifiedBackupReadUrl } from "@/lib/storage/emergency-read.server";
import * as c from "@/lib/storage/storage-admin.server";
import { readPlatformState } from "@/lib/storage/platform-state.server";
import { supabaseAdmin as sb } from "@/integrations/supabase/client.server";
const ACTOR = "ddb9c1b8-8531-4371-a5f0-ef1f10089632";
let fails = 0; const ok = (v: boolean, m: string) => { console.log(v ? "PASS" : "FAIL", m); if (!v) fails++; };
const rej = async (p: Promise<unknown>, m: string) => { try { await p; return "no_error"; } catch (e) { return String((e as Error).message); } };
const id = crypto.randomUUID(), scope = `test:${id}`, prefix = `system/storage-admin-test/${id}/`;
const keys = [0, 1, 2, 3].map(i => `${prefix}f${i}.txt`);
await sb.from("storage_platform_state").insert({ scope });
try {
  for (const [i, k] of keys.entries()) {
    await r2.put(k, `file-${i}-${id}`, "text/plain"); const d = await r2.digest(k);
    await writePlacement(k, "r2", { role: "primary", status: "present", checksum: d.checksum, sizeBytes: d.sizeBytes, verifiedAt: new Date().toISOString(), lastError: null });
    if (i < 3) { await b2.put(k, `file-${i}-${id}`, "text/plain"); await writePlacement(k, "b2", { role: "backup", status: "present", checksum: d.checksum, sizeBytes: d.sizeBytes, verifiedAt: new Date().toISOString(), lastError: null }); }
    else await writePlacement(k, "b2", { role: "backup", status: "failed", lastError: "test_missing" });
  }
  // 1. both healthy
  const h1 = await c.checkProviderHealth("r2", ACTOR, scope), h2 = await c.checkProviderHealth("b2", ACTOR, scope);
  ok(h1.ok && h2.ok, `1 both providers healthy (r2 ${h1.latency_ms} ms, b2 ${h2.latency_ms} ms)`);
  // 2-3. R2 unavailable
  const saved = { put: r2.put, getBytes: r2.getBytes, check: r2.check, digest: r2.digest, beginMultipart: r2.beginMultipart };
  const down = async () => { throw new Error("simulated_r2_outage"); };
  Object.assign(r2, { put: down, getBytes: down, check: down, digest: down });
  const pre = await c.emergencyPreflight(scope, prefix);
  ok(!pre.health.r2.ok && pre.health.b2.ok, "2-3 R2 unavailable, B2 available (no automatic switch)");
  ok((await readPlatformState(scope, true)).mode === "normal", "health failure did not change mode");
  ok(pre.required === 4 && pre.verified === 3 && pre.missingSample.length === 1, `6 preflight reports unverified backup (${pre.verified}/${pre.required})`);
  // 4. activation
  const st = await readPlatformState(scope, true);
  ok((await rej(c.activateEmergency({ scope, actor: ACTOR, reason: "test", phrase: "yes", expectedVersion: st.version, prefix }), "")) === "confirmation_phrase_mismatch", "wrong phrase rejected");
  ok((await rej(c.activateEmergency({ scope, actor: ACTOR, reason: "test", phrase: "ACTIVATE B2 EMERGENCY", expectedVersion: st.version + 5, prefix }), "")) === "state_changed", "stale version rejected");
  const both = await Promise.allSettled([0, 1].map(() => c.activateEmergency({ scope, actor: ACTOR, reason: "disposable test", phrase: "ACTIVATE B2 EMERGENCY", expectedVersion: st.version, prefix })));
  ok(both.filter(r => r.status === "fulfilled").length === 1, `concurrent activation: exactly one wins (${both.map(r => r.status === "rejected" ? (r.reason as Error).message : "ok").join(",")})`);
  ok((await readPlatformState(scope, true)).mode === "emergency", "4 emergency active in isolated scope");
  ok((await readPlatformState("global", true)).mode === "normal", "global platform untouched");
  // 5-6. reads
  const url = await verifiedBackupReadUrl(keys[0], 60);
  ok(!!url && (await (await fetch(url!)).text()) === `file-0-${id}`, "5 verified asset readable from B2");
  ok((await verifiedBackupReadUrl(keys[3], 60)) === null, "6 unverified asset returns unavailable (not served)");
  // 7. writes blocked
  Object.assign(r2, saved);
  const guarded = guardWrites(r2, () => scope);
  ok((await rej(guarded.put(`${prefix}new.txt`, "x", "text/plain"), "")) === "storage_emergency_writes_blocked", "7 PRIMARY write blocked in emergency");
  ok((await rej(guarded.signedWriteUrl(`${prefix}new.txt`, 60, "text/plain"), "")) === "storage_emergency_writes_blocked", "7 signed upload blocked in emergency");
  ok((await r2.check(`${prefix}new.txt`)).state === "missing", "7 nothing written");
  // 9. R2 back; simulate loss + divergence
  await deleteExactObjectVersions(r2, keys[0]); await deleteExactObjectVersions(r2, keys[1]);
  await r2.put(keys[2], "DIFFERENT", "text/plain");
  const rec = await c.startRecovery({ scope, actor: ACTOR, prefix });
  ok(rec.items === 3 && rec.state.mode === "recovery", `10 recovery inventory: ${rec.items} verified backup objects`);
  ok((await rej(c.startRecovery({ scope, actor: ACTOR, prefix }), "")) === "recovery_already_running", "duplicate recovery refused");
  // interruption: network failure on first copy
  let n = 0; r2.beginMultipart = async (k, t) => { if (n++ === 0) throw new Error("simulated_network_interruption"); return saved.beginMultipart(k, t); };
  const s1 = await c.advanceRecovery(rec.operation, ACTOR, { maxItems: 1 });
  ok(s1.pending === true, "12 partial: first batch interrupted, work remains");
  // expired lease from a crashed worker
  await sb.from("storage_admin_operations").update({ lease_token: crypto.randomUUID(), lease_until: new Date(Date.now() + 60000).toISOString() }).eq("id", rec.operation);
  ok((await c.advanceRecovery(rec.operation, ACTOR)).busy === true, "live lease blocks second worker");
  await sb.from("storage_admin_operations").update({ lease_until: new Date(Date.now() - 1000).toISOString() }).eq("id", rec.operation);
  let s: any; for (let i = 0; i < 5; i++) { s = await c.advanceRecovery(rec.operation, ACTOR); if (!s.pending) break; }
  r2.beginMultipart = saved.beginMultipart;
  ok(!s.pending && s.verified === 2 && s.conflicts === 1, `11-13 resumed: ${s.verified} copied+SHA-256 verified, ${s.conflicts} conflict`);
  ok(new TextDecoder().decode((await r2.getBytes(keys[2]))!) === "DIFFERENT", "14 conflicting PRIMARY copy NOT overwritten");
  const st2 = await readPlatformState(scope, true);
  const blocked = await rej(c.returnToPrimary({ scope, actor: ACTOR, phrase: "RETURN TO R2 PRIMARY", expectedVersion: st2.version }), "");
  ok(blocked.startsWith("not_ready") && blocked.includes("conflicts"), `15 return blocked while conflict exists (${blocked})`);
  await c.resolveConflictFromBackup(rec.operation, keys[2], ACTOR);
  s = await c.advanceRecovery(rec.operation, ACTOR);
  ok(!s.pending && s.verified === 3 && s.conflicts === 0, "explicit per-file conflict decision restored verified copy");
  ok((await rej(c.returnToPrimary({ scope, actor: ACTOR, phrase: "back", expectedVersion: st2.version }), "")) === "confirmation_phrase_mismatch", "wrong return phrase rejected");
  const back = await c.returnToPrimary({ scope, actor: ACTOR, phrase: "RETURN TO R2 PRIMARY", expectedVersion: (await readPlatformState(scope, true)).version });
  ok(back.mode === "normal" && back.readProvider === "r2", "15 manual return to R2 PRIMARY");
  ok((await guarded.put(`${prefix}after.txt`, "x", "text/plain")) === true, "17 writes resume after return");
  let b2all = true; for (const k of keys.slice(0, 3)) b2all &&= (await b2.check(k)).state === "exists";
  ok(b2all, "16 B2 copies remain as independent backup");
  const { data: log } = await sb.from("admin_audit_log").select("action").eq("entity_type", "storage").in("entity_id", [scope, rec.operation, keys[2]]);
  ok(["storage.emergency_activated", "storage.recovery_started", "storage.conflict_resolved_from_backup", "storage.returned_to_primary"].every(a => (log ?? []).some((r: any) => r.action === a)), "18 history records the full sequence");
  // extra
  ok((await rej(Promise.resolve().then(() => providerById("c3")!.check("x")), "")).length > 0 && providerById("c3") === null, "unknown provider refused");
  // corrupted backup in a second isolated scope
  const scope2 = `test:${crypto.randomUUID()}`; await sb.from("storage_platform_state").insert({ scope: scope2, mode: "emergency", read_provider: "b2" });
  await deleteExactObjectVersions(r2, keys[1]); await b2.put(keys[1], "CORRUPT", "text/plain");
  const rec2 = await c.startRecovery({ scope: scope2, actor: ACTOR, prefix: keys[1] });
  const s3 = await c.advanceRecovery(rec2.operation, ACTOR);
  ok(s3.failed === 1 && (await r2.check(keys[1])).state === "missing", "corrupted backup detected; nothing copied to PRIMARY");
  await sb.from("storage_platform_state").delete().eq("scope", scope2);
  await sb.from("storage_admin_operations").delete().eq("scope", scope2);
  // B2 unavailable during normal operation: health reports, mode unchanged
  const b2check = b2.put; b2.put = async () => { throw new Error("simulated_b2_outage"); };
  const hb = await c.checkProviderHealth("b2", ACTOR, scope); b2.put = b2check;
  ok(!hb.ok && (await readPlatformState(scope, true)).mode === "normal", "B2 outage in normal mode is reported only");
} finally {
  for (const k of [...keys, `${prefix}new.txt`, `${prefix}after.txt`]) for (const a of [r2, b2]) await deleteExactObjectVersions(a, k).catch(e => console.log("cleanup", k, e.message));
  await sb.from("storage_placements").delete().like("object_key", `${prefix}%`);
  await sb.from("storage_admin_operations").delete().eq("scope", scope);
  await sb.from("storage_provider_health").delete().like("scope", "test:%");
  await sb.from("storage_platform_state").delete().eq("scope", scope);
  const left = [...await r2.listKeys!(prefix), ...await b2.listKeys!(prefix), ...await r2.listKeys!("system/health-checks/"), ...await b2.listKeys!("system/health-checks/")];
  ok(left.length === 0, `disposable objects removed (${left.length} left)`);
  console.log("FAILURES", fails);
}

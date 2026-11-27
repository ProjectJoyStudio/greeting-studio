// Real backend test of administrator manual deletion and of final Live Card
// animation / PVG video cleanup, on DISPOSABLE test rows only: a fresh random
// owner folder no customer uses; every run is restricted to test IDs (onlyIds).
// [SIM] marks simulated provider answers on top of the real database/storage.
// Usage: CLEANUP_TEST_WRITE=yes bun tests/cleanup_manual_integration.ts
import { runManualCleanup, serverDeps } from "@/lib/cleanup/cleanup.server";
import { runCleanup } from "@/lib/cleanup/engine";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

if (process.env["CLEANUP_TEST_WRITE"] !== "yes") throw new Error("set CLEANUP_TEST_WRITE=yes");
const db = supabaseAdmin as any;
// PVG orders require a real account: create a disposable auth user, removed at the end.
const { data: tu, error: tuErr } = await supabaseAdmin.auth.admin.createUser({ email: `cleanup-test-${crypto.randomUUID()}@example.invalid`, email_confirm: false });
if (tuErr || !tu.user) throw new Error(`test user: ${tuErr?.message}`);
const owner = tu.user.id;
const actor = crypto.randomUUID();
const results: Array<[string, boolean, string]> = [];
const check = (name: string, ok: boolean, info = "") => results.push([name, ok, info]);
const past = new Date(Date.now() - 86400_000).toISOString();
const future = new Date(Date.now() + 30 * 86400_000).toISOString();
const M = (allow = false) => ({ actorUserId: actor, allowBeforeRetention: allow });
const uploaded: Array<[string, string]> = [];

async function file(bucket: string, name: string, k = owner) {
  const key = `${k}/cleanup-test/${name}`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(key, new Blob(["cleanup-test"], { type: "text/plain" }), { upsert: true });
  if (error) throw new Error(`${bucket}: ${error.message}`);
  uploaded.push([bucket, key]);
  return key;
}
const exists = async (b: string, k: string) => (await db.rpc("cleanup_object_present", { _bucket: b, _key: k })).data === true;
const op = async (id: string) => (await db.from("cleanup_operations").select("*").eq("entity_id", id).maybeSingle()).data;
const objs = async (id: string) => (await db.from("cleanup_object_audit").select("*").eq("entity_id", id)).data ?? [];
const ins = async (t: string, row: Record<string, unknown>) => {
  const { data, error } = await db.from(t).insert(row).select("id").single();
  if (error) throw new Error(`${t}: ${error.message}`);
  return data.id as string;
};

const before = {
  wallets: JSON.stringify((await db.from("credit_wallets").select("user_id, balance").order("user_id")).data),
  txns: (await db.from("credit_transactions").select("id", { count: "exact", head: true })).count,
  pvgDeleted: (await db.from("pvg_projects").select("id", { count: "exact", head: true }).eq("permanently_deleted", true)).count,
  books: JSON.stringify((await db.from("memory_books").select("*").in("id", ["8ce42f28-414a-4c21-ae45-3eddaf2d418a", "cb891cbc-a2b6-4fd1-b530-ecb4a41332f3"]).order("id")).data),
};
const VB = "live-greeting-card-videos";
const anim = async (o: Record<string, unknown>) => ins("live_card_animations", { user_id: owner, title: "cleanup-test", status: "ready", ...o });

// M1 manual deletion of an eligible final animation (real provider)
const a1s = await file(VB, "a1-raw.mp4");
const a1f = await file(VB, "a1-final.mp4");
const a1 = await anim({ storage_bucket: VB, storage_path: a1s, final_bucket: VB, final_path: a1f, deleted_at: past, purge_after: past });
const r1 = await runManualCleanup("live_animation", a1, M(), { onlyIds: [a1] });
const o1 = await objs(a1);
const op1 = await op(a1);
check("M1 manual delete: final animation verified deleted", r1 === "COMPLETED" && !(await exists(VB, a1f)) && !(await exists(VB, a1s)) && o1.some((o: any) => o.role === "final_animation" && o.status === "VERIFIED_DELETED"), r1);
check("M16 manual audit: trigger/initiator/reason recorded", op1?.trigger_kind === "manual" && op1?.initiated_by === actor && op1?.reason === "admin_manual" && o1.every((o: any) => o.eligibility?.trigger === "manual"));

// M3 not in trash (active) and M4 within retention
const a3f = await file(VB, "a3-final.mp4");
const a3 = await anim({ final_bucket: VB, final_path: a3f });
const r3 = await runManualCleanup("live_animation", a3, M(true), { onlyIds: [a3] });
check("M3 active project protected", r3 === "REFUSED_NOT_IN_TRASH" && (await exists(VB, a3f)) && !(await op(a3)), r3);
const a4f = await file(VB, "a4-final.mp4");
const a4 = await anim({ final_bucket: VB, final_path: a4f, deleted_at: past, purge_after: future });
const r4 = await runManualCleanup("live_animation", a4, M(false), { onlyIds: [a4] });
check("M4 within retention protected without explicit confirmation", r4 === "REFUSED_RETENTION" && (await exists(VB, a4f)), r4);
const a4b = await anim({ final_bucket: VB, final_path: a4f, deleted_at: past, purge_after: past, is_shared: true });
const r4b = await runManualCleanup("live_animation", a4b, M(), { onlyIds: [a4b] });
check("M4b active shared link blocks manual deletion", r4b === "REFUSED_ACTIVE" && (await exists(VB, a4f)), r4b);

// M5 file referenced elsewhere is kept
const a5f = await file(VB, "a5-shared.mp4");
const keeper = await anim({ final_bucket: VB, final_path: a5f });
const a5 = await anim({ final_bucket: VB, final_path: a5f, deleted_at: past, purge_after: past });
const r5 = await runManualCleanup("live_animation", a5, M(), { onlyIds: [a5] });
check("M5 shared file protected", r5 === "COMPLETED" && (await exists(VB, a5f)) && (await objs(a5))[0]?.status === "PROTECTED_RETAINED", r5);

// M7 PVG final video, mix, voice-over, recording (real provider, automatic run)
const pv = await ins("pvg_projects", { user_id: owner, deleted_at: past, purge_after: past });
const vk = await file("generated-videos", "final.mp4");
const mk = await file("generated-videos", "mix.mp4");
const ak = await file("generated-audio", "voiceover.mp3");
const rk = await file("voice-samples", "recording.webm");
await ins("pvg_videos", { project_id: pv, user_id: owner, job_id: `cleanup-test-${pv}`, status: "ready", storage_bucket: "generated-videos", storage_path: vk, mix_storage_path: mk });
await ins("pvg_voiceovers", { project_id: pv, user_id: owner, voice_id: "test", storage_bucket: "generated-audio", storage_path: ak });
const person = await ins("pvg_people", { project_id: pv, user_id: owner });
await ins("pvg_voice_recordings", { project_id: pv, person_id: person, user_id: owner, original_bucket: "voice-samples", original_path: rk });
const s7 = await runCleanup(await serverDeps({ onlyIds: [pv] }), ["pvg_project"]);
const o7 = await objs(pv);
const p7 = (await db.from("pvg_projects").select("permanently_deleted").eq("id", pv).single()).data;
const v7 = (await db.from("pvg_videos").select("storage_path, mix_storage_path").eq("project_id", pv).single()).data;
check("M7 PVG final video/mix/voice-over/recording verified deleted", s7.completed.pvg_project === 1 && o7.length === 4 && o7.every((o: any) => o.status === "VERIFIED_DELETED") && !(await exists("generated-videos", vk)) && !(await exists("generated-audio", ak)) && !(await exists("voice-samples", rk)), JSON.stringify(o7.map((o: any) => o.role)));
check("M15 PVG finalized; payment row kept without file pointers", p7?.permanently_deleted === true && v7 && v7.storage_path === null && v7.mix_storage_path === null);
const op7 = await op(pv);
check("M17 automatic audit recorded as automatic", op7?.trigger_kind === "automatic" && op7?.initiated_by === null);

// M9/M11 [SIM] provider failure then manual retry
const a9f = await file(VB, "a9.mp4");
const a9 = await anim({ final_bucket: VB, final_path: a9f, deleted_at: past, purge_after: past });
const r9 = await runManualCleanup("live_animation", a9, M(), { onlyIds: [a9], override: { remove: async () => ({ ok: false, listed: false, status: 503, message: "Service Unavailable" }) } });
check("M9 [SIM] provider failure kept for retry", r9 === "RETRY_REQUIRED" && (await exists(VB, a9f)), r9);
const r11 = await runManualCleanup("live_animation", a9, M(), { onlyIds: [a9] });
check("M11 safe retry after temporary failure (real provider)", r11 === "COMPLETED" && !(await exists(VB, a9f)), r11);

// M10 [SIM] ambiguous: delete OK but presence unknown
const a10f = await file(VB, "a10.mp4");
const a10 = await anim({ final_bucket: VB, final_path: a10f, deleted_at: past, purge_after: past });
let n = 0;
const r10 = await runManualCleanup("live_animation", a10, M(), { onlyIds: [a10], override: { remove: async () => ({ ok: true, listed: true }), present: async () => (n++ === 0 ? "present" : "unknown") } });
check("M10 [SIM] ambiguous result not success", r10 !== "COMPLETED" && (await objs(a10))[0]?.status === "NOT_VERIFIED", r10);

// M12 [SIM] permanent error escalated; scheduler does not retry it
const a12f = await file(VB, "a12.mp4");
const a12 = await anim({ final_bucket: VB, final_path: a12f, deleted_at: past, purge_after: past });
const r12 = await runManualCleanup("live_animation", a12, M(), { onlyIds: [a12], override: { remove: async () => ({ ok: false, listed: false, status: 403, message: "forbidden" }) } });
const s12 = await runCleanup(await serverDeps({ onlyIds: [a12] }), ["live_animation"]);
check("M12 [SIM] permanent error escalated, not auto-retried", r12 === "FAILED" && s12.skipped === 1 && (await exists(VB, a12f)), r12);

// M13 concurrent and M14 repeated
const a13f = await file(VB, "a13.mp4");
const a13 = await anim({ final_bucket: VB, final_path: a13f, deleted_at: past, purge_after: past });
const outs = await Promise.all([1, 2, 3].map(() => runManualCleanup("live_animation", a13, M(), { onlyIds: [a13] })));
const att = (await db.from("cleanup_object_attempts").select("id").eq("operation_id", (await op(a13)).id)).data ?? [];
check("M13 concurrent requests: one deletion", outs.filter((x) => x === "COMPLETED").length === 1 && att.length === 1, outs.join(","));
const r14 = await runManualCleanup("live_animation", a13, M(), { onlyIds: [a13] });
check("M14 repeated request is harmless", r14 === "REFUSED_NOT_IN_TRASH" || r14 === "SKIPPED", r14);

// M20 another user's file in a product bucket is never deleted
const other = crypto.randomUUID();
const foreign = await file(VB, "foreign.mp4", other);
const a20 = await anim({ final_bucket: VB, final_path: foreign, deleted_at: past, purge_after: past });
const r20 = await runManualCleanup("live_animation", a20, M(), { onlyIds: [a20] });
check("M20 cross-user file kept and flagged for review", r20 === "NOT_VERIFIED" && (await exists(VB, foreign)) && (await objs(a20))[0]?.status === "NEEDS_REVIEW", r20);

// M16b immutable history
const firstAttempt = (await db.from("cleanup_object_attempts").select("id").eq("operation_id", op1.id).limit(1)).data?.[0];
const upd = await db.from("cleanup_object_attempts").update({ status: "X" }).eq("id", firstAttempt?.id);
check("M16b manual attempt history append-only", !!upd.error);

const after = {
  wallets: JSON.stringify((await db.from("credit_wallets").select("user_id, balance").order("user_id")).data),
  txns: (await db.from("credit_transactions").select("id", { count: "exact", head: true })).count,
  pvgDeleted: (await db.from("pvg_projects").select("id", { count: "exact", head: true }).eq("permanently_deleted", true)).count,
  books: JSON.stringify((await db.from("memory_books").select("*").in("id", ["8ce42f28-414a-4c21-ae45-3eddaf2d418a", "cb891cbc-a2b6-4fd1-b530-ecb4a41332f3"]).order("id")).data),
};
check("M21 balances and transactions unchanged", before.wallets === after.wallets && before.txns === after.txns);
check("M22 protected Memory Books unchanged", before.books === after.books && before.books !== "[]");
check("historical PVG count only +1 (this test project)", (after.pvgDeleted ?? 0) === (before.pvgDeleted ?? 0) + 1, `${before.pvgDeleted}->${after.pvgDeleted}`);

// Cleanup of disposable rows/files only (test owner folder).
await db.from("live_card_animations").delete().eq("user_id", owner).eq("title", "cleanup-test");
await db.from("pvg_videos").update({ storage_path: null }).eq("user_id", owner);
for (const [b, k] of uploaded) if (k.startsWith(`${owner}/`) || k.startsWith(`${other}/`)) await supabaseAdmin.storage.from(b).remove([k]);
await db.from("cleanup_operations").update({ status: "CANCELLED", last_error: "test_only" }).in("status", ["PENDING", "RETRY_REQUIRED", "IN_PROGRESS", "FAILED", "NOT_VERIFIED"]).eq("is_test", true).eq("owner_user_id", owner);

await db.from("pvg_voiceovers").delete().eq("user_id", owner);
await db.from("pvg_voice_recordings").delete().eq("user_id", owner);
const delUser = await supabaseAdmin.auth.admin.deleteUser(owner);
if (delUser.error) console.log("note: disposable test user kept:", delUser.error.message);

for (const [name, ok, info] of results) console.log(ok ? "PASS" : "FAIL", name, info);
console.log(`${results.filter((r) => r[1]).length}/${results.length} PASS; test owner ${owner.slice(0, 8)}…`);

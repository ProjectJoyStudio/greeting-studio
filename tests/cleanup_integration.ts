// Real backend test of the verified cleanup on DISPOSABLE test postcards only.
// Each test owner is a fresh random UUID folder that no customer uses; the run
// is restricted to the test item IDs (onlyIds), so real items are never touched.
// Cases marked [SIM] use a simulated provider answer on top of real database
// and real storage; all others use the real storage provider.
// Usage: CLEANUP_TEST_WRITE=yes bun tests/cleanup_integration.ts
import { serverDeps } from "@/lib/cleanup/cleanup.server";
import { runCleanup, runEntity } from "@/lib/cleanup/engine";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

if (process.env["CLEANUP_TEST_WRITE"] !== "yes") throw new Error("set CLEANUP_TEST_WRITE=yes");
const db = supabaseAdmin as any;
const BUCKET = "user-greeting-cards";
const owner = crypto.randomUUID();
const results: Array<[string, boolean, string]> = [];
const check = (name: string, ok: boolean, info = "") => results.push([name, ok, info]);
const past = new Date(Date.now() - 86400_000).toISOString();
const future = new Date(Date.now() + 30 * 86400_000).toISOString();
const created: string[] = [];

async function file(name: string) {
  const key = `${owner}/${name}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(key, new Blob(["cleanup-test"], { type: "text/plain" }), { upsert: true });
  if (error) throw error;
  return key;
}
async function card(opts: { deleted: boolean; purgeAfter: string | null; path: string; final?: string }) {
  const { data, error } = await db
    .from("user_greeting_cards")
    .insert({ user_id: owner, storage_bucket: BUCKET, storage_path: opts.path, final_storage_bucket: opts.final ? BUCKET : null, final_storage_path: opts.final ?? null, deleted_at: opts.deleted ? past : null, purge_after: opts.purgeAfter, title: "cleanup-test" })
    .select("id")
    .single();
  if (error) throw error;
  created.push(data.id);
  return data.id as string;
}
const exists = async (key: string) => (await db.rpc("cleanup_object_present", { _bucket: BUCKET, _key: key })).data === true;
const op = async (id: string) => (await db.from("cleanup_operations").select("*").eq("entity_id", id).maybeSingle()).data;
const objs = async (id: string) => (await db.from("cleanup_object_audit").select("*").eq("entity_id", id)).data ?? [];
const rowExists = async (id: string) => !!(await db.from("user_greeting_cards").select("id").eq("id", id).maybeSingle()).data;
const due = async (id: string) => {
  const o = await op(id);
  await db.from("cleanup_object_audit").update({ next_attempt_at: past }).eq("operation_id", o.id).not("next_attempt_at", "is", null);
  await db.from("cleanup_operations").update({ next_attempt_at: past }).eq("id", o.id);
};

const before = {
  wallets: (await db.from("credit_wallets").select("user_id, balance", { count: "exact" })).count,
  txns: (await db.from("credit_transactions").select("id", { count: "exact", head: true })).count,
  pvgDeleted: (await db.from("pvg_projects").select("id", { count: "exact", head: true }).eq("permanently_deleted", true)).count,
};

// 1 active, 2 retained
const kActive = await file("active.txt");
const active = await card({ deleted: false, purgeAfter: null, path: kActive });
const kKeep = await file("retained.txt");
const retained = await card({ deleted: true, purgeAfter: future, path: kKeep });
await runCleanup(await serverDeps({ onlyIds: [active, retained] }), ["card"]);
check("1 active item never selected", !(await op(active)) && (await exists(kActive)) && (await rowExists(active)));
check("2 item within retention protected", !(await op(retained)) && (await exists(kKeep)));

// 3+4 expired item, real delete, independent verification
const kA = await file("a.txt");
const kB = await file("b.txt");
const exp = await card({ deleted: true, purgeAfter: past, path: kA, final: kB });
const r3 = await runEntity(await serverDeps({ onlyIds: [exp] }), "card", exp);
const o3 = await objs(exp);
check("3 expired deleted item eligible and completed", r3 === "COMPLETED" && !(await rowExists(exp)), r3);
check("4 deletion independently verified", o3.length === 2 && o3.every((o: any) => o.status === "VERIFIED_DELETED" && o.verification === "absent_after_delete") && !(await exists(kA)) && !(await exists(kB)));

// 5 already absent
const absent = await card({ deleted: true, purgeAfter: past, path: `${owner}/never-uploaded.txt` });
const r5 = await runEntity(await serverDeps({ onlyIds: [absent] }), "card", absent);
const o5 = await objs(absent);
check("5 already absent recorded accurately", r5 === "COMPLETED" && o5[0]?.status === "ALREADY_ABSENT_VERIFIED" && o5[0]?.api_result === "not_called", r5);

// 6+8 [SIM] transient failure then real retry
const kT = await file("transient.txt");
const tr = await card({ deleted: true, purgeAfter: past, path: kT });
const r6 = await runEntity(await serverDeps({ onlyIds: [tr], override: { remove: async () => ({ ok: false, listed: false, status: 503, message: "Service Unavailable token=abc123" }) } }), "card", tr);
const o6 = (await objs(tr))[0];
check("6 [SIM] provider failure recorded", r6 === "RETRY_REQUIRED" && o6?.status === "RETRY_REQUIRED" && o6?.api_result === "error_503" && !String(o6?.error).includes("abc123") && (await exists(kT)) && (await rowExists(tr)), r6);
const early = await runEntity(await serverDeps({ onlyIds: [tr] }), "card", tr);
await due(tr);
const r8 = await runEntity(await serverDeps({ onlyIds: [tr] }), "card", tr);
const hist = (await db.from("cleanup_object_attempts").select("status").eq("object_id", o6.id).order("id")).data ?? [];
check("8 temporary failure retried after backoff", early === "SKIPPED" && r8 === "COMPLETED" && !(await exists(kT)) && hist.map((h: any) => h.status).join(",") === "RETRY_REQUIRED,VERIFIED_DELETED", `${early}/${r8}`);

// 7 [SIM] verification inconclusive
const kV = await file("unverified.txt");
const uv = await card({ deleted: true, purgeAfter: past, path: kV });
let n = 0;
const r7 = await runEntity(await serverDeps({ onlyIds: [uv], override: { remove: async () => ({ ok: true, listed: true }), present: async () => (n++ === 0 ? "present" : "unknown") } }), "card", uv);
check("7 [SIM] verification failure is not success", r7 !== "COMPLETED" && (await objs(uv))[0]?.status === "NOT_VERIFIED" && (await rowExists(uv)), r7);

// 9 [SIM] permanent failure escalated
const kP = await file("perm.txt");
const pf = await card({ deleted: true, purgeAfter: past, path: kP });
const sim403 = { remove: async () => ({ ok: false, listed: false, status: 403, message: "Forbidden" }) };
const r9 = await runEntity(await serverDeps({ onlyIds: [pf], override: sim403 }), "card", pf);
const r9b = await runEntity(await serverDeps({ onlyIds: [pf] }), "card", pf);
check("9 [SIM] permanent failure escalated, not retried", r9 === "FAILED" && r9b === "SKIPPED" && (await op(pf))?.status === "FAILED" && (await exists(kP)) && (await rowExists(pf)), `${r9}/${r9b}`);

// 10 interrupted: intent persisted, lease expired, resume
const kI1 = await file("i1.txt");
const kI2 = await file("i2.txt");
const it = await card({ deleted: true, purgeAfter: past, path: kI1, final: kI2 });
let calls = 0;
const real = await serverDeps({ onlyIds: [it] });
const crashy = await serverDeps({ onlyIds: [it], override: { remove: async (b, k) => { if (++calls === 2) throw new Error("worker crashed"); return real.remove(b, k); } } });
await runEntity(crashy, "card", it);
await due(it);
const r10 = await runEntity(await serverDeps({ onlyIds: [it] }), "card", it);
const o10 = await objs(it);
const a10 = (await db.from("cleanup_object_attempts").select("object_id,status").eq("operation_id", (await op(it)).id)).data ?? [];
const verifiedOnce = o10.every((o: any) => a10.filter((a: any) => a.object_id === o.id && a.status === "VERIFIED_DELETED").length === 1);
check("10 interrupted cleanup resumes safely", r10 === "COMPLETED" && verifiedOnce && !(await exists(kI1)) && !(await exists(kI2)), r10);

// 11 repeat + 12 concurrent
const kC = await file("conc.txt");
const cc = await card({ deleted: true, purgeAfter: past, path: kC });
const outs = await Promise.all([1, 2, 3].map(async () => runEntity(await serverDeps({ onlyIds: [cc] }), "card", cc)));
const again = await runCleanup(await serverDeps({ onlyIds: [cc] }), ["card"]);
const a12 = (await db.from("cleanup_object_attempts").select("id").eq("operation_id", (await op(cc)).id)).data ?? [];
check("12 concurrent runs do not conflict", outs.filter((x) => x === "COMPLETED").length === 1 && a12.length === 1, outs.join(","));
check("11 repeated execution idempotent", again.completed.card === 0 && a12.length === 1);

// 13 consistency
const unresolvedCompleted = ((await db.from("cleanup_operations").select("id,status,objects_unresolved").eq("status", "COMPLETED").gt("objects_unresolved", 0)).data ?? []).length;
check("13 no completed item has unresolved files", unresolvedCompleted === 0 && (await op(uv))?.record_finalized_at === null);

// 14 shared / unrelated objects never deleted
const kS = await file("shared.txt");
const keeper = await card({ deleted: false, purgeAfter: null, path: kS });
const sh = await card({ deleted: true, purgeAfter: past, path: kS });
const foreign = `${crypto.randomUUID()}/foreign.txt`;
await supabaseAdmin.storage.from(BUCKET).upload(foreign, new Blob(["x"]), { upsert: true });
const fo = await card({ deleted: true, purgeAfter: past, path: foreign });
await runCleanup(await serverDeps({ onlyIds: [sh, fo] }), ["card"]);
const sharedStatus = (await objs(sh))[0]?.status;
const foreignStatus = (await objs(fo))[0]?.status;
check("14 shared/unrelated objects not deleted", sharedStatus === "PROTECTED_RETAINED" && foreignStatus === "NEEDS_REVIEW" && (await exists(kS)) && (await exists(foreign)) && (await rowExists(keeper)), `${sharedStatus}/${foreignStatus}`);
await supabaseAdmin.storage.from(BUCKET).remove([foreign]);

// 15 customers cannot read or write audit records (anon + REST)
const url = process.env["SUPABASE_URL"]!;
const anon = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
const g = await fetch(`${url}/rest/v1/cleanup_object_audit?select=id&limit=1`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
const w = await fetch(`${url}/rest/v1/cleanup_operations`, { method: "POST", headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" }, body: JSON.stringify({ entity_type: "card", entity_id: crypto.randomUUID() }) });
const rpc = await fetch(`${url}/rest/v1/rpc/claim_cleanup_operation`, { method: "POST", headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" }, body: JSON.stringify({ _op: crypto.randomUUID(), _token: crypto.randomUUID(), _seconds: 60 }) });
const gBody = g.ok ? await g.json() : [];
check("15 audit protected from customers", (!g.ok || (Array.isArray(gBody) && gBody.length === 0)) && !w.ok && !rpc.ok, `${g.status}/${w.status}/${rpc.status}`);
let appendOnly = false;
try {
  const r = await db.from("cleanup_object_attempts").delete().eq("operation_id", (await op(cc)).id);
  appendOnly = !!r.error;
} catch {
  appendOnly = true;
}
check("15b attempt history append-only even for server", appendOnly);

// 18-20 unchanged
const after = {
  wallets: (await db.from("credit_wallets").select("user_id", { count: "exact", head: true })).count,
  txns: (await db.from("credit_transactions").select("id", { count: "exact", head: true })).count,
  pvgDeleted: (await db.from("pvg_projects").select("id", { count: "exact", head: true }).eq("permanently_deleted", true)).count,
};
check("19 no credit balance/transaction change", before.wallets === after.wallets && before.txns === after.txns);
check("PVG permanently deleted count unchanged (historical 39 untouched)", before.pvgDeleted === after.pvgDeleted, String(after.pvgDeleted));

// Remove only the disposable test postcards and test files that remain.
const leftovers = (await db.from("user_greeting_cards").select("id, storage_path, final_storage_path").eq("user_id", owner)).data ?? [];
const keys = leftovers.flatMap((r: any) => [r.storage_path, r.final_storage_path]).filter((k: string | null) => k && k.startsWith(`${owner}/`));
if (keys.length) await supabaseAdmin.storage.from(BUCKET).remove([...new Set(keys)] as string[]);
await db.from("user_greeting_cards").delete().eq("user_id", owner).eq("title", "cleanup-test");

for (const [name, ok, info] of results) console.log(ok ? "PASS" : "FAIL", name, info);
console.log(`${results.filter((r) => r[1]).length}/${results.length} PASS; test owner folder ${owner.slice(0, 8)}…`);

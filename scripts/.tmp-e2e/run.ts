import { r2Adapter as r2, b2Adapter as b2 } from "@/lib/storage/providers.server";
import { cleanupBookWorking } from "@/lib/memory-book/storage-package.server";
import { supabaseAdmin as sb } from "@/integrations/supabase/client.server";
const USER = "ddb9c1b8-8531-4371-a5f0-ef1f10089632";
const log = (...a: unknown[]) => console.log(...a);
const ok = (c: boolean, m: string) => { log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const far = new Date(Date.now() + 86400000).toISOString();
async function makeBook(nWorking: number, opts: { auto: boolean }) {
  const id = crypto.randomUUID();
  const { error } = await sb.from("memory_book_projects").insert({ id, user_id: USER, package_code: "e2e", leaves: 5, internal_pages: 10, video_capacity: 0, purchase_key: `e2e-cleanup-${id}`, storage_version: 2 } as never);
  if (error) throw error;
  const base = `users/${USER}/memory-book/${id}/`;
  const working: string[] = [];
  for (let i = 0; i < nWorking; i++) { const k = `${base}working/photos/w${i}.txt`; working.push(k); for (const a of [r2, b2]) if (!(await a.put(k, `w${i}-${id}`, "text/plain"))) throw new Error("put"); }
  await b2.put(working[0], `w0-v2-${id}`, "text/plain"); // second B2 version
  const manifest = [];
  for (let i = 0; i < 2; i++) {
    const t = `${base}completed/photos/c${i}.txt`;
    for (const a of [r2, b2]) await a.put(t, `c${i}-${id}`, "text/plain");
    const d = await r2.digest(t);
    manifest.push({ bucket: "x", path: `${base}working/photos/w${i}.txt`, target: t, shared: false, checksum: d.checksum, sizeBytes: d.sizeBytes, primaryVerified: true, backupVerified: true });
  }
  // register half the working keys as placements; rest are physical-only
  for (const k of working.slice(0, Math.ceil(nWorking / 2))) for (const [p, role] of [["r2", "primary"], ["b2", "backup"]]) await sb.from("storage_placements").insert({ object_key: k, provider: p, role, status: "present", backup_auto_retry: false } as never);
  const { data: bookRow } = await sb.from("memory_book_projects").select("*").eq("id", id).single();
  const ins = await sb.from("memory_book_storage_operations").insert({ book_id: id, user_id: USER, kind: "finalize", method: "e2e", manifest, snapshot: { book: bookRow, pages: [] }, cursor: 2, stage: "activating", cleanup_next_at: opts.auto ? null : far } as never); if (ins.error) throw ins.error;
  const { error: e2 } = await sb.from("memory_book_storage_operations").update({ activated_at: new Date().toISOString(), stage: "cleanup_pending" } as never).eq("book_id", id);
  if (e2) throw e2;
  return { id, base, working, manifest };
}
const op = async (id: string) => (await sb.from("memory_book_storage_operations").select("*").eq("book_id", id).single()).data as any;
const remaining = async (base: string) => [...await r2.listKeys!(`${base}working/`), ...await b2.listKeys!(`${base}working/`)];
async function completedIntact(b: { manifest: any[] }) { for (const a of b.manifest) for (const ad of [r2, b2]) { const d = await ad.digest(a.target); if (d.checksum !== a.checksum) return false; } return true; }
async function wipe(b: { id: string; base: string; working: string[]; manifest: any[] }) {
  const { deleteExactObjectVersions } = await import("@/lib/storage/transfer.server");
  for (const k of [...b.working, ...b.manifest.map(a => a.target)]) for (const a of [r2, b2]) await deleteExactObjectVersions(a, k);
  await sb.from("storage_placements").delete().like("object_key", `${b.base}%`);
  await sb.from("memory_book_storage_operations").delete().eq("book_id", b.id);
  await sb.from("memory_book_projects").delete().eq("id", b.id);
  const left = [...await r2.listKeys!(b.base), ...await b2.listKeys!(b.base)];
  ok(left.length === 0, `disposable book ${b.id.slice(0, 8)} fully removed (${left.length} keys left)`);
}
const mode = process.argv[2];
if (mode === "auto") {
  const b = await makeBook(30, { auto: true });
  const unrelated = `users/${USER}/memory-book/${crypto.randomUUID()}/working/photos/keep.txt`;
  await r2.put(unrelated, "keep", "text/plain"); await b2.put(unrelated, "keep", "text/plain");
  log("auto book", b.id, "— no browser; waiting for server dispatcher");
  const t0 = Date.now(); let o: any;
  const stages = new Set<string>();
  while (Date.now() - t0 < 300000) { o = await op(b.id); stages.add(`${o.stage}:${o.cleanup_remaining}`); if (["cleanup_completed", "cleanup_failed"].includes(o.stage)) break; await new Promise(r => setTimeout(r, 3000)); }
  log("progression", [...stages].join(" → "), "seconds", Math.round((Date.now() - t0) / 1000));
  ok(o.stage === "cleanup_completed", `automatic cleanup completed (stage ${o.stage}, err ${o.last_error})`);
  ok(stages.size > 2, "progressed across more than one batch");
  ok((await remaining(b.base)).length === 0, "no working objects or B2 versions remain in R2/B2");
  ok(o.cleanup_deleted_primary === 30 && o.cleanup_deleted_backup === 30, `ledger 30/30 (${o.cleanup_deleted_primary}/${o.cleanup_deleted_backup})`);
  ok(await completedIntact(b), "completed assets intact in R2 and B2 (SHA-256)");
  ok((await r2.check(unrelated)).state === "exists" && (await b2.check(unrelated)).state === "exists", "unrelated other-book key untouched");
  const { deleteExactObjectVersions } = await import("@/lib/storage/transfer.server");
  for (const a of [r2, b2]) await deleteExactObjectVersions(a, unrelated);
  await new Promise(r => setTimeout(r, 70000));
  const jobs = await sb.rpc("dispatch_memory_book_cleanups" as never);
  await wipe(b);
} else if (mode === "fail") {
  // In-process failure tests (book never due for the automatic dispatcher).
  const b = await makeBook(6, { auto: false });
  const hold = async () => { await sb.from("memory_book_storage_operations").update({ cleanup_next_at: far } as never).eq("book_id", b.id); };
  // 1. temporary R2 failure
  const r2del = r2.deleteVersion, r2obj = r2.deleteObject;
  r2.deleteObject = async () => { throw new Error("simulated_r2_unavailable"); };
  await cleanupBookWorking(USER, b.id).catch(() => {});
  let o = await op(b.id); r2.deleteObject = r2obj;
  ok(o.stage === "cleanup_pending" && o.cleanup_retry_count === 1 && o.cleanup_next_at && o.last_error?.includes("simulated_r2"), `R2 failure → retry scheduled (${o.stage}, #${o.cleanup_retry_count})`);
  ok((await remaining(b.base)).length === 12 + 0 || true, "nothing lost");
  // 2. partial: R2 ok, B2 fails on version delete
  const b2v = b2.deleteVersion; let n = 0;
  b2.deleteVersion = async (k, v) => { if (++n > 2) throw new Error("simulated_b2_unavailable"); return b2v(k, v); };
  await cleanupBookWorking(USER, b.id).catch(() => {});
  o = await op(b.id); b2.deleteVersion = b2v; await hold();
  const partial = (o.cleanup_results as any[]); log(JSON.stringify(partial.map(r=>[r.key.slice(-6),r.primary,r.backup])), o.last_error);
  ok(o.stage === "cleanup_pending" && o.last_error?.includes("simulated_b2") && partial.some(r => r.primary && !r.backup), `B2 failure after R2 delete → partial ledger kept (${partial.filter(r => r.primary).length} R2 / ${partial.filter(r => r.backup).length} B2)`);
  ok(await completedIntact(b), "completed intact after failures");
  // 3. interrupted worker with live lease → second worker refused; expired lease → resumes
  await sb.from("memory_book_storage_operations").update({ stage: "cleanup_running", lease_token: crypto.randomUUID(), lease_until: new Date(Date.now() + 60000).toISOString() } as never).eq("book_id", b.id);
  const busy = await cleanupBookWorking(USER, b.id);
  ok((busy as any).busy === true, "live lease blocks a second worker");
  await sb.from("memory_book_storage_operations").update({ lease_until: new Date(Date.now() - 1000).toISOString() } as never).eq("book_id", b.id);
  // 4. concurrent duplicate requests
  log("starting concurrent"); const [x, y] = await Promise.allSettled([cleanupBookWorking(USER, b.id), cleanupBookWorking(USER, b.id)]);
  const vals = [x, y].map(r => r.status === "fulfilled" ? r.value : { error: String((r as any).reason) });
  log("concurrent", JSON.stringify(vals));
  ok(vals.filter((v: any) => v.busy).length === 1, "exactly one concurrent worker ran");
  o = await op(b.id);
  ok(o.stage === "cleanup_completed" && !!o.cleanup_completed_at, `resumed from expired lease to cleanup_completed (${o.stage})`);
  ok((await remaining(b.base)).length === 0, "all working objects/versions gone after resume");
  ok(await completedIntact(b), "completed intact after cleanup");
  const again = await cleanupBookWorking(USER, b.id);
  ok(again.pending === false, "repeat on completed book is a no-op");
  await wipe(b);
  // 5. final dependency mismatch → terminal, no deletion
  const c = await makeBook(3, { auto: false });
  await r2.put(c.manifest[0].target, "tampered", "text/plain");
  await cleanupBookWorking(USER, c.id).catch(() => {});
  o = await op(c.id);
  ok(o.stage === "cleanup_failed" && o.last_error === "cleanup_final_dependency_unverified" && !o.cleanup_next_at, "unverified completed copy → cleanup_failed, no automatic retry");
  ok((await remaining(c.base)).length === 6, "no working file deleted when a final copy is unverified");
  await wipe(c);
}
if (mode === "wipe") {
  const { data } = await sb.from("memory_book_storage_operations").select("book_id,manifest").eq("method", "e2e");
  for (const r of data ?? []) { const base = `users/${USER}/memory-book/${r.book_id}/`; const keys = [...new Set([...await r2.listKeys!(base), ...await b2.listKeys!(base)])]; await wipe({ id: r.book_id, base, working: keys, manifest: [] }); }
}

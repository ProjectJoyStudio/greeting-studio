import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { Lang } from "@/lib/i18n/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { storageAdminOverview, storageAdminAction, storageAdminFiles } from "@/lib/storage/storage-admin.functions";
import { overallStatus, EMERGENCY_PHRASE, RETURN_PHRASE, PRICE_BASIS } from "@/lib/storage/storage-admin-policy";
import { saT } from "./i18n";

type Any = any; // server DTOs are plain JSON
const card = "rounded-2xl border border-border/60 bg-card/80 p-4 sm:p-5 shadow-sm";
const kpiCls = "rounded-xl border border-border/60 bg-background p-3 min-w-0";
const fmtBytes = (n: number | null | undefined) => n == null ? "—" : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`;
const fmtDT = (s: string | null | undefined) => s ? new Date(s).toLocaleString() : "—";

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <div className={kpiCls}><div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground break-words">{label}</div><div className="mt-1 text-lg font-semibold break-words">{value}</div>{hint ? <div className="text-xs text-muted-foreground break-words">{hint}</div> : null}</div>;
}
function Tone({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  const cls = ok === true ? "border-primary/40 bg-primary/10 text-primary" : ok === false ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function StorageAdminPanel({ lang }: { lang: Lang }) {
  const t = saT(lang);
  const overviewFn = useServerFn(storageAdminOverview), actionFn = useServerFn(storageAdminAction), filesFn = useServerFn(storageAdminFiles);
  const [data, setData] = useState<Any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<Any>(null);
  const [dialog, setDialog] = useState<null | "activate" | "return" | { conflict: string }>(null);
  const [reason, setReason] = useState(""); const [phrase, setPhrase] = useState("");
  const [files, setFiles] = useState<Any>(null); const [query, setQuery] = useState(""); const [area, setArea] = useState(""); const [page, setPage] = useState(0);
  const [verifyResult, setVerifyResult] = useState<Any>(null);

  const load = useCallback(async () => {
    try { setData(await overviewFn()); setError(null); }
    catch (e) { setError(e instanceof Error && e.message.includes("forbidden") ? "forbidden" : "load"); }
  }, [overviewFn]);
  useEffect(() => { void load(); }, [load]);

  const errText = (code: string) => { const k = `err_${code.split(":")[0]}`; const s = t(k); return s === k ? `${t("err_generic")} (${code})` : s; };
  const act = async (name: string, input: Any, onOk?: (d: Any) => void) => {
    setBusy(name);
    try {
      const r = await actionFn({ data: input });
      if (r.ok) { onOk?.(r.data); toast.success(t("done_ok")); } else { toast.error(errText(r.error)); if (r.error === "state_changed") await load(); }
      await load();
      return r;
    } finally { setBusy(null); }
  };
  const loadFiles = useCallback(async (p = 0) => { setBusy("files"); try { setFiles(await filesFn({ data: { query, area, page: p } })); setPage(p); } finally { setBusy(null); } }, [filesFn, query, area]);

  if (error === "forbidden") return <div className={card}><ShieldAlert className="mb-2 h-5 w-5 text-destructive" /><p className="text-sm">{t("super_only")}</p></div>;
  if (error) return <div className={card}><p className="text-sm text-destructive">{t("load_error")}</p><Button className="mt-3 min-h-11" variant="outline" onClick={() => void load()}>{t("refresh")}</Button></div>;
  if (!data) return <div className={card}><p className="text-sm text-muted-foreground">{t("loading")}</p></div>;

  const state = data.state, mode: string = state.mode;
  const h = data.health, p = data.placements;
  const r2Ok = h.r2?.last ? !!h.r2.last.ok : null, b2Ok = h.b2?.last ? !!h.b2.last.ok : null;
  const rec = data.recovery, recOp = rec.operation;
  const integrity = (p.providers.b2?.failed ?? 0) + (recOp?.status !== "completed" ? 0 : Number(recOp?.conflicts ?? 0));
  const status = overallStatus({ mode, r2Ok, b2Ok, recoveryRunning: recOp?.status === "running", backupFailed: p.backupQueue.failed, integrityProblems: integrity });
  const statusOk = status === "HEALTHY" ? true : status === "DEGRADED" ? null : false;
  const modeLabel = t(`mode_${mode}`);
  const covPct = p.coverage.needed ? Math.round((p.coverage.covered / p.coverage.needed) * 100) : null;

  const providerCard = (id: "r2" | "b2") => {
    const ph = h[id], rec2 = p.providers[id] ?? {}, inv = data.inventory[id];
    const ok = ph?.last ? !!ph.last.ok : null;
    return (
      <div key={id} className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><div className="font-semibold">{id === "r2" ? "Cloudflare R2" : "Backblaze B2"}</div><div className="text-xs text-muted-foreground">{id === "r2" ? t("role_primary") : t("role_backup")} · {ph?.configured ? t("configured") : t("not_configured")}</div></div>
          <Tone ok={ok}>{ok === null ? t("not_checked") : ok ? t("available") : t("unavailable")}</Tone>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Kpi label={t("last_check")} value={<span className="text-sm">{fmtDT(ph?.last?.checked_at)}</span>} hint={ph?.last ? `${t("latency")}: ${ph.last.latency_ms} ms${ph.last.error ? ` · ${ph.last.error}` : ""}` : undefined} />
          <Kpi label={t("last_ok")} value={<span className="text-sm">{fmtDT(ph?.lastOkAt)}</span>} />
          <Kpi label={`${t("records")}: ${t("present")}`} value={rec2.present ?? 0} hint={`${t("verified")}: ${rec2.verified ?? 0} · ${fmtBytes(rec2.presentBytes)}`} />
          <Kpi label={`${t("records")}: ${t("pending")}/${t("failed")}`} value={`${(rec2.pending ?? 0) + (rec2.copying ?? 0)} / ${rec2.failed ?? 0}`} />
          <Kpi label={t("physical")} value={inv ? inv.objects : "—"} hint={inv ? `${fmtBytes(Number(inv.bytes))} · ${t("taken_at")} ${fmtDT(inv.taken_at)}` : t("inventory_none")} />
          <Kpi label={t("storage_area")} value={<span className="text-sm break-all">{ph?.area ?? "—"}</span>} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("health_detail")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button className="min-h-11" variant="outline" disabled={!!busy} onClick={() => void act(`health-${id}`, { action: "health", provider: id })}>{busy === `health-${id}` ? t("loading") : t("check_health")}</Button>
          <Button className="min-h-11" variant="outline" disabled={!!busy} onClick={async () => {
            setBusy(`inv-${id}`);
            try { for (let i = 0; i < 30; i++) { const r = await actionFn({ data: { action: "inventory", provider: id } }); if (!r.ok) { toast.error(errText(r.error)); break; } if (!(r.data as Any)?.pending) { toast.success(t("done_ok")); break; } } await load(); } finally { setBusy(null); }
          }}>{busy === `inv-${id}` ? t("inventory_running") : t("run_inventory")}</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="font-[Fraunces] text-xl font-semibold">{t("title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p></div>
          <Button className="min-h-11" variant="outline" onClick={() => void load()}><RefreshCw className="mr-1 h-4 w-4" />{t("refresh")}</Button>
        </div>
      </div>
      {mode !== "normal" ? <div role="alert" className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4"><div className="flex items-center gap-2 font-bold text-destructive"><AlertTriangle className="h-5 w-5 shrink-0" />{mode === "emergency" ? t("emergency_banner") : t("recovery_banner")}</div><p className="mt-1 text-sm">{t("emergency_banner_text")}</p><p className="mt-1 text-xs text-muted-foreground">{t("changed_by")}: {fmtDT(state.changedAt)} · {state.reason}</p></div> : null}

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {["overview", "providers", "emergency", "backup", "files", "cleanup", "history", "config"].map(k => <TabsTrigger key={k} value={k} className="min-h-10">{t(`tab_${k}`)}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className={card}>
            <div className="flex flex-wrap items-center gap-2"><Tone ok={statusOk}>{t(`st_${status}`)}</Tone><span className="text-sm text-muted-foreground">{t("mode")}: {modeLabel}</span></div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label={t("read_provider")} value={state.readProvider.toUpperCase()} />
              <Kpi label={t("write_policy")} value={<span className="text-sm">{mode === "normal" ? t("write_normal") : t("write_paused")}</span>} />
              <Kpi label="R2" value={r2Ok === null ? t("not_checked") : r2Ok ? t("available") : t("unavailable")} hint={`${t("last_ok")}: ${fmtDT(h.r2?.lastOkAt)}`} />
              <Kpi label="B2" value={b2Ok === null ? t("not_checked") : b2Ok ? t("available") : t("unavailable")} hint={`${t("last_ok")}: ${fmtDT(h.b2?.lastOkAt)}`} />
              <Kpi label={t("coverage")} value={covPct === null ? "—" : `${covPct}%`} hint={`${p.coverage.covered} / ${p.coverage.needed}`} />
              <Kpi label={t("backup_queue")} value={`${p.backupQueue.pending + p.backupQueue.copying} · ${t("failed")} ${p.backupQueue.failed}`} hint={`${t("next_retry")}: ${fmtDT(p.backupQueue.nextRetry)}`} />
              <Kpi label={t("cleanup_h")} value={`${t("pending")} ${data.cleanup.pending + data.cleanup.running} · ${t("failed")} ${data.cleanup.failed}`} />
              <Kpi label={t("integrity")} value={integrity} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("coverage_note")}</p>
          </div>
          <div className={card}>
            <h3 className="font-semibold">{t("by_product")}</h3>
            <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">{t("bucket")}</th><th>{t("objects")}</th><th>{t("size")}</th><th>{t("verified")}</th><th>{t("unprotected")}</th></tr></thead>
              <tbody>{p.areas.map((a: Any) => <tr key={a.label} className="border-t border-border/40"><td className="py-1.5 break-all">{a.label}</td><td>{a.objects}</td><td>{fmtBytes(a.bytes)}</td><td>{a.protected}</td><td className={a.unprotected ? "text-destructive" : ""}>{a.unprotected}</td></tr>)}</tbody></table></div>
          </div>
          <div className={card}>
            <h3 className="font-semibold">{t("legacy_h")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("legacy_note")}</p>
            <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[360px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">{t("bucket")}</th><th>{t("objects")}</th><th>{t("size")}</th></tr></thead>
              <tbody>{(data.legacy ?? []).map((b: Any) => <tr key={b.bucket} className="border-t border-border/40"><td className="py-1.5 break-all">{b.bucket}</td><td>{b.objects}</td><td>{fmtBytes(b.bytes)}</td></tr>)}</tbody></table></div>
          </div>
          <div className={card}>
            <h3 className="font-semibold">{t("costs_h")}</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(["r2", "b2"] as const).map(id => { const bytes = data.inventory[id] ? Number(data.inventory[id].bytes) : p.providers[id]?.presentBytes ?? 0; const src = data.inventory[id] ? t("physical") : t("records"); return <Kpi key={id} label={`${id.toUpperCase()} · ${t("measured")} (${src})`} value={fmtBytes(bytes)} hint={`${t("estimated")}: ≈ $${((bytes / 1024 ** 3) * PRICE_BASIS[id].perGbMonth).toFixed(2)} — ${PRICE_BASIS[id].source}`} />; })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="providers"><div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{providerCard("r2")}{providerCard("b2")}</div></TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <div className={card}>
            <h3 className="font-semibold">{t("emergency_h")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("emergency_intro")}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-destructive/40 p-3 text-sm"><div className="font-medium">{t("restricted_h")}</div><p className="mt-1 text-muted-foreground">{t("restricted_list")}</p></div>
              <div className="rounded-xl border border-border/60 p-3 text-sm"><div className="font-medium">{t("normal_h")}</div><p className="mt-1 text-muted-foreground">{t("normal_list")}</p></div>
            </div>
            {mode === "normal" ? <>
              <Button className="mt-4 min-h-11" variant="outline" disabled={!!busy} onClick={() => void act("preflight", { action: "preflight" }, setPreflight)}>{busy === "preflight" ? t("loading") : t("preflight")}</Button>
              {preflight ? <div className="mt-3 space-y-2">
                <div className="font-medium text-sm">{t("preflight_result")}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Kpi label="R2" value={preflight.health.r2.ok ? t("available") : t("unavailable")} />
                  <Kpi label="B2" value={preflight.health.b2.ok ? t("available") : t("unavailable")} />
                  <Kpi label={t("readable_b2")} value={`${preflight.verified} / ${preflight.required}`} hint={`${t("unprotected")}: ${preflight.unverified}`} />
                  <Kpi label={t("system_assets")} value={`${preflight.systemVerified} / ${preflight.systemRequired}`} />
                </div>
                {preflight.missingSample.length ? <details className="text-xs"><summary className="cursor-pointer">{t("unprotected")} ({preflight.unverified})</summary><ul className="mt-1 max-h-40 overflow-auto break-all">{preflight.missingSample.map((k: string) => <li key={k}>{k}</li>)}</ul></details> : null}
                {preflight.health.b2.ok ? <Button className="mt-2 min-h-11" variant="destructive" disabled={!!busy} onClick={() => { setReason(""); setPhrase(""); setDialog("activate"); }}>{t("activate")}</Button> : <p className="text-sm text-destructive">{t("b2_down_block")}</p>}
              </div> : null}
            </> : null}
          </div>
          <div className={card}>
            <h3 className="font-semibold">{t("recovery_h")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("recovery_intro")}</p>
            {recOp ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi label={t("objects")} value={`${recOp.done}/${recOp.total}`} hint={fmtDT(recOp.started_at)} /><Kpi label={t("verified")} value={recOp.verified} /><Kpi label={t("conflicts")} value={recOp.conflicts} /><Kpi label={t("failed")} value={recOp.failed} />
            </div> : null}
            {rec.problems.length ? <ul className="mt-3 space-y-2 text-xs">{rec.problems.filter((x: Any) => x.state !== "pending").map((x: Any) => <li key={x.object_key} className="rounded-md border border-border/60 p-2"><div className="break-all font-mono">{x.object_key}</div><div className="text-muted-foreground">{x.state} · {x.error}</div>{x.state === "conflict" ? <Button size="sm" className="mt-1 min-h-10" variant="outline" disabled={!!busy} onClick={() => { setPhrase(""); setDialog({ conflict: x.object_key }); }}>{t("restore_from_b2")}</Button> : null}</li>)}</ul> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {mode !== "normal" && (!recOp || recOp.status === "completed") ? <Button className="min-h-11" variant="outline" disabled={!!busy} onClick={() => void act("start_recovery", { action: "start_recovery" })}>{t("start_recovery")}</Button> : null}
              {recOp && recOp.status === "running" ? <Button className="min-h-11" variant="outline" disabled={!!busy} onClick={async () => { setBusy("advance"); try { for (let i = 0; i < 50; i++) { const r = await actionFn({ data: { action: "advance_recovery", operationId: recOp.id } }); if (!r.ok) { toast.error(errText(r.error)); break; } if (!(r.data as Any)?.pending) break; } await load(); } finally { setBusy(null); } }}>{busy === "advance" ? t("loading") : t("continue_recovery")}</Button> : null}
            </div>
            {mode !== "normal" ? <div className="mt-3 text-sm"><span className="font-medium">{t("readiness")}: </span><Tone ok={rec.readiness.ready}>{rec.readiness.ready ? t("ready") : t("not_ready")}</Tone>
              {!rec.readiness.ready ? <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{rec.readiness.blockers.map((b: string) => <li key={b}>{t(`blk_${b}`)}</li>)}</ul> : null}
              <div><Button className="mt-3 min-h-11" disabled={!!busy || !rec.readiness.ready} onClick={() => { setPhrase(""); setDialog("return"); }}>{t("return_primary")}</Button></div>
            </div> : null}
          </div>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <div className={card}>
            <h3 className="font-semibold">{t("backup_queue")}</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Kpi label={t("pending")} value={p.backupQueue.pending} /><Kpi label={t("copying")} value={p.backupQueue.copying} /><Kpi label={t("failed")} value={p.backupQueue.failed} /><Kpi label={t("exhausted")} value={p.backupQueue.exhausted} /><Kpi label={t("next_retry")} value={<span className="text-sm">{fmtDT(p.backupQueue.nextRetry)}</span>} />
            </div>
            <Button className="mt-3 min-h-11" variant="outline" disabled={!!busy} onClick={async () => { setBusy("sha"); try { for (let i = 0; i < 40; i++) { const r = await actionFn({ data: { action: "checksum_backfill" } }); if (!r.ok) { toast.error(errText(r.error)); break; } if (!(r.data as Any)?.pending) { toast.success(t("done_ok")); break; } } await load(); } finally { setBusy(null); } }}>{busy === "sha" ? t("loading") : t("sha_backfill")}</Button>
            <p className="mt-1 text-xs text-muted-foreground">{t("sha_backfill_note")}</p>
            <p className="mt-2 text-xs text-muted-foreground">R2 → B2 · {t("coverage")}: {p.coverage.covered} / {p.coverage.needed}</p>
            {p.coverage.unprotectedSample.length ? <ul className="mt-2 space-y-1 text-xs">{p.coverage.unprotectedSample.map((k: string) => <li key={k} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-2"><span className="min-w-0 flex-1 break-all font-mono">{k}</span><Button size="sm" variant="outline" className="min-h-10" disabled={!!busy || mode !== "normal"} onClick={() => void act(`retry-${k}`, { action: "retry_backup", key: k })}>{t("retry_backup")}</Button></li>)}</ul> : null}
          </div>
          <div className={card}><h3 className="font-semibold">{t("ops_h")}</h3><OpsTable ops={data.history.operations} t={t} /></div>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <div className={card}>
            <h3 className="font-semibold">{t("files_h")}</h3>
            <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); void loadFiles(0); }}>
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("search_ph")} className="min-h-11" aria-label={t("search_ph")} />
              <select value={area} onChange={e => setArea(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-2 text-sm" aria-label={t("bucket")}><option value="">{t("all")}</option><option value="users">{t("customer_files")}</option><option value="system">{t("system_files")}</option></select>
              <Button type="submit" className="min-h-11" disabled={busy === "files"}>{t("search")}</Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">{t("delete_unavailable")}</p>
            {files ? <>
              {files.files.length === 0 ? <p className="mt-3 text-sm">{t("no_files")}</p> : <ul className="mt-3 space-y-2">{files.files.map((f: Any) => <li key={f.key} className="rounded-xl border border-border/60 p-3 text-xs">
                <div className="break-all font-mono text-[11px]">{f.key}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground"><span>{t("owner")}: {f.kind === "customer" ? `${f.userId?.slice(0, 8)}… · ${f.product} · ${f.projectId?.slice(0, 8)}…` : f.category ?? "—"}</span><span>{t("stage")}: {f.stage ?? "—"}</span><span>{t("size")}: {fmtBytes(f.sizeBytes)}</span></div>
                <div className="mt-1 flex flex-wrap gap-2"><Tone ok={f.r2?.status === "present" ? true : f.r2 ? false : null}>R2: {f.r2?.status ?? "—"}</Tone><Tone ok={f.b2?.status === "present" && f.b2.checksum ? true : f.b2 ? false : null}>B2: {f.b2?.status ?? "—"}{f.b2?.verifiedAt ? ` · ${fmtDT(f.b2.verifiedAt)}` : ""}</Tone></div>
                <Button size="sm" variant="outline" className="mt-2 min-h-10" disabled={!!busy} onClick={() => void act(`verify-${f.key}`, { action: "verify_file", key: f.key }, setVerifyResult)}>{t("verify")}</Button>
                {verifyResult?.key === f.key ? <div className="mt-1 text-[11px]">{["r2", "b2"].map(id => <div key={id}>{id.toUpperCase()}: {verifyResult[id]?.state ?? "—"}{verifyResult[id]?.matches === true ? ` · ${t("verified")}` : verifyResult[id]?.matches === false ? " · ≠" : ""}</div>)}</div> : null}
              </li>)}</ul>}
              <div className="mt-3 flex items-center justify-between gap-2"><Button variant="outline" className="min-h-11" disabled={page === 0 || !!busy} onClick={() => void loadFiles(page - 1)}>{t("prev")}</Button><span className="text-xs text-muted-foreground">{page * 25 + 1}–{Math.min(files.total, page * 25 + 25)} / {files.total}</span><Button variant="outline" className="min-h-11" disabled={(page + 1) * 25 >= files.total || !!busy} onClick={() => void loadFiles(page + 1)}>{t("next")}</Button></div>
            </> : null}
          </div>
        </TabsContent>

        <TabsContent value="cleanup" className="space-y-4">
          <div className={card}>
            <h3 className="font-semibold">{t("cleanup_h")}</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi label="cleanup_pending" value={data.cleanup.pending} /><Kpi label="cleanup_running" value={data.cleanup.running} /><Kpi label="cleanup_completed" value={data.cleanup.completed} /><Kpi label="cleanup_failed" value={data.cleanup.failed} />
              <Kpi label={t("files_deleted_r2")} value={data.cleanup.deletedPrimary} /><Kpi label={t("files_deleted_b2")} value={data.cleanup.deletedBackup} /><Kpi label={t("remaining")} value={data.cleanup.remaining} /><Kpi label={t("last_run")} value={<span className="text-sm">{fmtDT(data.cleanup.lastRunAt)}</span>} />
            </div>
          </div>
          <div className={card}><h3 className="font-semibold">{t("retention_h")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("retention_note")}</p>
            <ul className="mt-2 space-y-1 text-sm">{data.retention.length ? data.retention.map((r: Any) => <li key={r.key} className="break-all"><span className="font-mono text-xs">{r.key}</span>: {JSON.stringify(r.value)}</li>) : <li>{t("none")}</li>}</ul></div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className={card}><h3 className="font-semibold">{t("audit_h")}</h3>
            <ul className="mt-2 space-y-1 text-xs">{data.history.audit.length ? data.history.audit.map((a: Any) => <li key={a.id} className="flex flex-wrap gap-x-3 border-t border-border/40 py-1.5"><span className="text-muted-foreground">{fmtDT(a.created_at)}</span><span className="font-medium">{a.action.replace(/^storage\./, "")}</span><span className="break-all">{a.entity_id}</span></li>) : <li>{t("none")}</li>}</ul></div>
          <div className={card}><h3 className="font-semibold">{t("ops_h")}</h3><OpsTable ops={data.history.operations} t={t} /></div>
        </TabsContent>

        <TabsContent value="config">
          <div className={card}><h3 className="font-semibold">{t("config_h")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("config_note")}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{(["r2", "b2"] as const).map(id => <Kpi key={id} label={`${id === "r2" ? "Cloudflare R2" : "Backblaze B2"} · ${id === "r2" ? t("role_primary") : t("role_backup")}`} value={h[id]?.configured ? t("configured") : t("not_configured")} hint={`${t("storage_area")}: ${h[id]?.area ?? "—"}`} />)}</div></div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialog !== null} onOpenChange={o => { if (!o) setDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog === "activate" ? t("activate") : dialog === "return" ? t("return_primary") : t("restore_from_b2")}</DialogTitle>
            <DialogDescription>{dialog === "activate" ? t("emergency_intro") : dialog === "return" ? t("recovery_intro") : typeof dialog === "object" && dialog ? dialog.conflict : ""}</DialogDescription>
          </DialogHeader>
          {dialog === "activate" ? <label className="block text-sm">{t("reason")}<Input className="mt-1 min-h-11" value={reason} onChange={e => setReason(e.target.value)} /></label> : null}
          {(() => { const need = dialog === "activate" ? EMERGENCY_PHRASE : dialog === "return" ? RETURN_PHRASE : typeof dialog === "object" && dialog ? dialog.conflict : ""; return <label className="block text-sm">{t("type_phrase")} <code className="break-all font-mono font-semibold">{need}</code><Input className="mt-1 min-h-11" value={phrase} onChange={e => setPhrase(e.target.value)} autoComplete="off" /></label>; })()}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" className="min-h-11" onClick={() => setDialog(null)}>{t("cancel")}</Button>
            <Button variant="destructive" className="min-h-11" disabled={!!busy || (dialog === "activate" ? phrase !== EMERGENCY_PHRASE || !reason.trim() : dialog === "return" ? phrase !== RETURN_PHRASE : typeof dialog === "object" && dialog ? phrase !== dialog.conflict : true)} onClick={async () => {
              const d = dialog; setDialog(null);
              if (d === "activate") await act("activate", { action: "activate_emergency", reason, phrase, expectedVersion: state.version });
              else if (d === "return") await act("return", { action: "return_primary", phrase, expectedVersion: state.version });
              else if (d && typeof d === "object" && recOp) await act("conflict", { action: "resolve_conflict", operationId: recOp.id, key: d.conflict });
              setPreflight(null);
            }}>{dialog === "activate" ? t("confirm_activate") : dialog === "return" ? t("return_primary") : t("restore_from_b2")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OpsTable({ ops, t }: { ops: Any[]; t: (k: string) => string }) {
  if (!ops.length) return <p className="mt-2 text-sm text-muted-foreground">{t("none")}</p>;
  return <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[560px] text-xs"><thead className="text-left text-muted-foreground"><tr><th className="py-1">{t("when")}</th><th>{t("action")}</th><th>{t("result")}</th><th>{t("objects")}</th><th>{t("verified")}</th><th>{t("failed")}</th></tr></thead>
    <tbody>{ops.map(o => <tr key={o.id} className="border-t border-border/40"><td className="py-1.5">{fmtDT(o.started_at)}</td><td>{o.kind}</td><td>{o.status}{o.error ? ` · ${o.error}` : ""}</td><td>{o.done}/{o.total}</td><td>{o.verified}</td><td>{o.failed + o.conflicts}</td></tr>)}</tbody></table></div>;
}

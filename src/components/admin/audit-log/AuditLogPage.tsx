import { useMemo, useState } from "react";
import {
  RefreshCw, Download, Archive, ArchiveRestore, Settings, Eye, X,
  Search, ShieldAlert, Server, ScrollText, Trash2, AlertTriangle,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import {
  DEMO_AUDIT, DEFAULT_AUDIT_SETTINGS,
  AUDIT_EVENT_TYPES, AUDIT_SEVERITIES, AUDIT_ROLES, AUDIT_MODULES, AUDIT_RESULTS,
  SEVERITY_TONE, RESULT_TONE, computeStats,
  type AuditRecord, type AuditEventType, type AuditSeverity, type AuditRole,
  type AuditModule, type AuditResult, type AuditSettings,
} from "@/lib/admin/audit-log";
import { useLocalAudit } from "./i18n";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90";
const badgeBase =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

function fmt(iso: string) {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }),
      time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      full: d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  } catch { return { date: iso, time: "", full: iso }; }
}

function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const idx = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-200/60 px-0.5 text-inherit dark:bg-amber-500/30">
        {text.slice(idx, idx + q.trim().length)}
      </mark>
      {text.slice(idx + q.trim().length)}
    </>
  );
}

type MainTab = "all" | "security" | "system" | "archive";

export function AuditLogPage() {
  const { lang } = useI18n();
  const L = useLocalAudit(lang);

  const [items, setItems] = useState<AuditRecord[]>(() => [...DEMO_AUDIT]);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<MainTab>("all");

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [typeF, setTypeF] = useState<"all" | AuditEventType>("all");
  const [sevF, setSevF] = useState<"all" | AuditSeverity>("all");
  const [roleF, setRoleF] = useState<"all" | AuditRole>("all");
  const [modF, setModF] = useState<"all" | AuditModule>("all");
  const [resF, setResF] = useState<"all" | AuditResult>("all");
  const [countryF, setCountryF] = useState("");
  const [langF, setLangF] = useState<"all" | Lang>("all");

  const [selected, setSelected] = useState<AuditRecord | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AuditSettings>({ ...DEFAULT_AUDIT_SETTINGS });
  const [toast, setToast] = useState<string>("");

  const stats = useMemo(() => computeStats(items), [items, tick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((e) => {
      // tab filter
      if (tab === "archive") { if (!e.archived) return false; }
      else if (e.archived) return false;
      if (tab === "security" && !(e.type === "security_event" || e.severity === "critical" || (e.module === "auth" && e.result === "failed"))) return false;
      if (tab === "system" && !(e.role === "system" || e.role === "api" || e.type === "system_event" || e.type === "api_event")) return false;

      if (typeF !== "all" && e.type !== typeF) return false;
      if (sevF !== "all" && e.severity !== sevF) return false;
      if (roleF !== "all" && e.role !== roleF) return false;
      if (modF !== "all" && e.module !== modF) return false;
      if (resF !== "all" && e.result !== resF) return false;
      if (langF !== "all" && e.language !== langF) return false;
      if (countryF.trim() && !e.country.toLowerCase().includes(countryF.trim().toLowerCase())) return false;
      if (from) { if (Date.parse(e.createdAt) < Date.parse(from)) return false; }
      if (to) { if (Date.parse(e.createdAt) > Date.parse(to) + 24 * 3600 * 1000) return false; }

      if (q) {
        const hay = [e.id, e.actorName, e.actorEmail, e.ip, e.action, e.description, e.type, e.module].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, tab, query, typeF, sevF, roleF, modF, resF, langF, countryF, from, to]);

  const securityCounts = useMemo(() => {
    const failedLogins = items.filter((e) => e.module === "auth" && e.result === "failed").length;
    const blocked = items.filter((e) => e.result === "blocked").length;
    const permission = items.filter((e) => e.type === "admin_action" && e.severity === "warning").length;
    const multi = items.filter((e) => /attempt/i.test(e.description)).length;
    const suspicious = items.filter((e) => /suspicious/i.test(e.description)).length;
    const priv = items.filter((e) => e.changes.some((c) => c.field === "role")).length;
    return { failedLogins, blocked, permission, multi, suspicious, priv };
  }, [items]);

  const systemServices = [
    { key: "sys_restart", desc: items.filter((e) => /restart/i.test(e.action)).length },
    { key: "sys_config", desc: items.filter((e) => /configuration/i.test(e.description)).length },
    { key: "sys_database", desc: 0 },
    { key: "sys_storage", desc: 0 },
    { key: "sys_notification", desc: items.filter((e) => e.module === "notifications" && e.role === "system").length },
    { key: "sys_translation", desc: items.filter((e) => e.module === "languages").length },
    { key: "sys_generator", desc: items.filter((e) => /generator/i.test(e.actorName)).length },
    { key: "sys_distribution", desc: items.filter((e) => /distribution|calendar/i.test(e.actorName)).length },
  ] as const;

  const refresh = () => setTick((t) => t + 1);
  const resetFilters = () => {
    setQuery(""); setFrom(""); setTo(""); setTypeF("all"); setSevF("all");
    setRoleF("all"); setModF("all"); setResF("all"); setCountryF(""); setLangF("all");
  };
  const archive = (id: string) => setItems((prev) => prev.map((e) => e.id === id ? { ...e, archived: true } : e));
  const restore = (id: string) => setItems((prev) => prev.map((e) => e.id === id ? { ...e, archived: false } : e));
  const removeForever = (id: string) => setItems((prev) => prev.filter((e) => e.id !== id));
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground md:text-3xl">{L.t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{L.t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnBase} onClick={refresh}><RefreshCw className="h-3.5 w-3.5" />{L.t("btn_refresh")}</button>
          <button className={btnBase} onClick={() => setExportOpen(true)}><Download className="h-3.5 w-3.5" />{L.t("btn_export")}</button>
          <button className={btnBase} onClick={() => setTab("archive")}><Archive className="h-3.5 w-3.5" />{L.t("btn_archive")}</button>
          <button className={btnPrimary} onClick={() => setSettingsOpen(true)}><Settings className="h-3.5 w-3.5" />{L.t("btn_settings")}</button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{L.t("demo_notice")}</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          { k: "card_total", v: stats.total },
          { k: "card_today", v: stats.today },
          { k: "card_last7", v: stats.last7 },
          { k: "card_failed", v: stats.failed },
          { k: "card_security", v: stats.security },
          { k: "card_admin", v: stats.admin },
          { k: "card_user", v: stats.user },
          { k: "card_system", v: stats.system },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-border/60 bg-card/70 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{L.t(c.k)}</div>
            <div className="mt-1 font-[Fraunces] text-2xl font-semibold text-foreground">{c.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-card/60 p-1 text-xs">
        {[
          { k: "all", label: L.t("tab_all"), icon: ScrollText },
          { k: "security", label: L.t("tab_security"), icon: ShieldAlert },
          { k: "system", label: L.t("tab_system"), icon: Server },
          { k: "archive", label: L.t("tab_archive"), icon: Archive },
        ].map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k as MainTab)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${tab === k ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted/60"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Security summary block */}
      {tab === "security" && (
        <div className="rounded-xl border border-border/60 bg-card/70 p-4">
          <div className="mb-3 font-[Fraunces] text-base font-semibold">{L.t("sec_title")}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              { k: "sec_failed_logins", v: securityCounts.failedLogins },
              { k: "sec_blocked", v: securityCounts.blocked },
              { k: "sec_permission", v: securityCounts.permission },
              { k: "sec_multi_attempts", v: securityCounts.multi },
              { k: "sec_suspicious", v: securityCounts.suspicious },
              { k: "sec_priv_changes", v: securityCounts.priv },
            ].map((c) => (
              <div key={c.k} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{L.t(c.k)}</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System summary block */}
      {tab === "system" && (
        <div className="rounded-xl border border-border/60 bg-card/70 p-4">
          <div className="mb-3 font-[Fraunces] text-base font-semibold">{L.t("sys_title")}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {systemServices.map((s) => (
              <div key={s.key} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="text-xs font-medium text-foreground">{L.t(s.key)}</div>
                <div className="mt-1 text-xl font-semibold text-primary">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "archive" && (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          {L.t("archive_hint")}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-border/60 bg-card/70 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L.t("search_placeholder")}
            className="w-full rounded-md border border-border/60 bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_from")}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_to")}
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_type")}
            <select value={typeF} onChange={(e) => setTypeF(e.target.value as any)} className={inputCls}>
              <option value="all">{L.t("f_all")}</option>
              {AUDIT_EVENT_TYPES.map((t) => <option key={t} value={t}>{L.tType(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_severity")}
            <select value={sevF} onChange={(e) => setSevF(e.target.value as any)} className={inputCls}>
              <option value="all">{L.t("f_all")}</option>
              {AUDIT_SEVERITIES.map((t) => <option key={t} value={t}>{L.tSev(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_role")}
            <select value={roleF} onChange={(e) => setRoleF(e.target.value as any)} className={inputCls}>
              <option value="all">{L.t("f_all")}</option>
              {AUDIT_ROLES.map((t) => <option key={t} value={t}>{L.tRole(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_module")}
            <select value={modF} onChange={(e) => setModF(e.target.value as any)} className={inputCls}>
              <option value="all">{L.t("f_all")}</option>
              {AUDIT_MODULES.map((t) => <option key={t} value={t}>{L.tMod(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_status")}
            <select value={resF} onChange={(e) => setResF(e.target.value as any)} className={inputCls}>
              <option value="all">{L.t("f_all")}</option>
              {AUDIT_RESULTS.map((t) => <option key={t} value={t}>{L.tRes(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_country")}
            <input value={countryF} onChange={(e) => setCountryF(e.target.value)} placeholder="DE / FR / UA…" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            {L.t("f_language")}
            <select value={langF} onChange={(e) => setLangF(e.target.value as any)} className={inputCls}>
              <option value="all">{L.t("f_all")}</option>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
          <div className="col-span-2 flex items-end md:col-span-1">
            <button className={btnBase} onClick={resetFilters}>{L.t("btn_reset")}</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/70">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/40 text-left uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{L.t("col_id")}</th>
              <th className="px-3 py-2">{L.t("col_date")}</th>
              <th className="px-3 py-2">{L.t("col_time")}</th>
              <th className="px-3 py-2">{L.t("col_user")}</th>
              <th className="px-3 py-2">{L.t("col_role")}</th>
              <th className="px-3 py-2">{L.t("col_module")}</th>
              <th className="px-3 py-2">{L.t("col_action")}</th>
              <th className="px-3 py-2">{L.t("col_result")}</th>
              <th className="px-3 py-2">{L.t("col_severity")}</th>
              <th className="px-3 py-2">{L.t("col_ip")}</th>
              <th className="px-3 py-2">{L.t("col_country")}</th>
              <th className="px-3 py-2">{L.t("col_device")}</th>
              <th className="px-3 py-2">{L.t("col_browser")}</th>
              <th className="px-3 py-2">{L.t("col_language")}</th>
              <th className="px-3 py-2 text-right">{L.t("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={15} className="px-3 py-10 text-center text-muted-foreground">{L.t("empty")}</td></tr>
            )}
            {filtered.map((e) => {
              const f = fmt(e.createdAt);
              return (
                <tr key={e.id} className="border-t border-border/50 hover:bg-muted/40">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground">{highlight(e.id, query)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{f.date}</td>
                  <td className="whitespace-nowrap px-3 py-2">{f.time}</td>
                  <td className="max-w-[180px] truncate px-3 py-2">
                    <div className="truncate font-medium text-foreground">{highlight(e.actorName, query)}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{highlight(e.actorEmail, query)}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{L.tRole(e.role)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{L.tMod(e.module)}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-foreground">{highlight(e.action, query)}</td>
                  <td className="whitespace-nowrap px-3 py-2"><span className={`${badgeBase} ${RESULT_TONE[e.result]}`}>{L.tRes(e.result)}</span></td>
                  <td className="whitespace-nowrap px-3 py-2"><span className={`${badgeBase} ${SEVERITY_TONE[e.severity]}`}>{L.tSev(e.severity)}</span></td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-muted-foreground">{highlight(e.ip, query)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{e.country}</td>
                  <td className="whitespace-nowrap px-3 py-2">{e.device}</td>
                  <td className="whitespace-nowrap px-3 py-2">{e.browser}</td>
                  <td className="whitespace-nowrap px-3 py-2 uppercase">{e.language}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button title={L.t("btn_view")} className={btnBase} onClick={() => setSelected(e)}><Eye className="h-3.5 w-3.5" /></button>
                      {e.archived ? (
                        <>
                          <button title={L.t("btn_restore")} className={btnBase} onClick={() => restore(e.id)}><ArchiveRestore className="h-3.5 w-3.5" /></button>
                          <button title={L.t("btn_delete")} className={btnBase} onClick={() => { removeForever(e.id); flash("✓"); }}><Trash2 className="h-3.5 w-3.5" /></button>
                        </>
                      ) : (
                        <button title={L.t("btn_archive_action")} className={btnBase} onClick={() => archive(e.id)}><Archive className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)} title={`${L.t("detail_title")} · ${selected.id}`}>
          <DetailBody event={selected} L={L} />
        </Modal>
      )}

      {/* Export modal */}
      {exportOpen && (
        <Modal onClose={() => setExportOpen(false)} title={L.t("export_title")}>
          <ExportBody L={L} onDone={() => { setExportOpen(false); flash(L.t("export_ready")); }} />
        </Modal>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)} title={L.t("settings_title")}>
          <SettingsBody L={L} settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 shadow dark:text-emerald-100">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal & sub-panels
// ---------------------------------------------------------------------------

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border/60 bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
          <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">{title}</h2>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function DetailBody({ event, L }: { event: AuditRecord; L: ReturnType<typeof useLocalAudit> }) {
  const f = fmt(event.createdAt);
  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"} ${SEVERITY_TONE[event.severity]}`}>{L.tSev(event.severity)}</span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${RESULT_TONE[event.result]}`}>{L.tRes(event.result)}</span>
        <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{L.tType(event.type)}</span>
        <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{L.tMod(event.module)}</span>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{L.t("detail_description")}</div>
        <div className="mt-1 text-foreground">{event.action}</div>
        <p className="mt-1 text-muted-foreground">{event.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={L.t("detail_initiator")}>
          <div className="font-medium text-foreground">{event.actorName}</div>
          <div className="text-xs text-muted-foreground">{event.actorEmail} · {L.tRole(event.role)}</div>
        </Field>
        <Field label={L.t("detail_timestamp")}>{f.full}</Field>
        <Field label={L.t("detail_context")}>
          <div className="text-xs text-muted-foreground">
            IP: <span className="font-mono">{event.ip}</span> · {event.country || "—"}<br />
            {event.device} · {event.browser}<br />
            {L.t("f_language")}: {event.language.toUpperCase()}
          </div>
        </Field>
        <Field label={L.t("detail_session")}>
          <span className="font-mono text-xs">{event.relations.sessionId || "—"}</span>
        </Field>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{L.t("detail_changes")}</div>
        {event.changes.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">{L.t("detail_no_changes")}</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-lg border border-border/60">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-3 py-1.5">Field</th><th className="px-3 py-1.5">Old</th><th className="px-3 py-1.5">New</th></tr>
              </thead>
              <tbody>
                {event.changes.map((c, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-3 py-1.5 font-medium text-foreground">{c.field}</td>
                    <td className="px-3 py-1.5 text-muted-foreground line-through">{c.oldValue}</td>
                    <td className="px-3 py-1.5 text-emerald-700 dark:text-emerald-300">{c.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{L.t("detail_related")}</div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <Rel label={L.t("detail_related_order")} value={event.relations.orderId} />
          <Rel label={L.t("detail_related_user")} value={event.relations.userId} />
          <Rel label={L.t("detail_related_payment")} value={event.relations.paymentId} />
          <Rel label={L.t("detail_related_notification")} value={event.relations.notificationId} />
          <Rel label={L.t("detail_related_promotion")} value={event.relations.promotionId} />
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{L.t("detail_notes")}</div>
        <textarea
          defaultValue={event.notes}
          placeholder={L.t("detail_notes_placeholder")}
          className="mt-1 h-20 w-full resize-none rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/60"
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function Rel({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-xs text-foreground">{value || "—"}</div>
    </div>
  );
}

type ExportFormat = "csv" | "excel" | "pdf";
type ExportScope = "current" | "selected" | "all";

function ExportBody({ L, onDone }: { L: ReturnType<typeof useLocalAudit>; onDone: () => void }) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>("current");
  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-muted-foreground">{L.t("export_note")}</p>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{L.t("export_format")}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["csv", "excel", "pdf"] as ExportFormat[]).map((f) => (
            <button key={f} onClick={() => setFormat(f)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium uppercase ${format === f ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{L.t("export_scope")}</div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          {([
            ["current", L.t("export_scope_current")],
            ["selected", L.t("export_scope_selected")],
            ["all", L.t("export_scope_all")],
          ] as [ExportScope, string][]).map(([k, lbl]) => (
            <button key={k} onClick={() => setScope(k)}
              className={`rounded-md border px-3 py-2 text-left text-xs font-medium ${scope === k ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 bg-background text-foreground hover:bg-muted/40"}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={onDone}><Download className="h-3.5 w-3.5" />{L.t("export_confirm")}</button>
      </div>
    </div>
  );
}

function SettingsBody({
  L, settings, onChange, onClose,
}: {
  L: ReturnType<typeof useLocalAudit>; settings: AuditSettings;
  onChange: (s: AuditSettings) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<AuditSettings>(settings);
  const toggles: [keyof AuditSettings, string][] = [
    ["logAdmin", "set_log_admin"],
    ["logUsers", "set_log_users"],
    ["logApi", "set_log_api"],
    ["logGenerator", "set_log_generator"],
    ["logTranslation", "set_log_translation"],
    ["logPayments", "set_log_payments"],
    ["logNotifications", "set_log_notifications"],
    ["logCalendar", "set_log_calendar"],
    ["securityAlerts", "set_alerts"],
  ];
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{L.t("set_retention")}</span>
          <input type="number" min={1} value={draft.retentionDays}
            onChange={(e) => setDraft({ ...draft, retentionDays: Math.max(1, Number(e.target.value) || 0) })}
            className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{L.t("set_archive_after")}</span>
          <input type="number" min={1} value={draft.archiveAfterDays}
            onChange={(e) => setDraft({ ...draft, archiveAfterDays: Math.max(1, Number(e.target.value) || 0) })}
            className={inputCls} />
        </label>
      </div>
      <div className="space-y-1.5">
        {toggles.map(([k, i18nKey]) => (
          <label key={k} className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
            <span>{L.t(i18nKey)}</span>
            <input type="checkbox" checked={draft[k] as boolean}
              onChange={(e) => setDraft({ ...draft, [k]: e.target.checked } as AuditSettings)}
              className="h-4 w-4 accent-primary" />
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button className={btnBase} onClick={onClose}>{L.t("btn_close")}</button>
        <button className={btnPrimary} onClick={() => { onChange(draft); onClose(); }}>{L.t("btn_save")}</button>
      </div>
    </div>
  );
}

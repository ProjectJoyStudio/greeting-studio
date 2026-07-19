import { useMemo, useState, type ReactNode } from "react";
import {
  Save, RefreshCw, Activity, Database, ShieldCheck, Globe, Server, Wrench,
  BellRing, Info, HardDrive, Download, RotateCcw, Trash2, Eye, X, Search,
  AlertTriangle, CheckCircle2, XCircle, LogOut, ChevronRight,
} from "lucide-react";

import { useI18n, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";
import {
  DEFAULT_PLATFORM_SETTINGS,
  SUPPORTED_CURRENCIES, SUPPORTED_TIMEZONES, DATE_FORMATS, TIME_FORMATS,
  WEEK_STARTS, COUNTRY_CODES,
  validateGeneral, formatDate, formatDateTime, statusTone, progressTone,
  type PlatformSettingsState, type IndicatorStatus, type BackupRecord,
  type MonitoringCheck, type BackupType,
} from "@/lib/admin/platform-settings";
import { useLocalPlatform } from "./i18n";

// ---------- shared classes ----------
const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60";
const labelCls = "text-xs font-medium uppercase tracking-wide text-muted-foreground";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90";
const cardCls =
  "rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur";

type TabKey =
  | "general" | "domain" | "server" | "maintenance"
  | "backup" | "security" | "monitoring" | "info";

const TABS: { key: TabKey; icon: typeof Save; labelKey: string; catKey: string }[] = [
  { key: "general",     icon: Wrench,      labelKey: "tab_general",     catKey: "cat_general" },
  { key: "domain",      icon: Globe,       labelKey: "tab_domain",      catKey: "cat_domain" },
  { key: "server",      icon: Server,      labelKey: "tab_server",      catKey: "cat_server" },
  { key: "maintenance", icon: BellRing,    labelKey: "tab_maintenance", catKey: "cat_maintenance" },
  { key: "backup",      icon: HardDrive,   labelKey: "tab_backup",      catKey: "cat_backup" },
  { key: "security",    icon: ShieldCheck, labelKey: "tab_security",    catKey: "cat_security" },
  { key: "monitoring",  icon: Activity,    labelKey: "tab_monitoring",  catKey: "cat_monitoring" },
  { key: "info",        icon: Info,        labelKey: "tab_info",        catKey: "cat_info" },
];

function StatusPill({ status, label }: { status: IndicatorStatus; label: string }) {
  const icon = status === "online" ? CheckCircle2 : status === "warning" ? AlertTriangle : XCircle;
  const Icon = icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(status)}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 rounded-lg border border-border/60 bg-card px-4 py-2 text-sm shadow-lg"
      onAnimationEnd={onDone}
    >
      {msg}
    </div>
  );
}

function Field({
  label, hint, error, children,
}: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className={labelCls}>{label}</div>
      {children}
      {hint && !error ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
      {error ? <div className="text-[11px] text-rose-600">{error}</div> : null}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full ${progressTone(v)}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function PlatformSettingsPage() {
  const { lang } = useI18n();
  const { t } = useLocalPlatform(lang);

  const [state, setState] = useState<PlatformSettingsState>(() =>
    JSON.parse(JSON.stringify(DEFAULT_PLATFORM_SETTINGS)),
  );
  const [tab, setTab] = useState<TabKey>("general");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [maintenancePreview, setMaintenancePreview] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const errors = useMemo(() => validateGeneral(state.general), [state.general]);
  const errorMap = useMemo(
    () => Object.fromEntries(errors.map((e) => [e.field, e.messageKey])),
    [errors],
  );

  function showToast(key: string) {
    setToast(t(key));
    setTimeout(() => setToast(null), 2400);
  }
  function update<K extends keyof PlatformSettingsState>(
    key: K, mut: (draft: PlatformSettingsState[K]) => PlatformSettingsState[K],
  ) {
    setState((s) => ({ ...s, [key]: mut(s[key]) }));
  }

  function handleSave() {
    if (errors.length > 0) return;
    showToast("saved_toast");
  }
  function handleRefresh() {
    // Randomize demo metrics slightly.
    update("server", (s) => ({
      ...s,
      cpuPercent: Math.max(5, Math.min(95, s.cpuPercent + (Math.random() * 16 - 8) | 0)),
      ramPercent: Math.max(5, Math.min(95, s.ramPercent + (Math.random() * 12 - 6) | 0)),
    }));
    update("monitoring", (m) => m.map((c) => ({ ...c, lastCheck: new Date().toISOString() })));
    showToast("refreshed_toast");
  }
  function handleCheck() {
    update("monitoring", (m) => m.map((c) => ({
      ...c,
      lastCheck: new Date().toISOString(),
      responseMs: Math.max(8, Math.round(c.responseMs * (0.7 + Math.random() * 0.6))),
    })));
    showToast("check_toast");
  }
  function handleCreateBackup() {
    const rec: BackupRecord = {
      id: `bkp_${Math.floor(Math.random() * 9000) + 1000}`,
      createdAt: new Date().toISOString(),
      sizeMb: 400 + Math.floor(Math.random() * 50),
      type: "full",
      automatic: false,
    };
    update("backup", (b) => ({ ...b, history: [rec, ...b.history].slice(0, 12) }));
    showToast("backup_created_toast");
  }
  function handleRestoreDefaults() {
    setState(JSON.parse(JSON.stringify(DEFAULT_PLATFORM_SETTINGS)));
    showToast("restored_default_toast");
  }

  // Search: match tab labels & categories.
  const filteredTabs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TABS;
    return TABS.filter(({ labelKey, catKey }) =>
      t(labelKey).toLowerCase().includes(q) || t(catKey).toLowerCase().includes(q));
  }, [query, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-[Fraunces] text-3xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-1 text-xs text-amber-700">{t("demo_notice")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnBase} onClick={handleRefresh}><RefreshCw className="h-3.5 w-3.5" />{t("btn_refresh")}</button>
          <button className={btnBase} onClick={handleCheck}><Activity className="h-3.5 w-3.5" />{t("btn_check")}</button>
          <button className={btnBase} onClick={handleCreateBackup}><HardDrive className="h-3.5 w-3.5" />{t("btn_backup")}</button>
          <button className={btnPrimary} onClick={handleSave} disabled={errors.length > 0}>
            <Save className="h-3.5 w-3.5" />{t("btn_save")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_placeholder")}
          className="w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        {query.trim() && filteredTabs.length === 0 ? (
          <div className="mt-2 rounded-md border border-border/60 bg-card/70 px-3 py-2 text-xs text-muted-foreground">
            {t("search_no_results")}
          </div>
        ) : null}
        {query.trim() && filteredTabs.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {filteredTabs.map(({ key, labelKey, catKey, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setTab(key); setQuery(""); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-xs hover:bg-muted/50"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-medium">{t(labelKey)}</span>
                <span className="text-muted-foreground">· {t(catKey)}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-1">
        {TABS.map(({ key, icon: Icon, labelKey }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-border/60 bg-card text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "general" && (
        <div className={cardCls}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("g_platform_name")} error={errorMap.platformName && t(errorMap.platformName)}>
              <input className={inputCls} value={state.general.platformName}
                onChange={(e) => update("general", (g) => ({ ...g, platformName: e.target.value }))} />
            </Field>
            <Field label={t("g_logo")} hint={t("g_logo_hint")}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/50 font-[Fraunces] text-lg font-semibold text-primary">
                  {state.general.logoPlaceholder}
                </div>
                <input className={inputCls} value={state.general.logoPlaceholder}
                  onChange={(e) => update("general", (g) => ({ ...g, logoPlaceholder: e.target.value.slice(0, 4) }))} />
              </div>
            </Field>
            <Field label={t("g_platform_description")}>
              <textarea rows={3} className={inputCls} value={state.general.platformDescription}
                onChange={(e) => update("general", (g) => ({ ...g, platformDescription: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("g_support_email")} error={errorMap.supportEmail && t(errorMap.supportEmail)}>
                <input className={inputCls} type="email" value={state.general.supportEmail}
                  onChange={(e) => update("general", (g) => ({ ...g, supportEmail: e.target.value }))} />
              </Field>
              <Field label={t("g_notification_email")} error={errorMap.notificationEmail && t(errorMap.notificationEmail)}>
                <input className={inputCls} type="email" value={state.general.notificationEmail}
                  onChange={(e) => update("general", (g) => ({ ...g, notificationEmail: e.target.value }))} />
              </Field>
              <Field label={t("g_support_phone")}>
                <input className={inputCls} value={state.general.supportPhone}
                  onChange={(e) => update("general", (g) => ({ ...g, supportPhone: e.target.value }))} />
              </Field>
            </div>
            <Field label={t("g_default_language")}>
              <select className={inputCls} value={state.general.defaultLanguage}
                onChange={(e) => update("general", (g) => ({ ...g, defaultLanguage: e.target.value as Lang }))}>
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </Field>
            <Field label={t("g_default_currency")}>
              <select className={inputCls} value={state.general.defaultCurrency}
                onChange={(e) => update("general", (g) => ({ ...g, defaultCurrency: e.target.value as typeof SUPPORTED_CURRENCIES[number] }))}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t("g_default_country")}>
              <select className={inputCls} value={state.general.defaultCountry}
                onChange={(e) => update("general", (g) => ({ ...g, defaultCountry: e.target.value as typeof COUNTRY_CODES[number] }))}>
                {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t("g_default_timezone")}>
              <select className={inputCls} value={state.general.defaultTimezone}
                onChange={(e) => update("general", (g) => ({ ...g, defaultTimezone: e.target.value as typeof SUPPORTED_TIMEZONES[number] }))}>
                {SUPPORTED_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Field>
            <Field label={t("g_date_format")}>
              <select className={inputCls} value={state.general.dateFormat}
                onChange={(e) => update("general", (g) => ({ ...g, dateFormat: e.target.value as typeof DATE_FORMATS[number] }))}>
                {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label={t("g_time_format")}>
              <select className={inputCls} value={state.general.timeFormat}
                onChange={(e) => update("general", (g) => ({ ...g, timeFormat: e.target.value as typeof TIME_FORMATS[number] }))}>
                {TIME_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label={t("g_week_start")}>
              <select className={inputCls} value={state.general.weekStart}
                onChange={(e) => update("general", (g) => ({ ...g, weekStart: e.target.value as typeof WEEK_STARTS[number] }))}>
                {WEEK_STARTS.map((w) => <option key={w} value={w}>{t(`week_${w}`)}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button className={btnBase} onClick={handleRestoreDefaults}>
              <RotateCcw className="h-3.5 w-3.5" />{t("btn_restore_default")}
            </button>
            <button className={btnPrimary} onClick={handleSave} disabled={errors.length > 0}>
              <Save className="h-3.5 w-3.5" />{t("btn_save")}
            </button>
          </div>
        </div>
      )}

      {tab === "domain" && (
        <div className={cardCls}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("d_primary")}>
              <input className={inputCls} value={state.domain.primaryDomain}
                onChange={(e) => update("domain", (d) => ({ ...d, primaryDomain: e.target.value }))} />
            </Field>
            <Field label={t("d_testing")}>
              <input className={inputCls} value={state.domain.testingDomain}
                onChange={(e) => update("domain", (d) => ({ ...d, testingDomain: e.target.value }))} />
            </Field>
            <Field label={t("d_ssl_status")}>
              <StatusPill status={state.domain.sslStatus} label={t(`status_${state.domain.sslStatus}`)} />
            </Field>
            <Field label={t("d_ssl_expires")}>
              <div className="text-sm">{formatDate(state.domain.sslExpiresAt)}</div>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.domain.httpsEnabled}
                onChange={(e) => update("domain", (d) => ({ ...d, httpsEnabled: e.target.checked }))} />
              {t("d_https_enabled")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.domain.httpRedirect}
                onChange={(e) => update("domain", (d) => ({ ...d, httpRedirect: e.target.checked }))} />
              {t("d_http_redirect")}
            </label>
            <Field label={t("d_verification")}>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                state.domain.verificationStatus === "verified" ? statusTone("online")
                : state.domain.verificationStatus === "pending" ? statusTone("warning")
                : statusTone("error")}`}>
                {t(state.domain.verificationStatus)}
              </span>
            </Field>
          </div>
          <div className="mt-5">
            <div className={labelCls}>{t("d_dns_records")}</div>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("d_dns_type")}</th>
                    <th className="px-3 py-2 text-left">{t("d_dns_host")}</th>
                    <th className="px-3 py-2 text-left">{t("d_dns_value")}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.domain.dnsRecordsPlaceholder.map((r, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono">{r.type}</td>
                      <td className="px-3 py-2 font-mono">{r.host}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button className={btnBase} onClick={() => showToast("check_toast")}><Globe className="h-3.5 w-3.5" />{t("btn_verify_domain")}</button>
            <button className={btnBase} onClick={() => showToast("check_toast")}><ShieldCheck className="h-3.5 w-3.5" />{t("btn_check_ssl")}</button>
            <button className={btnBase} onClick={() => showToast("check_toast")}><Activity className="h-3.5 w-3.5" />{t("btn_test_https")}</button>
          </div>
        </div>
      )}

      {tab === "server" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <span className={labelCls}>{t("s_status")}</span>
              <StatusPill status={state.server.status} label={t(`status_${state.server.status}`)} />
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {t("s_uptime")}: <span className="font-medium text-foreground">{state.server.uptimeDays} {t("s_days")}</span>
            </div>
          </div>
          <div className={cardCls}>
            <div className={labelCls}>{t("s_cpu")}</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">{state.server.cpuPercent}%</div>
            <Progress value={state.server.cpuPercent} />
          </div>
          <div className={cardCls}>
            <div className={labelCls}>{t("s_ram")}</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">{state.server.ramPercent}%</div>
            <Progress value={state.server.ramPercent} />
          </div>
          <div className={cardCls}>
            <div className={labelCls}>{t("s_storage")}</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">{state.server.storagePercent}%</div>
            <Progress value={state.server.storagePercent} />
          </div>
          <div className={cardCls}>
            <div className={labelCls}>{t("s_os")}</div>
            <div className="mt-1 text-sm font-medium">{state.server.operatingSystem}</div>
            <div className={`${labelCls} mt-3`}>{t("s_node")}</div>
            <div className="mt-1 text-sm font-medium">{state.server.nodeVersion}</div>
          </div>
          <div className={cardCls}>
            <div className={labelCls}>{t("s_db")}</div>
            <div className="mt-1 text-sm font-medium">{state.server.databaseVersion}</div>
          </div>
        </div>
      )}

      {tab === "maintenance" && (
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={labelCls}>{t("m_enabled")}</div>
              <div className="mt-1 text-sm">
                {state.maintenance.enabled ? (
                  <StatusPill status="warning" label={t("status_warning")} />
                ) : (
                  <StatusPill status="online" label={t("status_online")} />
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className={btnBase} onClick={() => update("maintenance", (m) => ({ ...m, enabled: true }))}>
                {t("btn_enable")}
              </button>
              <button className={btnBase} onClick={() => update("maintenance", (m) => ({ ...m, enabled: false }))}>
                {t("btn_disable")}
              </button>
              <button className={btnBase} onClick={() => setMaintenancePreview(true)}>
                <Eye className="h-3.5 w-3.5" />{t("btn_preview")}
              </button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.maintenance.adminsOnly}
                onChange={(e) => update("maintenance", (m) => ({ ...m, adminsOnly: e.target.checked }))} />
              {t("m_admins_only")}
            </label>
            <Field label={t("m_scheduled_end")}>
              <input type="datetime-local" className={inputCls} value={state.maintenance.scheduledEnd.slice(0, 16)}
                onChange={(e) => update("maintenance", (m) => ({ ...m, scheduledEnd: e.target.value }))} />
            </Field>
            <div className="md:col-span-2">
              <Field label={t("m_message")}>
                <textarea rows={3} className={inputCls} value={state.maintenance.message}
                  onChange={(e) => update("maintenance", (m) => ({ ...m, message: e.target.value }))} />
              </Field>
            </div>
          </div>
          {maintenancePreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                  <h3 className="font-[Fraunces] text-lg font-semibold">{t("m_preview_title")}</h3>
                  <button className={btnBase} onClick={() => setMaintenancePreview(false)}><X className="h-4 w-4" /></button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-8 text-center">
                  <Wrench className="mx-auto h-10 w-10 text-primary" />
                  <h4 className="mt-4 font-[Fraunces] text-2xl font-semibold text-foreground">
                    {state.general.platformName}
                  </h4>
                  <p className="mt-3 text-sm text-muted-foreground">{state.maintenance.message}</p>
                  <p className="mt-6 text-[11px] text-amber-700">{t("m_preview_note")}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "backup" && (
        <div className="space-y-4">
          <div className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={labelCls}>{t("b_schedule")}</div>
              <div className="flex gap-2">
                <button className={btnPrimary} onClick={handleCreateBackup}><HardDrive className="h-3.5 w-3.5" />{t("btn_backup")}</button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={state.backup.daily}
                  onChange={(e) => update("backup", (b) => ({ ...b, daily: e.target.checked }))} />
                {t("b_daily")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={state.backup.weekly}
                  onChange={(e) => update("backup", (b) => ({ ...b, weekly: e.target.checked }))} />
                {t("b_weekly")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={state.backup.monthly}
                  onChange={(e) => update("backup", (b) => ({ ...b, monthly: e.target.checked }))} />
                {t("b_monthly")}
              </label>
              <Field label={t("b_retention")}>
                <input type="number" min={1} max={365} className={inputCls} value={state.backup.retentionDays}
                  onChange={(e) => update("backup", (b) => ({ ...b, retentionDays: Number(e.target.value) || 1 }))} />
              </Field>
            </div>
          </div>
          <div className={cardCls}>
            <div className={labelCls}>{t("b_history")}</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">{t("b_date")}</th>
                    <th className="px-3 py-2 text-left">{t("b_size")}</th>
                    <th className="px-3 py-2 text-left">{t("b_type")}</th>
                    <th className="px-3 py-2 text-left">{t("b_source")}</th>
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {state.backup.history.map((b) => (
                    <tr key={b.id} className="border-b border-border/40">
                      <td className="px-3 py-2 font-mono">{b.id}</td>
                      <td className="px-3 py-2">{formatDateTime(b.createdAt)}</td>
                      <td className="px-3 py-2">{b.sizeMb} MB</td>
                      <td className="px-3 py-2">{t(`b_type_${b.type as BackupType}`)}</td>
                      <td className="px-3 py-2">{b.automatic ? t("b_auto") : t("b_manual")}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button className={btnBase} onClick={() => showToast("check_toast")}><Download className="h-3 w-3" />{t("btn_download")}</button>
                          <button className={btnBase} onClick={() => showToast("check_toast")}><RotateCcw className="h-3 w-3" />{t("btn_restore")}</button>
                          <button className={btnBase}
                            onClick={() => update("backup", (bk) => ({ ...bk, history: bk.history.filter((x) => x.id !== b.id) }))}>
                            <Trash2 className="h-3 w-3" />{t("btn_delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={labelCls}>{t("sec_status")}</div>
              <div className="mt-1"><StatusPill status={state.security.status} label={t(`status_${state.security.status}`)} /></div>
            </div>
            <div className="text-xs text-muted-foreground">
              {t("sec_last_scan")}: <span className="font-medium text-foreground">{formatDateTime(state.security.lastSecurityScan)}</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.security.twoFactorEnabled}
                onChange={(e) => update("security", (s) => ({ ...s, twoFactorEnabled: e.target.checked }))} />
              {t("sec_2fa")}
            </label>
            <Field label={t("sec_min_len")}>
              <input type="number" min={6} max={64} className={inputCls} value={state.security.passwordMinLength}
                onChange={(e) => update("security", (s) => ({ ...s, passwordMinLength: Number(e.target.value) || 6 }))} />
            </Field>
            <Field label={t("sec_complexity")}>
              <select className={inputCls} value={state.security.passwordComplexity}
                onChange={(e) => update("security", (s) => ({ ...s, passwordComplexity: e.target.value as any }))}>
                <option value="basic">{t("sec_complexity_basic")}</option>
                <option value="standard">{t("sec_complexity_standard")}</option>
                <option value="strong">{t("sec_complexity_strong")}</option>
              </select>
            </Field>
            <Field label={t("sec_max_attempts")}>
              <input type="number" min={1} max={20} className={inputCls} value={state.security.maxLoginAttempts}
                onChange={(e) => update("security", (s) => ({ ...s, maxLoginAttempts: Number(e.target.value) || 1 }))} />
            </Field>
            <Field label={t("sec_auto_lock")}>
              <input type="number" min={1} max={1440} className={inputCls} value={state.security.autoLockMinutes}
                onChange={(e) => update("security", (s) => ({ ...s, autoLockMinutes: Number(e.target.value) || 1 }))} />
            </Field>
            <Field label={t("sec_session_timeout")}>
              <input type="number" min={5} max={1440} className={inputCls} value={state.security.sessionTimeoutMinutes}
                onChange={(e) => update("security", (s) => ({ ...s, sessionTimeoutMinutes: Number(e.target.value) || 5 }))} />
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button className={btnBase} onClick={() => setConfirmLogout(true)}>
              <LogOut className="h-3.5 w-3.5" />{t("btn_logout_all")}
            </button>
            <button className={btnPrimary} onClick={handleSave}>
              <Save className="h-3.5 w-3.5" />{t("btn_save")}
            </button>
          </div>

          {confirmLogout && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
                <h3 className="font-[Fraunces] text-lg font-semibold">{t("btn_logout_all")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("sec_logout_confirm")}</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button className={btnBase} onClick={() => setConfirmLogout(false)}>{t("btn_close")}</button>
                  <button className={btnPrimary} onClick={() => { setConfirmLogout(false); showToast("saved_toast"); }}>
                    {t("btn_apply")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "monitoring" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.monitoring.map((m) => (
            <MonitoringCard key={m.kind} check={m} t={t} />
          ))}
        </div>
      )}

      {tab === "info" && (
        <div className={cardCls}>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            <Info className="h-3 w-3" /> {t("info_demo_label")}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoStat label={t("info_platform_version")} value={state.info.platformVersion} />
            <InfoStat label={t("info_admin_version")} value={state.info.adminVersion} />
            <InfoStat label={t("info_last_update")} value={formatDateTime(state.info.lastUpdate)} />
            <InfoStat label={t("info_avg_response")} value={`${state.info.avgResponseMs} ms`} />
            <InfoStat label={t("info_registered_users")} value={state.info.registeredUsers.toLocaleString()} />
            <InfoStat label={t("info_total_orders")} value={state.info.totalOrders.toLocaleString()} />
            <InfoStat label={t("info_catalog_items")} value={state.info.catalogItems.toLocaleString()} />
            <InfoStat label={t("info_total_generated")} value={state.info.totalDeliveries.toLocaleString()} />
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => { /* auto */ }} />}
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
      <div className={labelCls}>{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function MonitoringCard({ check, t }: { check: MonitoringCheck; t: (k: string) => string }) {
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <div className="font-[Fraunces] text-lg font-semibold text-foreground">{t(`mon_${check.kind}`)}</div>
        <StatusPill status={check.status} label={t(`status_${check.status}`)} />
      </div>
      <div className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>{t("mon_last_check")}</span>
          <span className="font-medium text-foreground">{formatDateTime(check.lastCheck)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t("mon_response")}</span>
          <span className="font-medium text-foreground">{check.responseMs} ms</span>
        </div>
      </div>
    </div>
  );
}
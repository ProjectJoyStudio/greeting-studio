import { useMemo, useState, type ReactNode } from "react";
import {
  Save, RefreshCw, Activity, Database, ShieldCheck, Globe, Server, Wrench,
  BellRing, Info, HardDrive, Download, RotateCcw, Trash2, Eye, X, Search,
  AlertTriangle, CheckCircle2, XCircle, LogOut, ChevronRight,
  Cpu, Scale, GitBranch, Languages, Type, Cloud, Plug, HeartPulse, Gauge, ScrollText,
  Plus, Power, Play, ArrowRightLeft,
} from "lucide-react";

import { useI18n, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";
import {
  DEFAULT_PLATFORM_SETTINGS, DEFAULT_PLATFORM_ADVANCED,
  TRANSLATION_PROVIDERS, computeBalancerLive,
  SUPPORTED_CURRENCIES, SUPPORTED_TIMEZONES, DATE_FORMATS, TIME_FORMATS,
  WEEK_STARTS, COUNTRY_CODES,
  validateGeneral, formatDate, formatDateTime, statusTone, progressTone,
  type PlatformSettingsState, type PlatformAdvancedState, type IndicatorStatus,
  type BackupRecord, type MonitoringCheck, type BackupType,
  type BalancerMode, type TranslationProvider,
  type HealthStatus, type LogCategory, type LogResult,
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
  | "backup" | "security" | "monitoring" | "info"
  | "generators" | "balancer" | "fallback" | "translations"
  | "overlay" | "storage" | "api" | "health" | "scaling" | "logs";

const TABS: { key: TabKey; icon: typeof Save; labelKey: string; catKey: string }[] = [
  { key: "general",     icon: Wrench,      labelKey: "tab_general",     catKey: "cat_general" },
  { key: "domain",      icon: Globe,       labelKey: "tab_domain",      catKey: "cat_domain" },
  { key: "server",      icon: Server,      labelKey: "tab_server",      catKey: "cat_server" },
  { key: "maintenance", icon: BellRing,    labelKey: "tab_maintenance", catKey: "cat_maintenance" },
  { key: "backup",      icon: HardDrive,   labelKey: "tab_backup",      catKey: "cat_backup" },
  { key: "security",    icon: ShieldCheck, labelKey: "tab_security",    catKey: "cat_security" },
  { key: "monitoring",  icon: Activity,    labelKey: "tab_monitoring",  catKey: "cat_monitoring" },
  { key: "info",        icon: Info,        labelKey: "tab_info",        catKey: "cat_info" },
  { key: "generators",  icon: Cpu,         labelKey: "tab_generators",  catKey: "cat_generators" },
  { key: "balancer",    icon: Scale,       labelKey: "tab_balancer",    catKey: "cat_balancer" },
  { key: "fallback",    icon: GitBranch,   labelKey: "tab_fallback",    catKey: "cat_fallback" },
  { key: "translations",icon: Languages,   labelKey: "tab_translations",catKey: "cat_translations" },
  { key: "overlay",     icon: Type,        labelKey: "tab_overlay",     catKey: "cat_overlay" },
  { key: "storage",     icon: Cloud,       labelKey: "tab_storage",     catKey: "cat_storage" },
  { key: "api",         icon: Plug,        labelKey: "tab_api",         catKey: "cat_api" },
  { key: "health",      icon: HeartPulse,  labelKey: "tab_health",      catKey: "cat_health" },
  { key: "scaling",     icon: Gauge,       labelKey: "tab_scaling",     catKey: "cat_scaling" },
  { key: "logs",        icon: ScrollText,  labelKey: "tab_logs",        catKey: "cat_logs" },
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
  const [adv, setAdv] = useState<PlatformAdvancedState>(() =>
    JSON.parse(JSON.stringify(DEFAULT_PLATFORM_ADVANCED)),
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
  function updateAdv<K extends keyof PlatformAdvancedState>(
    key: K, mut: (draft: PlatformAdvancedState[K]) => PlatformAdvancedState[K],
  ) {
    setAdv((s) => ({ ...s, [key]: mut(s[key]) }));
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

      {tab === "generators" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className={btnPrimary} onClick={() => showToast("saved_toast")}>
              <Plus className="h-3.5 w-3.5" />{t("gen_add")}
            </button>
          </div>
          <div className={cardCls}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="px-2 py-2 text-left">{t("gen_name")}</th>
                    <th className="px-2 py-2 text-left">{t("gen_type")}</th>
                    <th className="px-2 py-2 text-left">{t("gen_status")}</th>
                    <th className="px-2 py-2 text-right">{t("gen_priority")}</th>
                    <th className="px-2 py-2 text-left">{t("gen_load")}</th>
                    <th className="px-2 py-2 text-right">{t("gen_queue")}</th>
                    <th className="px-2 py-2 text-right">{t("gen_avg")}</th>
                    <th className="px-2 py-2 text-right">{t("gen_daily")}</th>
                    <th className="px-2 py-2 text-right">{t("gen_errors")}</th>
                    <th className="px-2 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {adv.generators.map((g) => (
                    <tr key={g.id} className="border-b border-border/40">
                      <td className="px-2 py-2 font-medium text-foreground">{g.name}</td>
                      <td className="px-2 py-2">{t(`gen_type_${g.type}`)}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(
                          g.status === "online" ? "online" : g.status === "busy" || g.status === "maintenance" ? "warning" : "error",
                        )}`}>
                          {t(`gen_status_${g.status}`)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">{g.priority}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full ${progressTone(g.loadPercent)}`} style={{ width: `${g.loadPercent}%` }} />
                          </div>
                          <span className="tabular-nums">{g.loadPercent}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{g.queue}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{g.avgSeconds}s</td>
                      <td className="px-2 py-2 text-right tabular-nums">{g.dailyRequests.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{g.errorRatePercent.toFixed(1)}%</td>
                      <td className="px-2 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button className={btnBase} onClick={() =>
                            updateAdv("generators", (list) => list.map((x) =>
                              x.id === g.id ? { ...x, enabled: !x.enabled, status: !x.enabled ? "online" : "offline" } : x,
                            ))}>
                            <Power className="h-3 w-3" />{g.enabled ? t("btn_disable") : t("btn_enable")}
                          </button>
                          <button className={btnBase} onClick={() => showToast("check_toast")}>
                            <Activity className="h-3 w-3" />{t("gen_test")}
                          </button>
                          <button className={btnBase} onClick={() => showToast("saved_toast")}>
                            <Info className="h-3 w-3" />{t("gen_stats")}
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

      {tab === "balancer" && (() => {
        const live = computeBalancerLive(adv.generators);
        return (
          <div className="space-y-4">
            <div className={cardCls}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={adv.balancer.enabled}
                  onChange={(e) => updateAdv("balancer", (b) => ({ ...b, enabled: e.target.checked }))} />
                {t("bal_enable")}
              </label>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t("bal_mode")}>
                  <select className={inputCls} value={adv.balancer.mode}
                    onChange={(e) => updateAdv("balancer", (b) => ({ ...b, mode: e.target.value as BalancerMode }))}>
                    {(["lowest_queue","fastest","round_robin","priority","cheapest"] as const).map((m) => (
                      <option key={m} value={m}>{t(`bal_mode_${m}`)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("bal_max_queue")}>
                  <input type="number" min={1} className={inputCls} value={adv.balancer.maxQueueLength}
                    onChange={(e) => updateAdv("balancer", (b) => ({ ...b, maxQueueLength: Number(e.target.value) || 1 }))} />
                </Field>
                <Field label={t("bal_max_conc")}>
                  <input type="number" min={1} className={inputCls} value={adv.balancer.maxConcurrent}
                    onChange={(e) => updateAdv("balancer", (b) => ({ ...b, maxConcurrent: Number(e.target.value) || 1 }))} />
                </Field>
                <Field label={t("bal_timeout")}>
                  <input type="number" min={5} className={inputCls} value={adv.balancer.queueTimeoutSeconds}
                    onChange={(e) => updateAdv("balancer", (b) => ({ ...b, queueTimeoutSeconds: Number(e.target.value) || 5 }))} />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={adv.balancer.autoOverflow}
                    onChange={(e) => updateAdv("balancer", (b) => ({ ...b, autoOverflow: e.target.checked }))} />
                  {t("bal_overflow")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={adv.balancer.autoFailover}
                    onChange={(e) => updateAdv("balancer", (b) => ({ ...b, autoFailover: e.target.checked }))} />
                  {t("bal_failover")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={adv.balancer.retryFailed}
                    onChange={(e) => updateAdv("balancer", (b) => ({ ...b, retryFailed: e.target.checked }))} />
                  {t("bal_retry")}
                </label>
              </div>
            </div>
            <div>
              <div className={`${labelCls} mb-2`}>{t("bal_live")}</div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <InfoStat label={t("bal_total")}     value={String(live.total)} />
                <InfoStat label={t("bal_active")}    value={String(live.active)} />
                <InfoStat label={t("bal_waiting")}   value={String(live.waiting)} />
                <InfoStat label={t("bal_running")}   value={String(live.running)} />
                <InfoStat label={t("bal_completed")} value={live.completedToday.toLocaleString()} />
                <InfoStat label={t("bal_failed")}    value={live.failedToday.toLocaleString()} />
              </div>
            </div>
          </div>
        );
      })()}

      {tab === "fallback" && (
        <div className="space-y-4">
          <div className={cardCls}>
            <p className="text-sm text-muted-foreground">{t("fb_intro")}</p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {(["primaryId","secondaryId","tertiaryId"] as const).map((slot, idx) => (
                <Field key={slot} label={t(idx === 0 ? "fb_primary" : idx === 1 ? "fb_secondary" : "fb_tertiary")}>
                  <select className={inputCls} value={adv.failover[slot]}
                    onChange={(e) => updateAdv("failover", (f) => ({ ...f, [slot]: e.target.value }))}>
                    {adv.generators.map((g) => (
                      <option key={g.id} value={g.id}>{g.name} · {t(`gen_type_${g.type}`)}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button className={btnBase} onClick={() => showToast("check_toast")}>
                <Play className="h-3.5 w-3.5" />{t("fb_test")}
              </button>
              <button className={btnBase} onClick={() => showToast("saved_toast")}>
                <ArrowRightLeft className="h-3.5 w-3.5" />{t("fb_manual")}
              </button>
            </div>
          </div>
          <div className={cardCls}>
            <div className={labelCls}>{t("fb_history")}</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="px-2 py-2 text-left">{t("b_date")}</th>
                    <th className="px-2 py-2 text-left">{t("fb_from")}</th>
                    <th className="px-2 py-2 text-left">{t("fb_to")}</th>
                    <th className="px-2 py-2 text-left">{t("fb_reason")}</th>
                  </tr>
                </thead>
                <tbody>
                  {adv.failover.history.map((h) => {
                    const from = adv.generators.find((x) => x.id === h.from)?.name ?? h.from;
                    const to = adv.generators.find((x) => x.id === h.to)?.name ?? h.to;
                    return (
                      <tr key={h.id} className="border-b border-border/40">
                        <td className="px-2 py-2">{formatDateTime(h.at)}</td>
                        <td className="px-2 py-2">{from}</td>
                        <td className="px-2 py-2">{to}</td>
                        <td className="px-2 py-2">{t(`fb_reason_${h.reason}`)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "translations" && (
        <div className={cardCls}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={adv.translation.enabled}
              onChange={(e) => updateAdv("translation", (tr) => ({ ...tr, enabled: e.target.checked }))} />
            {t("tr_enable")}
          </label>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("tr_primary")}>
              <select className={inputCls} value={adv.translation.primary}
                onChange={(e) => updateAdv("translation", (tr) => ({ ...tr, primary: e.target.value as TranslationProvider }))}>
                {TRANSLATION_PROVIDERS.map((p) => <option key={p} value={p}>{t(`tr_prov_${p}`)}</option>)}
              </select>
            </Field>
            <Field label={t("tr_backup")}>
              <select className={inputCls} value={adv.translation.backup}
                onChange={(e) => updateAdv("translation", (tr) => ({ ...tr, backup: e.target.value as TranslationProvider }))}>
                {TRANSLATION_PROVIDERS.map((p) => <option key={p} value={p}>{t(`tr_prov_${p}`)}</option>)}
              </select>
            </Field>
            <Field label={t("tr_retries")}>
              <input type="number" min={0} max={10} className={inputCls} value={adv.translation.maxRetries}
                onChange={(e) => updateAdv("translation", (tr) => ({ ...tr, maxRetries: Number(e.target.value) || 0 }))} />
            </Field>
            <Field label={t("tr_limit")}>
              <input type="number" min={0} className={inputCls} value={adv.translation.dailyLimit}
                onChange={(e) => updateAdv("translation", (tr) => ({ ...tr, dailyLimit: Number(e.target.value) || 0 }))} />
            </Field>
            {([
              ["autoDetectLanguage","tr_detect"],
              ["translateTitle","tr_title"],
              ["translateDescription","tr_desc"],
              ["translateGreeting","tr_greeting"],
              ["translateGeneratedText","tr_generated"],
            ] as const).map(([field, key]) => (
              <label key={field} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={adv.translation[field] as boolean}
                  onChange={(e) => updateAdv("translation", (tr) => ({ ...tr, [field]: e.target.checked }))} />
                {t(key)}
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button className={btnPrimary} onClick={handleSave}><Save className="h-3.5 w-3.5" />{t("btn_save")}</button>
          </div>
        </div>
      )}

      {tab === "overlay" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className={cardCls}>
            <p className="text-sm text-muted-foreground">{t("ov_intro")}</p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {([
                ["autoPosition","ov_auto_pos"],
                ["autoFontSize","ov_auto_font"],
                ["autoWrap","ov_auto_wrap"],
                ["shadow","ov_shadow"],
                ["outline","ov_outline"],
                ["languageSpecificFonts","ov_langfonts"],
              ] as const).map(([field, key]) => (
                <label key={field} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={adv.overlay[field] as boolean}
                    onChange={(e) => updateAdv("overlay", (o) => ({ ...o, [field]: e.target.checked }))} />
                  {t(key)}
                </label>
              ))}
              <Field label={t("ov_safe")}>
                <input type="number" min={0} max={40} className={inputCls} value={adv.overlay.safeMarginPercent}
                  onChange={(e) => updateAdv("overlay", (o) => ({ ...o, safeMarginPercent: Number(e.target.value) || 0 }))} />
              </Field>
              <Field label={t("ov_opacity")}>
                <input type="number" min={0} max={100} className={inputCls} value={adv.overlay.opacityPercent}
                  onChange={(e) => updateAdv("overlay", (o) => ({ ...o, opacityPercent: Number(e.target.value) || 0 }))} />
              </Field>
            </div>
          </div>
          <div className={cardCls}>
            <div className={labelCls}>{t("ov_preview")}</div>
            <div className="relative mt-3 aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-200 via-rose-300 to-plum-400" style={{ background: "linear-gradient(135deg,#f6d5a7,#f4a6a0,#b58bbf)" }}>
              <div className="absolute inset-0" style={{ padding: `${adv.overlay.safeMarginPercent}%` }}>
                <div className="flex h-full w-full items-center justify-center text-center">
                  <span
                    className="font-[Fraunces] text-white"
                    style={{
                      textShadow: adv.overlay.shadow ? "0 2px 6px rgba(0,0,0,0.55)" : "none",
                      WebkitTextStroke: adv.overlay.outline ? "1px rgba(0,0,0,0.55)" : "0",
                      opacity: adv.overlay.opacityPercent / 100,
                      fontSize: adv.overlay.autoFontSize ? "1.5rem" : "1.25rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {t("ov_sample")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "storage" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adv.storage.map((s) => {
            const pct = Math.round((s.usedGb / s.totalGb) * 100);
            return (
              <div key={s.id} className={cardCls}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-[Fraunces] text-lg font-semibold">{s.name}</div>
                    {s.primary && <div className="mt-0.5 text-[10px] uppercase tracking-wider text-amber-700">{t("st_primary")}</div>}
                  </div>
                  <StatusPill status={s.status} label={t(`status_${s.status}`)} />
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("st_used")}</span>
                    <span className="tabular-nums font-medium">{s.usedGb} / {s.totalGb} GB</span>
                  </div>
                  <Progress value={pct} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("st_files")}</span><span className="tabular-nums">{s.files.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("st_videos")}</span><span className="tabular-nums">{s.videos.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("st_images")}</span><span className="tabular-nums">{s.images.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("st_music")}</span><span className="tabular-nums">{s.music.toLocaleString()}</span></div>
                  <div className="flex justify-between col-span-2"><span className="text-muted-foreground">{t("st_backups")}</span><span className="tabular-nums">{s.backups.toLocaleString()}</span></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <button className={btnBase} onClick={() => showToast("check_toast")}><Activity className="h-3 w-3" />{t("st_test")}</button>
                  <button className={btnBase} onClick={() => showToast("saved_toast")}><RefreshCw className="h-3 w-3" />{t("st_reconnect")}</button>
                  <button className={btnBase} onClick={() => showToast("saved_toast")}><RotateCcw className="h-3 w-3" />{t("st_sync")}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "api" && (
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-2 py-2 text-left">{t("api_service")}</th>
                  <th className="px-2 py-2 text-left">{t("gen_status")}</th>
                  <th className="px-2 py-2 text-left">{t("api_key")}</th>
                  <th className="px-2 py-2 text-left">{t("api_last")}</th>
                  <th className="px-2 py-2 text-right">{t("api_response")}</th>
                  <th className="px-2 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {adv.apis.map((a) => (
                  <tr key={a.id} className="border-b border-border/40">
                    <td className="px-2 py-2 font-medium text-foreground">{a.service}</td>
                    <td className="px-2 py-2"><StatusPill status={a.status} label={t(`status_${a.status}`)} /></td>
                    <td className="px-2 py-2 font-mono text-muted-foreground">{a.apiKeyMasked}</td>
                    <td className="px-2 py-2">{formatDateTime(a.lastCheck)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{a.avgResponseMs ? `${a.avgResponseMs} ms` : "—"}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button className={btnBase} onClick={() =>
                          updateAdv("apis", (list) => list.map((x) => x.id === a.id ? { ...x, connected: !x.connected } : x))}>
                          <Plug className="h-3 w-3" />{a.connected ? t("api_disconnect") : t("api_connect")}
                        </button>
                        <button className={btnBase} onClick={() => showToast("check_toast")}><Activity className="h-3 w-3" />{t("api_test")}</button>
                        <button className={btnBase} onClick={() => { setTab("logs"); }}><ScrollText className="h-3 w-3" />{t("api_logs")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "health" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adv.health.map((h) => (
            <div key={h.kind} className={cardCls}>
              <div className="flex items-center justify-between">
                <div className="font-[Fraunces] text-base font-semibold text-foreground">{t(`h_${h.kind}`)}</div>
                <HealthPill status={h.status} t={t} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{h.message}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "scaling" && (
        <div className={cardCls}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={adv.scaling.enabled}
              onChange={(e) => updateAdv("scaling", (s) => ({ ...s, enabled: e.target.checked }))} />
            {t("sc_enable")}
          </label>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("sc_min")}>
              <input type="number" min={1} className={inputCls} value={adv.scaling.minGenerators}
                onChange={(e) => updateAdv("scaling", (s) => ({ ...s, minGenerators: Number(e.target.value) || 1 }))} />
            </Field>
            <Field label={t("sc_max")}>
              <input type="number" min={1} className={inputCls} value={adv.scaling.maxGenerators}
                onChange={(e) => updateAdv("scaling", (s) => ({ ...s, maxGenerators: Number(e.target.value) || 1 }))} />
            </Field>
            {([
              ["autoBalancing","sc_balance"],
              ["peakMode","sc_peak"],
              ["nightMode","sc_night"],
              ["holidayMode","sc_holiday"],
            ] as const).map(([field, key]) => (
              <label key={field} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={adv.scaling[field] as boolean}
                  onChange={(e) => updateAdv("scaling", (s) => ({ ...s, [field]: e.target.checked }))} />
                {t(key)}
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button className={btnPrimary} onClick={handleSave}><Save className="h-3.5 w-3.5" />{t("btn_save")}</button>
          </div>
        </div>
      )}

      {tab === "logs" && <LogsPanel logs={adv.logs} t={t} />}

      {toast && <Toast msg={toast} onDone={() => { /* auto */ }} />}
    </div>
  );
}

function HealthPill({ status, t }: { status: HealthStatus; t: (k: string) => string }) {
  const tone =
    status === "healthy" ? statusTone("online")
    : status === "warning" ? statusTone("warning")
    : statusTone("error");
  const Icon = status === "healthy" ? CheckCircle2 : status === "warning" ? AlertTriangle : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      <Icon className="h-3 w-3" />{t(`h_${status}`)}
    </span>
  );
}

function LogsPanel({ logs, t }: { logs: PlatformAdvancedState["logs"]; t: (k: string) => string }) {
  const CATS: LogCategory[] = ["generation", "translation", "storage", "api", "balancer"];
  const [cat, setCat] = useState<LogCategory>("generation");
  const filtered = logs.filter((l) => l.category === cat);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-1">
        {CATS.map((c) => {
          const active = cat === c;
          return (
            <button key={c} type="button" onClick={() => setCat(c)}
              className={`rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium transition ${
                active ? "border-border/60 bg-card text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {t(`logs_cat_${c}`)}
            </button>
          );
        })}
      </div>
      <div className={cardCls}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-2 py-2 text-left">{t("logs_time")}</th>
                <th className="px-2 py-2 text-left">{t("logs_service")}</th>
                <th className="px-2 py-2 text-left">{t("logs_action")}</th>
                <th className="px-2 py-2 text-right">{t("logs_duration")}</th>
                <th className="px-2 py-2 text-left">{t("logs_result")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">—</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border/40">
                  <td className="px-2 py-2">{formatDateTime(l.at)}</td>
                  <td className="px-2 py-2 font-medium text-foreground">{l.service}</td>
                  <td className="px-2 py-2 font-mono text-muted-foreground">{l.action}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {l.durationMs >= 1000 ? `${(l.durationMs / 1000).toFixed(1)}s` : `${l.durationMs} ms`}
                  </td>
                  <td className="px-2 py-2">
                    <LogResultBadge result={l.result} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LogResultBadge({ result, t }: { result: LogResult; t: (k: string) => string }) {
  const tone =
    result === "success" ? statusTone("online")
    : result === "warning" ? statusTone("warning")
    : statusTone("error");
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {t(`logs_res_${result}`)}
    </span>
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
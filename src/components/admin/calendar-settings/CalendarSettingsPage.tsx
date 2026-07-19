import { useMemo, useState } from "react";
import {
  Plus, RefreshCw, Eye, Pencil, Copy, Ban, Archive, X, AlertTriangle,
  Calendar as CalIcon, Clock, Bell, Send, Shield, Globe, History as HistoryIcon,
  LayoutGrid, Search, Pause, RotateCcw, Link2, Mail, MessageSquare, Users,
  Download, ChevronRight,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_EVENT_TYPES, DEMO_EVENTS, DEMO_HISTORY, DEFAULT_ACCESS,
  DEFAULT_REMINDER, DEFAULT_SAFETY, DEFAULT_HOLIDAY_SOURCES,
  DEFAULT_ADMIN_EVENTS, IANA_TIMEZONES, EVENT_STATUSES, STATUS_TONE,
  computeCalendarStats, nextEventId,
  type PersonalEvent, type EventTypeId, type EventStatus, type EventTypeConfig,
  type SubscriptionAccess, type ReminderSettings, type SafetyLimits,
  type HolidaySource, type HolidaySourceStatus, type AdminEvent,
  type SubscriptionTier, type Recurrence,
} from "@/lib/admin/calendar-settings";
import { useLocalCS, type CSKey } from "./i18n";

const input = "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btn = "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-40";
const btnPrimary = "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90";
const btnDanger = "inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-200";

type MainTab = "overview" | "types" | "reminders" | "delivery" | "subscription" | "timezones" | "holidays" | "safety" | "history";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
function fmtDay(iso: string) {
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }); }
  catch { return iso; }
}

function StatusBadge({ status, label }: { status: EventStatus; label: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}>{label}</span>;
}

export function CalendarSettingsPage() {
  const { lang } = useI18n();
  const T = useLocalCS(lang);

  const [tab, setTab] = useState<MainTab>("overview");
  const [events, setEvents] = useState<PersonalEvent[]>(() => [...DEMO_EVENTS]);
  const [types, setTypes] = useState<EventTypeConfig[]>(() => [...DEFAULT_EVENT_TYPES]);
  const [access, setAccess] = useState<SubscriptionAccess[]>(() => [...DEFAULT_ACCESS]);
  const [reminder, setReminder] = useState<ReminderSettings>({ ...DEFAULT_REMINDER });
  const [safety, setSafety] = useState<SafetyLimits>({ ...DEFAULT_SAFETY });
  const [sources, setSources] = useState<HolidaySource[]>(() => [...DEFAULT_HOLIDAY_SOURCES]);
  const [adminEvents] = useState<AdminEvent[]>(() => [...DEFAULT_ADMIN_EVENTS]);
  const [platformTz, setPlatformTz] = useState("Europe/Berlin");
  const [adminTz, setAdminTz] = useState("Europe/Berlin");
  const [dirty, setDirty] = useState(false);

  // filters
  const [query, setQuery] = useState("");
  const [typeF, setTypeF] = useState<"all" | EventTypeId>("all");
  const [statusF, setStatusF] = useState<"all" | EventStatus>("all");
  const [recF, setRecF] = useState<"all" | Recurrence>("all");
  const [sort, setSort] = useState<"upcoming" | "created">("upcoming");

  // modals
  const [view, setView] = useState<PersonalEvent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<{ msg: string; onOk: () => void } | null>(null);

  const stats = useMemo(() => computeCalendarStats(events), [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = events.filter(e => {
      if (typeF !== "all" && e.eventType !== typeF) return false;
      if (statusF !== "all" && e.status !== statusF) return false;
      if (recF !== "all" && e.recurrence !== recF) return false;
      if (q) {
        const hay = `${e.id} ${e.customer} ${e.recipient} ${e.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "upcoming") return +new Date(a.date) - +new Date(b.date);
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
    return list;
  }, [events, query, typeF, statusF, recF, sort]);

  const resetFilters = () => { setQuery(""); setTypeF("all"); setStatusF("all"); setRecF("all"); };

  const patchEvent = (id: string, patch: Partial<PersonalEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const createTest = () => {
    const now = new Date();
    const in3 = new Date(); in3.setDate(now.getDate() + 3);
    const ev: PersonalEvent = {
      id: nextEventId(events), customer: "Demo Customer",
      eventType: "birthday", name: "Demonstration Birthday",
      recipient: "Demo Recipient", date: in3.toISOString(),
      recurrence: "yearly", timezone: "Europe/Berlin", recipientTimezone: "Europe/Berlin",
      reminderDaysBefore: [3], reminderChannel: "email", reminderPaused: false,
      scheduledGift: true, deliveryChannel: "email", deliveryWindow: "morning",
      status: "scheduled", subscription: "yearly", country: "DE", language: "en",
      attempts: [], createdAt: now.toISOString(),
    };
    setEvents(prev => [ev, ...prev]);
  };

  const typeLabel = (id: EventTypeId): string => T(`et_${id}` as CSKey);
  const statusLabel = (s: EventStatus): string => T(`st_${s}` as CSKey);
  const recLabel = (r: Recurrence): string => T(`rc_${r}` as CSKey);

  const TABS: { id: MainTab; icon: typeof CalIcon; key: CSKey }[] = [
    { id: "overview", icon: LayoutGrid, key: "cs_tab_overview" },
    { id: "types", icon: CalIcon, key: "cs_tab_types" },
    { id: "reminders", icon: Bell, key: "cs_tab_reminders" },
    { id: "delivery", icon: Send, key: "cs_tab_delivery" },
    { id: "subscription", icon: Users, key: "cs_tab_subscription" },
    { id: "timezones", icon: Clock, key: "cs_tab_timezones" },
    { id: "holidays", icon: Globe, key: "cs_tab_holidays" },
    { id: "safety", icon: Shield, key: "cs_tab_safety" },
    { id: "history", icon: HistoryIcon, key: "cs_tab_history" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{T("cs_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{T("cs_subtitle")}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-100/60 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
            <AlertTriangle className="h-3 w-3" /> {T("cs_demo_note")}
          </p>
          {dirty && <p className="mt-1 text-xs font-medium text-amber-600">{T("cs_unsaved")}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnPrimary} onClick={createTest}><Plus className="h-3.5 w-3.5" />{T("cs_create_test")}</button>
          <button className={btn} onClick={() => setEvents([...DEMO_EVENTS])}><RefreshCw className="h-3.5 w-3.5" />{T("cs_refresh")}</button>
          <button className={btn} onClick={() => setPreviewOpen(true)}><Eye className="h-3.5 w-3.5" />{T("cs_preview_cal")}</button>
          <button className={btn}><Shield className="h-3.5 w-3.5" />{T("cs_rules")}</button>
          <button className={btn}><Download className="h-3.5 w-3.5" />{T("cs_export")}</button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border/60">
        {TABS.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm font-medium transition ${
              tab === id ? "border border-b-transparent border-border/60 bg-background text-foreground -mb-px" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {T(key)}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { k: "cs_card_active" as CSKey, v: stats.active },
              { k: "cs_card_birthdays" as CSKey, v: stats.birthdays },
              { k: "cs_card_anniversaries" as CSKey, v: stats.anniversaries },
              { k: "cs_card_scheduled" as CSKey, v: stats.scheduledGifts },
              { k: "cs_card_reminders_wk" as CSKey, v: stats.remindersThisWeek },
              { k: "cs_card_failed" as CSKey, v: stats.failed },
              { k: "cs_card_monthly_users" as CSKey, v: stats.monthly },
              { k: "cs_card_yearly_users" as CSKey, v: stats.yearly },
            ].map(c => (
              <div key={c.k} className="rounded-lg border border-border/60 bg-card/60 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{T(c.k)}</div>
                <div className="mt-1 text-2xl font-semibold">{c.v}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input className={`${input} pl-7`} placeholder={T("cs_search_ph")} value={query} onChange={e => setQuery(e.target.value)} />
              </div>
            </div>
            <select className={input + " w-auto"} value={typeF} onChange={e => setTypeF(e.target.value as typeof typeF)}>
              <option value="all">{T("cs_col_type")}: {T("cs_filter_all")}</option>
              {DEFAULT_EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{typeLabel(t.id)}</option>)}
            </select>
            <select className={input + " w-auto"} value={statusF} onChange={e => setStatusF(e.target.value as typeof statusF)}>
              <option value="all">{T("cs_col_status")}: {T("cs_filter_all")}</option>
              {EVENT_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
            <select className={input + " w-auto"} value={recF} onChange={e => setRecF(e.target.value as typeof recF)}>
              <option value="all">{T("cs_col_recurrence")}: {T("cs_filter_all")}</option>
              {(["once","yearly","monthly","weekly","custom"] as Recurrence[]).map(r => <option key={r} value={r}>{recLabel(r)}</option>)}
            </select>
            <select className={input + " w-auto"} value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
              <option value="upcoming">{T("cs_sort_upcoming")}</option>
              <option value="created">{T("cs_sort_created")}</option>
            </select>
            <button className={btn} onClick={resetFilters}>{T("cs_reset")}</button>
          </div>

          {/* Table (desktop) / Cards (mobile) */}
          <div className="hidden overflow-x-auto rounded-lg border border-border/60 md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{T("cs_col_id")}</th>
                  <th className="px-3 py-2">{T("cs_col_customer")}</th>
                  <th className="px-3 py-2">{T("cs_col_type")}</th>
                  <th className="px-3 py-2">{T("cs_col_name")}</th>
                  <th className="px-3 py-2">{T("cs_col_recipient")}</th>
                  <th className="px-3 py-2">{T("cs_col_date")}</th>
                  <th className="px-3 py-2">{T("cs_col_recurrence")}</th>
                  <th className="px-3 py-2">{T("cs_col_tz")}</th>
                  <th className="px-3 py-2">{T("cs_col_reminder")}</th>
                  <th className="px-3 py-2">{T("cs_col_gift")}</th>
                  <th className="px-3 py-2">{T("cs_col_status")}</th>
                  <th className="px-3 py-2">{T("cs_col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="px-3 py-8 text-center text-sm text-muted-foreground">{T("cs_empty")}</td></tr>
                )}
                {filtered.map(e => (
                  <tr key={e.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-xs">{e.id}</td>
                    <td className="px-3 py-2">{e.customer}</td>
                    <td className="px-3 py-2">{typeLabel(e.eventType)}</td>
                    <td className="px-3 py-2">{e.name}</td>
                    <td className="px-3 py-2">{e.recipient}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDay(e.date)}</td>
                    <td className="px-3 py-2">{recLabel(e.recurrence)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{e.timezone}</td>
                    <td className="px-3 py-2 text-xs">
                      {e.reminderPaused ? <span className="text-muted-foreground">{T("cs_pause")}</span> : e.reminderDaysBefore.join(", ") + "d"}
                    </td>
                    <td className="px-3 py-2">{e.scheduledGift ? "✓" : "—"}</td>
                    <td className="px-3 py-2"><StatusBadge status={e.status} label={statusLabel(e.status)} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button className={btn} onClick={() => setView(e)} title={T("cs_view")}><Eye className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_edit")}><Pencil className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_dupe")} onClick={() => {
                          setEvents(prev => [{ ...e, id: nextEventId(prev), createdAt: new Date().toISOString() }, ...prev]);
                        }}><Copy className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_pause")} onClick={() => patchEvent(e.id, { reminderPaused: !e.reminderPaused })}><Pause className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_cancel")} onClick={() => setConfirmMsg({ msg: T("cs_saf_confirm"), onOk: () => patchEvent(e.id, { status: "cancelled" }) })}><Ban className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_archive")}><Archive className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {filtered.map(e => (
              <div key={e.id} className="rounded-lg border border-border/60 bg-card/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-muted-foreground">{e.id}</div>
                  <StatusBadge status={e.status} label={statusLabel(e.status)} />
                </div>
                <div className="mt-1 font-medium">{e.name}</div>
                <div className="text-xs text-muted-foreground">{typeLabel(e.eventType)} · {fmtDay(e.date)} · {e.timezone}</div>
                <div className="mt-1 text-xs">{e.customer} → {e.recipient}</div>
                <div className="mt-2 flex gap-1">
                  <button className={btn} onClick={() => setView(e)}><Eye className="h-3.5 w-3.5" /></button>
                  <button className={btn} onClick={() => patchEvent(e.id, { reminderPaused: !e.reminderPaused })}><Pause className="h-3.5 w-3.5" /></button>
                  <button className={btn} onClick={() => setConfirmMsg({ msg: T("cs_saf_confirm"), onOk: () => patchEvent(e.id, { status: "cancelled" }) })}><Ban className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">{T("cs_approx_note")}</p>
        </section>
      )}

      {tab === "types" && (
        <section className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{T("cs_col_id")}</th>
                <th className="px-3 py-2">{T("cs_col_name")}</th>
                <th className="px-3 py-2">{T("cs_col_icon")}</th>
                <th className="px-3 py-2">{T("cs_col_color")}</th>
                <th className="px-3 py-2">{T("cs_col_active")}</th>
                <th className="px-3 py-2">{T("cs_col_recurring")}</th>
                <th className="px-3 py-2">{T("cs_col_reminder_default")}</th>
                <th className="px-3 py-2">{T("cs_col_allow_gift")}</th>
                <th className="px-3 py-2">{T("cs_col_audience")}</th>
                <th className="px-3 py-2">{T("cs_col_order")}</th>
              </tr>
            </thead>
            <tbody>
              {types.map((row, idx) => (
                <tr key={row.id} className="border-t border-border/40">
                  <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                  <td className="px-3 py-2">{typeLabel(row.id)}</td>
                  <td className="px-3 py-2 text-xl">{row.icon}</td>
                  <td className="px-3 py-2">
                    <input type="color" value={row.color} onChange={e => { setTypes(t => t.map((r,i) => i===idx?{...r,color:e.target.value}:r)); setDirty(true); }} className="h-6 w-10 cursor-pointer rounded border border-border/60" />
                  </td>
                  <td className="px-3 py-2"><input type="checkbox" checked={row.active} onChange={e => { setTypes(t => t.map((r,i) => i===idx?{...r,active:e.target.checked}:r)); setDirty(true); }} /></td>
                  <td className="px-3 py-2"><input type="checkbox" checked={row.recurringByDefault} onChange={e => { setTypes(t => t.map((r,i) => i===idx?{...r,recurringByDefault:e.target.checked}:r)); setDirty(true); }} /></td>
                  <td className="px-3 py-2"><input type="number" min={0} className={input + " w-20"} value={row.defaultReminderDays} onChange={e => { setTypes(t => t.map((r,i) => i===idx?{...r,defaultReminderDays:Number(e.target.value)}:r)); setDirty(true); }} /></td>
                  <td className="px-3 py-2"><input type="checkbox" checked={row.allowScheduledGift} onChange={e => { setTypes(t => t.map((r,i) => i===idx?{...r,allowScheduledGift:e.target.checked}:r)); setDirty(true); }} /></td>
                  <td className="px-3 py-2">
                    <select className={input + " w-32"} value={row.audience} onChange={e => { setTypes(t => t.map((r,i) => i===idx?{...r,audience:e.target.value as "all"|"subscribers"}:r)); setDirty(true); }}>
                      <option value="all">{T("cs_aud_all")}</option>
                      <option value="subscribers">{T("cs_aud_subs")}</option>
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="number" className={input + " w-16"} value={row.order} onChange={e => { setTypes(t => t.map((r,i) => i===idx?{...r,order:Number(e.target.value)}:r)); setDirty(true); }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "reminders" && (
        <section className="max-w-3xl space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium">{T("cs_rem_defchan")}</span>
              <select className={input} value={reminder.defaultChannel} onChange={e => { setReminder({ ...reminder, defaultChannel: e.target.value as ReminderSettings["defaultChannel"] }); setDirty(true); }}>
                <option value="email">{T("ch_email")}</option>
                <option value="push">{T("ch_push")}</option>
                <option value="sms">{T("ch_sms")}</option>
                <option value="internal">{T("ch_internal")}</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium">{T("cs_rem_max")}</span>
              <input type="number" min={1} max={10} className={input} value={reminder.maxPerEvent} onChange={e => { setReminder({ ...reminder, maxPerEvent: Number(e.target.value) }); setDirty(true); }} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium">{T("cs_rem_quiet")}</span>
              <div className="flex items-center gap-2">
                <input type="time" className={input} value={reminder.quietStart} onChange={e => { setReminder({ ...reminder, quietStart: e.target.value }); setDirty(true); }} />
                <span className="text-muted-foreground">→</span>
                <input type="time" className={input} value={reminder.quietEnd} onChange={e => { setReminder({ ...reminder, quietEnd: e.target.value }); setDirty(true); }} />
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium">{T("cs_feb29_rule")}</span>
              <select className={input} value={reminder.feb29Rule} onChange={e => { setReminder({ ...reminder, feb29Rule: e.target.value as ReminderSettings["feb29Rule"] }); setDirty(true); }}>
                <option value="feb28">{T("feb29_feb28")}</option>
                <option value="mar1">{T("feb29_mar1")}</option>
                <option value="leap_only">{T("feb29_leap")}</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reminder.retryFailed} onChange={e => { setReminder({ ...reminder, retryFailed: e.target.checked }); setDirty(true); }} /> {T("cs_rem_retry")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reminder.allowUserDisable} onChange={e => { setReminder({ ...reminder, allowUserDisable: e.target.checked }); setDirty(true); }} /> {T("cs_rem_userdis")}</label>
          <div className="flex gap-2"><button className={btnPrimary} onClick={() => setDirty(false)}>{T("cs_save")}</button></div>
        </section>
      )}

      {tab === "delivery" && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground">{T("cs_approx_note")}</p>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{T("cs_col_id")}</th>
                  <th className="px-3 py-2">{T("cs_col_customer")}</th>
                  <th className="px-3 py-2">{T("cs_col_recipient")}</th>
                  <th className="px-3 py-2">{T("cs_col_date")}</th>
                  <th className="px-3 py-2">{T("cs_col_channel")}</th>
                  <th className="px-3 py-2">{T("cs_col_status")}</th>
                  <th className="px-3 py-2">{T("cs_col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {events.filter(e => e.scheduledGift).map(e => (
                  <tr key={e.id} className="border-t border-border/40">
                    <td className="px-3 py-2 font-mono text-xs">{e.id}</td>
                    <td className="px-3 py-2">{e.customer}</td>
                    <td className="px-3 py-2">{e.recipient}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDay(e.date)} · {T(`cs_win_${e.deliveryWindow}` as CSKey)}</td>
                    <td className="px-3 py-2">{T(`ch_${e.deliveryChannel === "link" ? "link" : e.deliveryChannel}` as CSKey)}</td>
                    <td className="px-3 py-2"><StatusBadge status={e.status} label={statusLabel(e.status)} /></td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button className={btn} title={T("cs_fail_retry")}><RotateCcw className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_fail_change")}><Mail className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_fail_link")}><Link2 className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_fail_contact")}><MessageSquare className="h-3.5 w-3.5" /></button>
                        <button className={btn} title={T("cs_fail_review")}><Shield className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Failed attempts details */}
          {events.some(e => e.attempts.length > 0) && (
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              <h3 className="mb-2 text-sm font-semibold">{T("cs_col_attempts")}</h3>
              <div className="space-y-2">
                {events.filter(e => e.attempts.length > 0).map(e => (
                  <div key={e.id}>
                    <div className="text-xs font-medium text-muted-foreground">{e.id} · {e.name}</div>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {e.attempts.map(a => (
                        <li key={a.n}>#{a.n} · {a.channel} · {fmtDate(a.date)} · <span className="text-rose-600">{a.error}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "subscription" && (
        <section className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">{T("cs_sub_sched")}</th>
                  <th className="px-3 py-2">{T("cs_sub_range")}</th>
                  <th className="px-3 py-2">{T("cs_sub_cost")}</th>
                  <th className="px-3 py-2">{T("cs_sub_maxgifts")}</th>
                  <th className="px-3 py-2">{T("cs_sub_maxrem")}</th>
                  <th className="px-3 py-2">{T("cs_sub_grace")}</th>
                  <th className="px-3 py-2">{T("cs_sub_expire")}</th>
                </tr>
              </thead>
              <tbody>
                {access.map((row, idx) => (
                  <tr key={row.tier} className="border-t border-border/40">
                    <td className="px-3 py-2 font-medium">{T(`sub_${row.tier}` as CSKey)}</td>
                    <td className="px-3 py-2"><input type="checkbox" checked={row.schedulingEnabled} onChange={e => { setAccess(a => a.map((r,i) => i===idx?{...r,schedulingEnabled:e.target.checked}:r)); setDirty(true); }} /></td>
                    <td className="px-3 py-2"><input type="number" className={input + " w-24"} value={row.maxDaysAhead} onChange={e => { setAccess(a => a.map((r,i) => i===idx?{...r,maxDaysAhead:Number(e.target.value)}:r)); setDirty(true); }} /></td>
                    <td className="px-3 py-2"><input type="number" className={input + " w-20"} value={row.creditCostNonSub} disabled={row.tier !== "none"} onChange={e => { setAccess(a => a.map((r,i) => i===idx?{...r,creditCostNonSub:Number(e.target.value)}:r)); setDirty(true); }} /></td>
                    <td className="px-3 py-2"><input type="number" className={input + " w-24"} value={row.maxScheduledGifts} onChange={e => { setAccess(a => a.map((r,i) => i===idx?{...r,maxScheduledGifts:Number(e.target.value)}:r)); setDirty(true); }} /></td>
                    <td className="px-3 py-2"><input type="number" className={input + " w-24"} value={row.maxActiveReminders} onChange={e => { setAccess(a => a.map((r,i) => i===idx?{...r,maxActiveReminders:Number(e.target.value)}:r)); setDirty(true); }} /></td>
                    <td className="px-3 py-2"><input type="number" className={input + " w-20"} value={row.gracePeriodDays} onChange={e => { setAccess(a => a.map((r,i) => i===idx?{...r,gracePeriodDays:Number(e.target.value)}:r)); setDirty(true); }} /></td>
                    <td className="px-3 py-2">
                      <select className={input + " w-52"} value={row.onExpiration} onChange={e => { setAccess(a => a.map((r,i) => i===idx?{...r,onExpiration:e.target.value as SubscriptionAccess["onExpiration"]}:r)); setDirty(true); if (e.target.value !== "keep") setConfirmMsg({ msg: T("cs_expire_warn"), onOk: () => {} }); }}>
                        <option value="keep">{T("exp_keep")}</option>
                        <option value="require_credits">{T("exp_require_credits")}</option>
                        <option value="ask_renew">{T("exp_ask_renew")}</option>
                        <option value="manual_review">{T("exp_manual")}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">{T("cs_expire_warn")}</div>
        </section>
      )}

      {tab === "timezones" && (
        <section className="max-w-3xl space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium">{T("cs_tz_platform")}</span>
              <select className={input} value={platformTz} onChange={e => { setPlatformTz(e.target.value); setDirty(true); }}>
                {IANA_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium">{T("cs_tz_admin")}</span>
              <select className={input} value={adminTz} onChange={e => { setAdminTz(e.target.value); setDirty(true); }}>
                {IANA_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </label>
          </div>
          <div className="space-y-2">
            {[T("cs_tz_warn_diff"), T("cs_tz_warn_dst"), T("cs_tz_warn_midnight")].map((m, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {m}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{T("cs_tz_customer")} / {T("cs_tz_recipient")} — {T("cs_privacy_note")}</p>
        </section>
      )}

      {tab === "holidays" && (
        <section className="space-y-4">
          <div className="rounded-md border border-sky-500/40 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-100">{T("cs_hol_note")}</div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">{T("cs_movable_note")}</div>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{T("cs_col_src")}</th>
                  <th className="px-3 py-2">{T("cs_col_countries")}</th>
                  <th className="px-3 py-2">{T("cs_col_regions")}</th>
                  <th className="px-3 py-2">{T("cs_col_types")}</th>
                  <th className="px-3 py-2">{T("cs_col_method")}</th>
                  <th className="px-3 py-2">{T("cs_col_lastsync")}</th>
                  <th className="px-3 py-2">{T("cs_col_status")}</th>
                  <th className="px-3 py-2">{T("cs_col_priority")}</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s, idx) => (
                  <tr key={s.id} className="border-t border-border/40">
                    <td className="px-3 py-2">{T(s.nameKey as CSKey)}</td>
                    <td className="px-3 py-2 text-xs">{s.countries}</td>
                    <td className="px-3 py-2 text-xs">{s.regions}</td>
                    <td className="px-3 py-2 text-xs">{s.types}</td>
                    <td className="px-3 py-2 text-xs">{s.updateMethod}</td>
                    <td className="px-3 py-2 text-xs">{s.lastSync ? fmtDate(s.lastSync) : "—"}</td>
                    <td className="px-3 py-2">
                      <select className={input + " w-40"} value={s.status} onChange={e => { setSources(list => list.map((r,i) => i===idx?{...r,status:e.target.value as HolidaySourceStatus}:r)); setDirty(true); }}>
                        <option value="not_connected">{T("hs_not_connected")}</option>
                        <option value="test">{T("hs_test")}</option>
                        <option value="active">{T("hs_active")}</option>
                        <option value="disabled">{T("hs_disabled")}</option>
                        <option value="error">{T("hs_error")}</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs">{s.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <h3 className="mb-2 text-sm font-semibold">Custom admin events</h3>
            <ul className="space-y-2 text-sm">
              {adminEvents.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background p-2">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtDay(a.startDate)} → {fmtDay(a.endDate)} · {a.countries} · {a.languages}</div>
                  </div>
                  <div className="text-xs">{a.active ? "Active" : "Inactive"} · {a.visible ? "Visible" : "Hidden"}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === "safety" && (
        <section className="max-w-3xl space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
          {([
            ["maxEventsPerUser", "cs_saf_maxev"],
            ["maxRemindersPerEvent", "cs_saf_maxrem"],
            ["maxScheduledGiftsPerUser", "cs_saf_maxgifts"],
            ["maxScheduledGiftsPerDay", "cs_saf_perday"],
            ["minLeadTimeMinutes", "cs_saf_leadtime"],
            ["maxDaysInFuture", "cs_saf_future"],
            ["maxRetryAttempts", "cs_saf_retry"],
          ] as [keyof SafetyLimits, CSKey][]).map(([k, lk]) => (
            <label key={k} className="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_140px]">
              <span className="text-sm">{T(lk)}</span>
              <input type="number" className={input} value={safety[k] as number} onChange={e => { setSafety({ ...safety, [k]: Number(e.target.value) } as SafetyLimits); setDirty(true); }} />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={safety.emergencyPause} onChange={e => { setSafety({ ...safety, emergencyPause: e.target.checked }); setConfirmMsg({ msg: T("cs_saf_confirm"), onOk: () => {} }); setDirty(true); }} /> {T("cs_saf_pause")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={safety.reviewHighValue} onChange={e => { setSafety({ ...safety, reviewHighValue: e.target.checked }); setDirty(true); }} /> {T("cs_saf_review_hv")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={safety.reviewLargeGroup} onChange={e => { setSafety({ ...safety, reviewLargeGroup: e.target.checked }); setDirty(true); }} /> {T("cs_saf_review_grp")}</label>
          <p className="text-xs text-amber-700 dark:text-amber-300">{T("cs_saf_confirm")}</p>
        </section>
      )}

      {tab === "history" && (
        <section className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{T("cs_col_when")}</th>
                <th className="px-3 py-2">{T("cs_col_admin")}</th>
                <th className="px-3 py-2">{T("cs_col_action")}</th>
                <th className="px-3 py-2">{T("cs_col_entity")}</th>
                <th className="px-3 py-2">{T("cs_col_prev")}</th>
                <th className="px-3 py-2">{T("cs_col_next")}</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_HISTORY.map(h => (
                <tr key={h.id} className="border-t border-border/40">
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtDate(h.date)}</td>
                  <td className="px-3 py-2">{h.admin}</td>
                  <td className="px-3 py-2">{T(h.actionKey as CSKey)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{h.entity}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{h.previous}</td>
                  <td className="px-3 py-2 text-xs">{h.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* View modal */}
      {view && (
        <Modal onClose={() => setView(null)} title={`${view.id} — ${view.name}`}>
          <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <Row label={T("cs_col_customer")} value={view.customer} />
            <Row label={T("cs_col_recipient")} value={view.recipient} />
            <Row label={T("cs_col_type")} value={typeLabel(view.eventType)} />
            <Row label={T("cs_col_date")} value={fmtDay(view.date)} />
            <Row label={T("cs_col_recurrence")} value={recLabel(view.recurrence)} />
            <Row label={T("cs_tz_customer")} value={view.timezone} />
            <Row label={T("cs_tz_recipient")} value={view.recipientTimezone} />
            <Row label={T("cs_col_reminder")} value={view.reminderDaysBefore.join(", ") + "d"} />
            <Row label={T("cs_col_channel")} value={view.deliveryChannel} />
            <Row label={T("cs_col_status")} value={statusLabel(view.status)} />
          </dl>
          {view.attempts.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold">{T("cs_col_attempts")}</h4>
              <ul className="space-y-1 text-xs">
                {view.attempts.map(a => (
                  <li key={a.n}>#{a.n} · {a.channel} · {fmtDate(a.date)} · <span className="text-rose-600">{a.error}</span></li>
                ))}
              </ul>
            </div>
          )}
        </Modal>
      )}

      {/* Customer calendar preview */}
      {previewOpen && (
        <Modal onClose={() => setPreviewOpen(false)} title={T("cs_prev_title")}>
          <p className="mb-3 text-xs text-muted-foreground">{T("cs_prev_note")}</p>
          <div className="space-y-2">
            {events.slice(0, 6).map(e => (
              <div key={e.id} className="flex items-center justify-between rounded-md border border-border/40 p-2">
                <div>
                  <div className="text-sm font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDay(e.date)} · {typeLabel(e.eventType)}</div>
                </div>
                <StatusBadge status={e.status} label={statusLabel(e.status)} />
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Confirm dialog */}
      {confirmMsg && (
        <Modal onClose={() => setConfirmMsg(null)} title={T("cs_saf_confirm")}>
          <p className="text-sm">{confirmMsg.msg}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button className={btn} onClick={() => setConfirmMsg(null)}>{T("cs_close")}</button>
            <button className={btnDanger} onClick={() => { confirmMsg.onOk(); setConfirmMsg(null); }}><ChevronRight className="h-3.5 w-3.5" /> {T("cs_save")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg border border-border/60 bg-background shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button className={btn} onClick={onClose}><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
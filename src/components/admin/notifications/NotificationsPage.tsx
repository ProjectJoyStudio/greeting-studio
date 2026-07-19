import { useMemo, useState } from "react";
import {
  Plus, RefreshCw, Search, Eye, Pencil, Copy, Ban, Trash2, X,
  AlertTriangle, Send, LayoutGrid, History, FileText, BarChart3,
  Mail, MessageSquare, Bell, MessageCircle, Phone, Inbox,
  CheckCircle2, XCircle, Archive, ArchiveRestore, ChevronRight,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import {
  DEMO_NOTIFICATIONS, DEMO_TEMPLATES, NOTIF_TYPES, NOTIF_CHANNELS,
  NOTIF_STATUSES, NOTIF_PRIORITIES, STATUS_TONE, PRIORITY_TONE,
  TEMPLATE_CATEGORIES, computeStats, nextNotifId, nextTemplateId,
  newHistory,
  type NotifRecord, type NotifType, type NotifChannel, type NotifStatus,
  type NotifPriority, type RepeatMode, type TemplateRecord, type TemplateCategory,
} from "@/lib/admin/notifications";
import { useLocalNotifs } from "./i18n";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-200";

const CHANNEL_ICON: Record<NotifChannel, typeof Mail> = {
  email: Mail, sms: Phone, push: Bell, telegram: Send,
  whatsapp: MessageCircle, internal: Inbox,
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function emptyDraft(): NotifRecord {
  const now = new Date().toISOString();
  return {
    id: nextNotifId(), recipientName: "", email: "", phone: "",
    language: "en", country: "", relatedOrder: null,
    type: "announcement", channel: "email", priority: "normal",
    subject: "", message: "", status: "draft", createdAt: now,
    scheduledAt: null, sentAt: null, readAt: null,
    deliveryAttempts: 0, errorLog: "", attachments: [], repeat: "none",
    history: [newHistory("created", "", "Admin")],
  };
}

function emptyTemplate(): TemplateRecord {
  return {
    id: nextTemplateId(), name: "", category: "welcome", channel: "email",
    language: "en", subject: "", body: "", archived: false, updatedAt: new Date().toISOString(),
  };
}

type MainTab = "notifications" | "templates" | "stats";

export function NotificationsPage() {
  const { lang } = useI18n();
  const L = useLocalNotifs(lang);

  const [tab, setTab] = useState<MainTab>("notifications");
  const [items, setItems] = useState<NotifRecord[]>(() => [...DEMO_NOTIFICATIONS]);
  const [templates, setTemplates] = useState<TemplateRecord[]>(() => [...DEMO_TEMPLATES]);
  const [tick, setTick] = useState(0);

  const [query, setQuery] = useState("");
  const [statusF, setStatusF] = useState<"all" | NotifStatus>("all");
  const [typeF, setTypeF] = useState<"all" | NotifType>("all");
  const [chanF, setChanF] = useState<"all" | NotifChannel>("all");
  const [langF, setLangF] = useState<"all" | Lang>("all");
  const [countryF, setCountryF] = useState("");
  const [prioF, setPrioF] = useState<"all" | NotifPriority>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "status" | "recipient" | "type" | "channel">("newest");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<NotifRecord | null>(null);
  const [editing, setEditing] = useState<NotifRecord | null>(null);
  const [previewing, setPreviewing] = useState<NotifRecord | null>(null);
  const [confirmDel, setConfirmDel] = useState<NotifRecord | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);

  const filtered = useMemo(() => {
    void tick;
    const q = query.trim().toLowerCase();
    let list = items.filter((n) => {
      if (statusF !== "all" && n.status !== statusF) return false;
      if (typeF !== "all" && n.type !== typeF) return false;
      if (chanF !== "all" && n.channel !== chanF) return false;
      if (langF !== "all" && n.language !== langF) return false;
      if (prioF !== "all" && n.priority !== prioF) return false;
      if (countryF.trim() && !n.country.toLowerCase().includes(countryF.trim().toLowerCase())) return false;
      if (dateFrom && n.createdAt < dateFrom) return false;
      if (dateTo && n.createdAt > dateTo + "T23:59:59") return false;
      if (q) {
        const hay = `${n.recipientName} ${n.email} ${n.phone} ${n.relatedOrder ?? ""} ${n.subject}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const cmpBy: Record<typeof sortMode, (a: NotifRecord, b: NotifRecord) => number> = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
      status: (a, b) => a.status.localeCompare(b.status),
      recipient: (a, b) => a.recipientName.localeCompare(b.recipientName),
      type: (a, b) => a.type.localeCompare(b.type),
      channel: (a, b) => a.channel.localeCompare(b.channel),
    };
    return [...list].sort(cmpBy[sortMode]);
  }, [items, query, statusF, typeF, chanF, langF, countryF, prioF, dateFrom, dateTo, sortMode, tick]);

  const stats = useMemo(() => computeStats(items), [items]);

  const toggleSel = (id: string) => setSelected((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleSelAll = () => setSelected((prev) => {
    if (prev.size === filtered.length) return new Set();
    return new Set(filtered.map((n) => n.id));
  });

  const patch = (id: string, mut: (n: NotifRecord) => NotifRecord) =>
    setItems((prev) => prev.map((n) => (n.id === id ? mut(n) : n)));

  const doSendNow = (n: NotifRecord): NotifRecord => {
    const at = new Date().toISOString();
    return {
      ...n, status: "sent", sentAt: at, deliveryAttempts: n.deliveryAttempts + 1,
      history: [...n.history, newHistory("sent", "", "Admin")],
    };
  };
  const doCancel = (n: NotifRecord): NotifRecord => ({
    ...n, status: "cancelled",
    history: [...n.history, newHistory("cancelled", "", "Admin")],
  });

  const bulk = (fn: (n: NotifRecord) => NotifRecord) => {
    setItems((prev) => prev.map((n) => (selected.has(n.id) ? fn(n) : n)));
    setSelected(new Set());
  };
  const bulkDelete = () => {
    setItems((prev) => prev.filter((n) => !selected.has(n.id)));
    setSelected(new Set());
  };
  const bulkExport = () => {
    const rows = items.filter((n) => selected.has(n.id));
    try {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `notifications-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground sm:text-3xl">{L("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{L("subtitle")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={() => setTick((n) => n + 1)} className={btnBase}>
            <RefreshCw className="h-4 w-4" /> {L("btn_refresh")}
          </button>
          <button type="button" onClick={() => setTab("templates")} className={btnBase}>
            <FileText className="h-4 w-4" /> {L("btn_templates")}
          </button>
          <button type="button" onClick={() => setTab("stats")} className={btnBase}>
            <BarChart3 className="h-4 w-4" /> {L("btn_stats")}
          </button>
          <button
            type="button"
            onClick={() => bulk(doSendNow)}
            disabled={selected.size === 0}
            className={btnBase}
          >
            <Send className="h-4 w-4" /> {L("btn_bulk_send")}
          </button>
          <button type="button" onClick={() => setEditing(emptyDraft())} className={btnPrimary}>
            <Plus className="h-4 w-4" /> {L("btn_create")}
          </button>
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L("demo_notice")}</span>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-border/60">
        {(["notifications", "templates", "stats"] as MainTab[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={
              "inline-flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium " +
              (tab === k
                ? "border-border bg-background text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {k === "notifications" ? <LayoutGrid className="h-4 w-4" /> :
             k === "templates" ? <FileText className="h-4 w-4" /> :
             <BarChart3 className="h-4 w-4" />}
            {L("tab_" + k)}
          </button>
        ))}
      </nav>

      {tab === "notifications" && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={L("search_placeholder")}
                className={inputCls + " pl-8"}
              />
            </div>
            <select value={statusF} onChange={(e) => setStatusF(e.target.value as never)} className={inputCls}>
              <option value="all">{L("f_status")}: {L("f_all")}</option>
              {NOTIF_STATUSES.map((s) => <option key={s} value={s}>{L("st_" + s)}</option>)}
            </select>
            <select value={typeF} onChange={(e) => setTypeF(e.target.value as never)} className={inputCls}>
              <option value="all">{L("f_type")}: {L("f_all")}</option>
              {NOTIF_TYPES.map((t) => <option key={t} value={t}>{L("type_" + t)}</option>)}
            </select>
            <select value={chanF} onChange={(e) => setChanF(e.target.value as never)} className={inputCls}>
              <option value="all">{L("f_channel")}: {L("f_all")}</option>
              {NOTIF_CHANNELS.map((c) => <option key={c} value={c}>{L("ch_" + c)}</option>)}
            </select>
            <select value={langF} onChange={(e) => setLangF(e.target.value as never)} className={inputCls}>
              <option value="all">{L("f_language")}: {L("f_all")}</option>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <select value={prioF} onChange={(e) => setPrioF(e.target.value as never)} className={inputCls}>
              <option value="all">{L("f_priority")}: {L("f_all")}</option>
              {NOTIF_PRIORITIES.map((p) => <option key={p} value={p}>{L("pr_" + p)}</option>)}
            </select>
            <input
              value={countryF}
              onChange={(e) => setCountryF(e.target.value)}
              placeholder={L("f_country")}
              className={inputCls}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{L("f_from")}</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{L("f_to")}</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
            </div>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as never)} className={inputCls}>
              <option value="newest">{L("sort_by")}: {L("sort_newest")}</option>
              <option value="oldest">{L("sort_by")}: {L("sort_oldest")}</option>
              <option value="status">{L("sort_by")}: {L("sort_status")}</option>
              <option value="recipient">{L("sort_by")}: {L("sort_recipient")}</option>
              <option value="type">{L("sort_by")}: {L("sort_type")}</option>
              <option value="channel">{L("sort_by")}: {L("sort_channel")}</option>
            </select>
          </div>

          {selected.size > 0 && (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
              <span className="font-medium">{L("bulk_selected", { n: selected.size })}</span>
              <button type="button" onClick={() => bulk(doSendNow)} className={btnBase}><Send className="h-3.5 w-3.5" /> {L("bulk_send")}</button>
              <button type="button" onClick={() => bulk(doCancel)} className={btnBase}><Ban className="h-3.5 w-3.5" /> {L("bulk_cancel")}</button>
              <button type="button" onClick={bulkExport} className={btnBase}><FileText className="h-3.5 w-3.5" /> {L("bulk_export")}</button>
              <button type="button" onClick={bulkDelete} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> {L("bulk_delete")}</button>
              <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">{L("clear_selection")}</button>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-md border border-border/60 lg:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelAll}
                    />
                  </th>
                  <th className="px-2 py-2">{L("col_id")}</th>
                  <th className="px-2 py-2">{L("col_recipient")}</th>
                  <th className="px-2 py-2">{L("col_contact")}</th>
                  <th className="px-2 py-2">{L("col_order")}</th>
                  <th className="px-2 py-2">{L("col_type")}</th>
                  <th className="px-2 py-2">{L("col_channel")}</th>
                  <th className="px-2 py-2">{L("col_language")}</th>
                  <th className="px-2 py-2">{L("col_country")}</th>
                  <th className="px-2 py-2">{L("col_priority")}</th>
                  <th className="px-2 py-2">{L("col_status")}</th>
                  <th className="px-2 py-2">{L("col_created")}</th>
                  <th className="px-2 py-2">{L("col_scheduled")}</th>
                  <th className="px-2 py-2">{L("col_sent")}</th>
                  <th className="px-2 py-2 text-right">{L("col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={15} className="px-3 py-6 text-center text-sm text-muted-foreground">{L("empty")}</td></tr>
                )}
                {filtered.map((n) => {
                  const Ch = CHANNEL_ICON[n.channel];
                  return (
                    <tr key={n.id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-2 py-2"><input type="checkbox" checked={selected.has(n.id)} onChange={() => toggleSel(n.id)} /></td>
                      <td className="px-2 py-2 font-mono text-xs">{n.id}</td>
                      <td className="px-2 py-2">{n.recipientName || "—"}</td>
                      <td className="px-2 py-2 text-xs">
                        <div>{n.email || "—"}</div>
                        <div className="text-muted-foreground">{n.phone || "—"}</div>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">{n.relatedOrder || "—"}</td>
                      <td className="px-2 py-2 text-xs">{L("type_" + n.type)}</td>
                      <td className="px-2 py-2 text-xs"><span className="inline-flex items-center gap-1"><Ch className="h-3.5 w-3.5" />{L("ch_" + n.channel)}</span></td>
                      <td className="px-2 py-2 text-xs uppercase">{n.language}</td>
                      <td className="px-2 py-2 text-xs">{n.country || "—"}</td>
                      <td className="px-2 py-2"><span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium " + PRIORITY_TONE[n.priority]}>{L("pr_" + n.priority)}</span></td>
                      <td className="px-2 py-2"><span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium " + STATUS_TONE[n.status]}>{L("st_" + n.status)}</span></td>
                      <td className="px-2 py-2 text-xs">{fmtDate(n.createdAt)}</td>
                      <td className="px-2 py-2 text-xs">{fmtDate(n.scheduledAt)}</td>
                      <td className="px-2 py-2 text-xs">{fmtDate(n.sentAt)}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setViewing(n)} className={btnBase} title={L("act_view")}><Eye className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setPreviewing(n)} className={btnBase} title={L("act_preview")}><LayoutGrid className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setEditing({ ...n })} className={btnBase} title={L("act_edit")}><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setItems((prev) => [{ ...n, id: nextNotifId(), status: "draft", sentAt: null, readAt: null, deliveryAttempts: 0, history: [newHistory("created", "", "Admin")], createdAt: new Date().toISOString() }, ...prev])} className={btnBase} title={L("act_duplicate")}><Copy className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => patch(n.id, doSendNow)} className={btnBase} title={L("act_send_again")}><Send className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => patch(n.id, doCancel)} className={btnBase} title={L("act_cancel")}><Ban className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setConfirmDel(n)} className={btnDanger} title={L("act_delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet cards */}
          <div className="grid gap-2 lg:hidden">
            {filtered.length === 0 && <div className="rounded-md border border-border/60 bg-background px-3 py-6 text-center text-sm text-muted-foreground">{L("empty")}</div>}
            {filtered.map((n) => {
              const Ch = CHANNEL_ICON[n.channel];
              return (
                <div key={n.id} className="rounded-md border border-border/60 bg-background p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggleSel(n.id)} />
                        <span className="font-mono text-xs text-muted-foreground">{n.id}</span>
                      </div>
                      <div className="mt-1 font-medium">{n.recipientName || "—"}</div>
                      <div className="text-xs text-muted-foreground">{n.email || n.phone || "—"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium " + STATUS_TONE[n.status]}>{L("st_" + n.status)}</span>
                      <span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium " + PRIORITY_TONE[n.priority]}>{L("pr_" + n.priority)}</span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div className="text-muted-foreground">{L("col_type")}:</div><div>{L("type_" + n.type)}</div>
                    <div className="text-muted-foreground">{L("col_channel")}:</div><div className="inline-flex items-center gap-1"><Ch className="h-3.5 w-3.5" />{L("ch_" + n.channel)}</div>
                    <div className="text-muted-foreground">{L("col_created")}:</div><div>{fmtDate(n.createdAt)}</div>
                    <div className="text-muted-foreground">{L("col_scheduled")}:</div><div>{fmtDate(n.scheduledAt)}</div>
                    <div className="text-muted-foreground">{L("col_sent")}:</div><div>{fmtDate(n.sentAt)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => setViewing(n)} className={btnBase}><Eye className="h-3.5 w-3.5" /> {L("act_view")}</button>
                    <button type="button" onClick={() => setPreviewing(n)} className={btnBase}><LayoutGrid className="h-3.5 w-3.5" /> {L("act_preview")}</button>
                    <button type="button" onClick={() => setEditing({ ...n })} className={btnBase}><Pencil className="h-3.5 w-3.5" /> {L("act_edit")}</button>
                    <button type="button" onClick={() => patch(n.id, doSendNow)} className={btnBase}><Send className="h-3.5 w-3.5" /> {L("act_send_again")}</button>
                    <button type="button" onClick={() => patch(n.id, doCancel)} className={btnBase}><Ban className="h-3.5 w-3.5" /> {L("act_cancel")}</button>
                    <button type="button" onClick={() => setConfirmDel(n)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> {L("act_delete")}</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">{L("future_integrations_title")}.</strong> {L("future_integrations_body")}
          </div>
        </>
      )}

      {tab === "templates" && (
        <TemplatesTab
          L={L} templates={templates} setTemplates={setTemplates}
          onEdit={(t) => setEditingTemplate(t)} onCreate={() => setEditingTemplate(emptyTemplate())}
        />
      )}

      {tab === "stats" && <StatsTab L={L} stats={stats} />}

      {viewing && <ViewModal L={L} n={viewing} onClose={() => setViewing(null)} onPreview={() => { setPreviewing(viewing); setViewing(null); }} />}
      {editing && (
        <EditModal
          L={L} initial={editing}
          templates={templates}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            setItems((prev) => {
              const exists = prev.some((x) => x.id === next.id);
              if (exists) return prev.map((x) => (x.id === next.id ? next : x));
              return [next, ...prev];
            });
            setEditing(null);
          }}
        />
      )}
      {previewing && <PreviewModal L={L} n={previewing} onClose={() => setPreviewing(null)} />}
      {confirmDel && (
        <ConfirmModal
          L={L}
          title={L("confirm_delete_title")} body={L("confirm_delete_body")}
          onClose={() => setConfirmDel(null)}
          onConfirm={() => {
            setItems((prev) => prev.filter((x) => x.id !== confirmDel.id));
            setConfirmDel(null);
          }}
        />
      )}
      {editingTemplate && (
        <TemplateModal
          L={L} initial={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={(t) => {
            setTemplates((prev) => {
              const exists = prev.some((x) => x.id === t.id);
              if (exists) return prev.map((x) => (x.id === t.id ? { ...t, updatedAt: new Date().toISOString() } : x));
              return [{ ...t, updatedAt: new Date().toISOString() }, ...prev];
            });
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------
function ModalShell({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
      <div className={"my-8 w-full rounded-lg border border-border bg-background shadow-xl " + (wide ? "max-w-4xl" : "max-w-2xl")}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-[Fraunces] text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ L, title, body, onClose, onConfirm }: { L: ReturnType<typeof useLocalNotifs>; title: string; body: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className={btnBase}>{L("cancel")}</button>
        <button type="button" onClick={onConfirm} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> {L("delete")}</button>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// View modal (details + history tabs)
// ---------------------------------------------------------------------------
function ViewModal({ L, n, onClose, onPreview }: { L: ReturnType<typeof useLocalNotifs>; n: NotifRecord; onClose: () => void; onPreview: () => void }) {
  const [subtab, setSubtab] = useState<"details" | "history">("details");
  const Ch = CHANNEL_ICON[n.channel];
  return (
    <ModalShell title={n.id + " — " + L("type_" + n.type)} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setSubtab("details")} className={btnBase + (subtab === "details" ? " ring-1 ring-primary" : "")}>{L("tab_details")}</button>
        <button type="button" onClick={() => setSubtab("history")} className={btnBase + (subtab === "history" ? " ring-1 ring-primary" : "")}><History className="h-3.5 w-3.5" /> {L("tab_history")}</button>
        <button type="button" onClick={onPreview} className={btnBase + " ml-auto"}><LayoutGrid className="h-3.5 w-3.5" /> {L("act_preview")}</button>
      </div>
      {subtab === "details" && (
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <Field label={L("fld_recipient")} value={n.recipientName} />
          <Field label={L("fld_email")} value={n.email} />
          <Field label={L("fld_phone")} value={n.phone} />
          <Field label={L("fld_language")} value={n.language.toUpperCase()} />
          <Field label={L("fld_country")} value={n.country} />
          <Field label={L("fld_related_order")} value={n.relatedOrder || "—"} />
          <Field label={L("fld_type")} value={L("type_" + n.type)} />
          <Field label={L("fld_channel")} value={<span className="inline-flex items-center gap-1"><Ch className="h-3.5 w-3.5" />{L("ch_" + n.channel)}</span>} />
          <Field label={L("fld_priority")} value={<span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium " + PRIORITY_TONE[n.priority]}>{L("pr_" + n.priority)}</span>} />
          <Field label={L("fld_status")} value={<span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium " + STATUS_TONE[n.status]}>{L("st_" + n.status)}</span>} />
          <Field label={L("fld_created")} value={fmtDate(n.createdAt)} />
          <Field label={L("fld_scheduled")} value={fmtDate(n.scheduledAt)} />
          <Field label={L("fld_sent")} value={fmtDate(n.sentAt)} />
          <Field label={L("fld_read")} value={fmtDate(n.readAt)} />
          <Field label={L("fld_attempts")} value={String(n.deliveryAttempts)} />
          <Field label={L("fld_repeat")} value={L("repeat_" + n.repeat)} />
          <div className="sm:col-span-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{L("fld_subject")}</div>
            <div className="mt-1 font-medium">{n.subject || "—"}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{L("fld_message")}</div>
            <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">{n.message || "—"}</pre>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{L("fld_attachments")}</div>
            <div className="mt-1 text-sm text-muted-foreground">{n.attachments.length ? n.attachments.join(", ") : L("no_attachments")}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{L("fld_error_log")}</div>
            <div className="mt-1 text-sm text-muted-foreground">{n.errorLog || L("no_error")}</div>
          </div>
        </div>
      )}
      {subtab === "history" && (
        <ol className="space-y-2 text-sm">
          {n.history.map((h) => (
            <li key={h.id} className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/10 px-3 py-2">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{L("h_" + h.kind)}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(h.at)} — {h.author}</span>
                </div>
                {h.note && <div className="text-xs text-muted-foreground">{h.note}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </ModalShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1">{value || "—"}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------
function EditModal({ L, initial, templates, onClose, onSave }: {
  L: ReturnType<typeof useLocalNotifs>; initial: NotifRecord;
  templates: TemplateRecord[]; onClose: () => void; onSave: (n: NotifRecord) => void;
}) {
  const [draft, setDraft] = useState<NotifRecord>(initial);
  const [sendNow, setSendNow] = useState<boolean>(!initial.scheduledAt);

  const set = <K extends keyof NotifRecord>(k: K, v: NotifRecord[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setDraft((d) => ({ ...d, channel: t.channel, subject: t.subject, message: t.body }));
  };

  return (
    <ModalShell title={draft.id} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Row label={L("fld_recipient")}>
          <input className={inputCls} value={draft.recipientName} onChange={(e) => set("recipientName", e.target.value)} />
        </Row>
        <Row label={L("fld_email")}>
          <input className={inputCls} value={draft.email} onChange={(e) => set("email", e.target.value)} />
        </Row>
        <Row label={L("fld_phone")}>
          <input className={inputCls} value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
        </Row>
        <Row label={L("fld_country")}>
          <input className={inputCls} value={draft.country} onChange={(e) => set("country", e.target.value)} />
        </Row>
        <Row label={L("fld_language")}>
          <select className={inputCls} value={draft.language} onChange={(e) => set("language", e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </Row>
        <Row label={L("fld_related_order")}>
          <input className={inputCls} value={draft.relatedOrder ?? ""} onChange={(e) => set("relatedOrder", e.target.value || null)} />
        </Row>
        <Row label={L("fld_type")}>
          <select className={inputCls} value={draft.type} onChange={(e) => set("type", e.target.value as NotifType)}>
            {NOTIF_TYPES.map((t) => <option key={t} value={t}>{L("type_" + t)}</option>)}
          </select>
        </Row>
        <Row label={L("fld_channel")}>
          <select className={inputCls} value={draft.channel} onChange={(e) => set("channel", e.target.value as NotifChannel)}>
            {NOTIF_CHANNELS.map((c) => <option key={c} value={c}>{L("ch_" + c)}</option>)}
          </select>
        </Row>
        <Row label={L("fld_priority")}>
          <select className={inputCls} value={draft.priority} onChange={(e) => set("priority", e.target.value as NotifPriority)}>
            {NOTIF_PRIORITIES.map((p) => <option key={p} value={p}>{L("pr_" + p)}</option>)}
          </select>
        </Row>
        <Row label={L("fld_status")}>
          <select className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value as NotifStatus)}>
            {NOTIF_STATUSES.map((s) => <option key={s} value={s}>{L("st_" + s)}</option>)}
          </select>
        </Row>
        <Row label={L("btn_templates")}>
          <select className={inputCls} defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">—</option>
            {templates.filter((t) => !t.archived).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({L("ch_" + t.channel)})</option>
            ))}
          </select>
        </Row>
        <Row label={L("fld_repeat")}>
          <select className={inputCls} value={draft.repeat} onChange={(e) => set("repeat", e.target.value as RepeatMode)}>
            <option value="none">{L("repeat_none")}</option>
            <option value="daily">{L("repeat_daily")}</option>
            <option value="weekly">{L("repeat_weekly")}</option>
            <option value="monthly">{L("repeat_monthly")}</option>
          </select>
        </Row>
        <div className="sm:col-span-2">
          <Row label={L("fld_subject")}>
            <input className={inputCls} value={draft.subject} onChange={(e) => set("subject", e.target.value)} />
          </Row>
        </div>
        <div className="sm:col-span-2">
          <Row label={L("fld_message")}>
            <textarea className={inputCls + " min-h-[140px]"} value={draft.message} onChange={(e) => set("message", e.target.value)} />
          </Row>
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/10 px-3 py-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendNow}
              onChange={(e) => {
                setSendNow(e.target.checked);
                if (e.target.checked) set("scheduledAt", null);
              }}
            />
            {L("sched_send_now")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground">{L("sched_at")}</span>
            <input
              type="datetime-local"
              className={inputCls}
              disabled={sendNow}
              value={draft.scheduledAt ? draft.scheduledAt.slice(0, 16) : ""}
              onChange={(e) => set("scheduledAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </label>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className={btnBase}>{L("cancel")}</button>
        <button
          type="button"
          onClick={() => onSave({ ...draft, history: [...draft.history, newHistory("edited", "", "Admin")] })}
          className={btnPrimary}
        >{L("save")}</button>
      </div>
    </ModalShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Preview modal (per-channel visual)
// ---------------------------------------------------------------------------
function PreviewModal({ L, n, onClose }: { L: ReturnType<typeof useLocalNotifs>; n: NotifRecord; onClose: () => void }) {
  const Ch = CHANNEL_ICON[n.channel];
  return (
    <ModalShell title={L("preview_title")} onClose={onClose} wide>
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Ch className="h-4 w-4" /> {L("preview_channel")}: <span className="font-medium text-foreground">{L("ch_" + n.channel)}</span>
      </div>
      {n.channel === "email" && (
        <div className="rounded-md border border-border/60 bg-white text-slate-800 shadow-sm dark:bg-zinc-100">
          <div className="border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
            <div><span className="font-medium text-slate-700">To:</span> {n.email || "—"}</div>
            <div><span className="font-medium text-slate-700">Subject:</span> {n.subject || "—"}</div>
          </div>
          <div className="px-4 py-3">
            <div className="mb-2 font-[Fraunces] text-lg text-slate-900">Project Joy</div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{n.message || "—"}</pre>
          </div>
        </div>
      )}
      {n.channel === "sms" && (
        <div className="mx-auto max-w-xs rounded-2xl border border-border/60 bg-muted/20 p-3">
          <div className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm text-white">{n.message || "—"}</div>
          <div className="mt-1 text-right text-[10px] text-muted-foreground">{fmtDate(n.sentAt ?? n.createdAt)}</div>
        </div>
      )}
      {n.channel === "push" && (
        <div className="mx-auto max-w-sm rounded-lg border border-border/60 bg-background p-3 shadow">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5" /> Project Joy</div>
          <div className="mt-1 text-sm font-semibold">{n.subject || "—"}</div>
          <div className="text-sm text-muted-foreground">{n.message || "—"}</div>
        </div>
      )}
      {n.channel === "telegram" && (
        <div className="mx-auto max-w-sm rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3">
          <div className="text-xs font-semibold text-sky-700 dark:text-sky-200">Project Joy Bot</div>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{n.message || "—"}</pre>
        </div>
      )}
      {n.channel === "whatsapp" && (
        <div className="mx-auto max-w-sm rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">Project Joy • WhatsApp Business</div>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{n.message || "—"}</pre>
        </div>
      )}
      {n.channel === "internal" && (
        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          <div className="text-xs text-muted-foreground">{n.subject || "—"}</div>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{n.message || "—"}</pre>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onClose} className={btnBase}>{L("close")}</button>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Templates tab
// ---------------------------------------------------------------------------
function TemplatesTab({ L, templates, setTemplates, onEdit, onCreate }: {
  L: ReturnType<typeof useLocalNotifs>;
  templates: TemplateRecord[];
  setTemplates: React.Dispatch<React.SetStateAction<TemplateRecord[]>>;
  onEdit: (t: TemplateRecord) => void;
  onCreate: () => void;
}) {
  const [catF, setCatF] = useState<"all" | TemplateCategory>("all");
  const [showArchived, setShowArchived] = useState(false);
  const list = templates.filter((t) => (catF === "all" || t.category === catF) && (showArchived || !t.archived));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={catF} onChange={(e) => setCatF(e.target.value as never)} className={inputCls + " max-w-[220px]"}>
          <option value="all">{L("tpl_category")}: {L("f_all")}</option>
          {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{L("cat_" + c)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          {L("tpl_archived")}
        </label>
        <button type="button" onClick={onCreate} className={btnPrimary + " ml-auto"}>
          <Plus className="h-4 w-4" /> {L("tpl_new")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border/60">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2">{L("tpl_name")}</th>
              <th className="px-2 py-2">{L("tpl_category")}</th>
              <th className="px-2 py-2">{L("tpl_channel")}</th>
              <th className="px-2 py-2">{L("tpl_language")}</th>
              <th className="px-2 py-2">{L("tpl_subject")}</th>
              <th className="px-2 py-2">{L("tpl_updated")}</th>
              <th className="px-2 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">{L("tpl_empty")}</td></tr>}
            {list.map((t) => (
              <tr key={t.id} className="border-t border-border/40 hover:bg-muted/20">
                <td className="px-2 py-2 font-medium">{t.name}{t.archived && <span className="ml-2 text-xs text-muted-foreground">({L("tpl_archived")})</span>}</td>
                <td className="px-2 py-2 text-xs">{L("cat_" + t.category)}</td>
                <td className="px-2 py-2 text-xs">{L("ch_" + t.channel)}</td>
                <td className="px-2 py-2 text-xs uppercase">{t.language}</td>
                <td className="px-2 py-2 text-xs">{t.subject}</td>
                <td className="px-2 py-2 text-xs">{fmtDate(t.updatedAt)}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => onEdit(t)} className={btnBase}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setTemplates((prev) => [{ ...t, id: nextTemplateId(), name: t.name + " (copy)", updatedAt: new Date().toISOString() }, ...prev])} className={btnBase}><Copy className="h-3.5 w-3.5" /></button>
                    <button
                      type="button"
                      onClick={() => setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, archived: !x.archived } : x)))}
                      className={btnBase}
                    >
                      {t.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {t.archived ? L("tpl_restore") : L("tpl_archive")}
                    </button>
                    <button type="button" onClick={() => setTemplates((prev) => prev.filter((x) => x.id !== t.id))} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateModal({ L, initial, onClose, onSave }: {
  L: ReturnType<typeof useLocalNotifs>; initial: TemplateRecord;
  onClose: () => void; onSave: (t: TemplateRecord) => void;
}) {
  const [d, setD] = useState<TemplateRecord>(initial);
  const set = <K extends keyof TemplateRecord>(k: K, v: TemplateRecord[K]) => setD((p) => ({ ...p, [k]: v }));
  return (
    <ModalShell title={initial.id} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Row label={L("tpl_name")}><input className={inputCls} value={d.name} onChange={(e) => set("name", e.target.value)} /></Row>
        <Row label={L("tpl_category")}>
          <select className={inputCls} value={d.category} onChange={(e) => set("category", e.target.value as TemplateCategory)}>
            {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{L("cat_" + c)}</option>)}
          </select>
        </Row>
        <Row label={L("tpl_channel")}>
          <select className={inputCls} value={d.channel} onChange={(e) => set("channel", e.target.value as NotifChannel)}>
            {NOTIF_CHANNELS.map((c) => <option key={c} value={c}>{L("ch_" + c)}</option>)}
          </select>
        </Row>
        <Row label={L("tpl_language")}>
          <select className={inputCls} value={d.language} onChange={(e) => set("language", e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </Row>
        <div className="sm:col-span-2"><Row label={L("tpl_subject")}><input className={inputCls} value={d.subject} onChange={(e) => set("subject", e.target.value)} /></Row></div>
        <div className="sm:col-span-2"><Row label={L("tpl_body")}><textarea className={inputCls + " min-h-[160px]"} value={d.body} onChange={(e) => set("body", e.target.value)} /></Row></div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className={btnBase}>{L("cancel")}</button>
        <button type="button" onClick={() => onSave(d)} className={btnPrimary}>{L("save")}</button>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Statistics tab
// ---------------------------------------------------------------------------
function StatsTab({ L, stats }: { L: ReturnType<typeof useLocalNotifs>; stats: ReturnType<typeof computeStats> }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label={L("stat_total")} value={String(stats.total)} icon={<LayoutGrid className="h-4 w-4" />} />
        <Kpi label={L("stat_sent_today")} value={String(stats.sentToday)} icon={<Send className="h-4 w-4" />} />
        <Kpi label={L("stat_delivered")} value={String(stats.delivered)} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
        <Kpi label={L("stat_failed")} value={String(stats.failed)} icon={<XCircle className="h-4 w-4 text-rose-600" />} />
        <Kpi label={L("stat_read_rate")} value={pct(stats.readRate)} icon={<Eye className="h-4 w-4" />} />
        <Kpi label={L("stat_delivery_rate")} value={pct(stats.deliveryRate)} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <TopList title={L("stat_top_types")} rows={stats.topTypes.map((r) => ({ label: L("type_" + r.key), value: r.count }))} />
        <TopList title={L("stat_top_languages")} rows={stats.topLanguages.map((r) => ({ label: (LANGS.find((l) => l.code === r.key)?.label ?? r.key), value: r.count }))} />
        <TopList title={L("stat_top_countries")} rows={stats.topCountries.map((r) => ({ label: r.key || "—", value: r.count }))} />
      </div>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-4 py-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <div className="mt-1 font-[Fraunces] text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TopList({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-md border border-border/60 bg-background px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="mt-2 space-y-1.5">
        {rows.length === 0 && <li className="text-sm text-muted-foreground">—</li>}
        {rows.map((r, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.value}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
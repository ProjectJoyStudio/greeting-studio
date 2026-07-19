import { useMemo, useState } from "react";
import {
  Plus, RefreshCw, Search, Eye, Pencil, Copy, Ban, Trash2, X,
  AlertTriangle, Mail, MessageSquare, CheckCircle2, CreditCard,
  ListOrdered, Play, PauseCircle, PlayCircle, PackageCheck, Truck,
  ArrowUp, ArrowDown, ArrowUpToLine, ChevronRight, FileText,
  StickyNote, History, LayoutGrid, Send, Eye as EyeIcon,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import {
  DEMO_ORDERS, ORDER_TYPES, ORDER_STATUSES, STATUS_TONE, PRIORITIES, PRIORITY_TONE,
  CANCELLATION_REASONS, formatEstimate, makeTestOrder, duplicateOrder,
  moveInQueue, reprioritizeQueue, appendEvent, makeTimelineEvent,
  type OrderRecord, type OrderType, type OrderStatus, type NotifyStatus,
  type Priority, type CancellationReason, type TimelineKind, type QueueAction,
  type NotificationLogEntry, type GeneratedFile,
} from "@/lib/admin/orders";
import { useLocalOrders, type LocalOrders } from "./i18n";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-200";

export function OrdersPage() {
  const { lang } = useI18n();
  const L = useLocalOrders(lang);

  const [orders, setOrders] = useState<OrderRecord[]>(() => [...DEMO_ORDERS]);
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | OrderType>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [editing, setEditing] = useState<OrderRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrderRecord | null>(null);
  const [cancelling, setCancelling] = useState<OrderRecord | null>(null);

  const workspaceOrder = workspaceId ? orders.find((o) => o.id === workspaceId) ?? null : null;

  const filtered = useMemo(() => {
    void tick;
    const q = query.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
      if (q) {
        const hay = `${o.id} ${o.customerName} ${o.customerEmail}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sortDir === "newest" ? -cmp : cmp;
    });
    return list;
  }, [orders, query, statusFilter, typeFilter, priorityFilter, sortDir, tick]);

  const updateOrder = (id: string, mut: (o: OrderRecord) => OrderRecord) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? mut(o) : o)));

  const doCancel = (order: OrderRecord, reason: CancellationReason, detail: string) => {
    setOrders((prev) => {
      const note = `${L(`cancel_reason_${reason}`)}${detail ? ` — ${detail}` : ""}`;
      return prev.map((o) =>
        o.id === order.id
          ? appendEvent(
              {
                ...o,
                status: "cancelled",
                queuePosition: null,
                paused: false,
                cancellationReason: reason,
                cancellationNote: detail,
              },
              "cancelled",
              note,
            )
          : o,
      );
    });
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
            <RefreshCw className="h-4 w-4" /> {L("refresh")}
          </button>
          <button type="button" onClick={() => setOrders((prev) => [makeTestOrder(), ...prev])} className={btnPrimary}>
            <Plus className="h-4 w-4" /> {L("create_test")}
          </button>
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L("demo_notice")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("search_placeholder")}
            className="w-full rounded-md border border-border/60 bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label={L("filter_status")} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
          <option value="all">{L("filter_status")}: {L("filter_all")}</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{L(`st_${s}`)}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} aria-label={L("filter_type")} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
          <option value="all">{L("filter_type")}: {L("filter_all")}</option>
          {ORDER_TYPES.map((t) => <option key={t} value={t}>{L(`type_${t}`)}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} aria-label={L("filter_priority")} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
          <option value="all">{L("filter_priority")}: {L("filter_all")}</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{L(`pr_${p}`)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{L("sort_by")}</span>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value as typeof sortDir)} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground">
            <option value="newest">{L("sort_newest")}</option>
            <option value="oldest">{L("sort_oldest")}</option>
          </select>
        </label>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-card/70 md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{L("col_id")}</th>
              <th className="px-3 py-2">{L("col_customer")}</th>
              <th className="px-3 py-2">{L("col_type")}</th>
              <th className="px-3 py-2 text-right">{L("col_credits")}</th>
              <th className="px-3 py-2">{L("col_status")}</th>
              <th className="px-3 py-2">{L("col_priority")}</th>
              <th className="px-3 py-2">{L("col_queue")}</th>
              <th className="px-3 py-2">{L("col_eta")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{o.id}</td>
                <td className="px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{o.customerName}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{o.customerEmail}</div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{L(`type_${o.type}`)}</td>
                <td className="px-3 py-2 text-right font-medium">{o.credits}</td>
                <td className="px-3 py-2"><StatusPill status={o.status} L={L} /></td>
                <td className="px-3 py-2"><PriorityPill priority={o.priority} L={L} /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{queueLabel(o, L)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{etaLabel(o, L)}</td>
                <td className="px-3 py-2">
                  <RowActions
                    L={L}
                    onOpen={() => setWorkspaceId(o.id)}
                    onEdit={() => setEditing({ ...o })}
                    onDuplicate={() => setOrders((prev) => [duplicateOrder(o), ...prev])}
                    onCancel={() => setCancelling(o)}
                    onDelete={() => setConfirmDelete(o)}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">{L("empty")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-muted-foreground">{o.id}</div>
                <h3 className="mt-0.5 truncate font-semibold text-foreground">{o.customerName}</h3>
                <p className="truncate text-xs text-muted-foreground">{o.customerEmail}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusPill status={o.status} L={L} />
                <PriorityPill priority={o.priority} L={L} />
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat label={L("col_type")} value={L(`type_${o.type}`)} />
              <Stat label={L("col_credits")} value={String(o.credits)} />
              <Stat label={L("col_queue")} value={queueLabel(o, L)} />
              <Stat label={L("col_eta")} value={etaLabel(o, L)} />
            </dl>
            <div className="mt-3 flex flex-wrap justify-end gap-1">
              <RowActions
                L={L}
                onOpen={() => setWorkspaceId(o.id)}
                onEdit={() => setEditing({ ...o })}
                onDuplicate={() => setOrders((prev) => [duplicateOrder(o), ...prev])}
                onCancel={() => setCancelling(o)}
                onDelete={() => setConfirmDelete(o)}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-8 text-center text-sm text-muted-foreground">{L("empty")}</div>
        )}
      </div>

      {workspaceOrder && (
        <OrderWorkspace
          order={workspaceOrder}
          L={L}
          onClose={() => setWorkspaceId(null)}
          onUpdate={(mut) => updateOrder(workspaceOrder.id, mut)}
          onOrdersMut={setOrders}
          onDuplicate={() => {
            setOrders((prev) => [duplicateOrder(workspaceOrder), ...prev]);
          }}
          onRequestCancel={() => setCancelling(workspaceOrder)}
        />
      )}

      {editing && (
        <OrderEditor
          key={editing.id}
          initial={editing}
          L={L}
          onCancel={() => setEditing(null)}
          onSave={(o) => {
            setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)));
            setEditing(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={L("confirm_delete_title")}
          body={`${confirmDelete.id} · ${confirmDelete.customerName}\n${L("confirm_delete_body")}`}
          L={L}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            setOrders((prev) => prev.filter((x) => x.id !== confirmDelete.id));
            setConfirmDelete(null);
          }}
        />
      )}

      {cancelling && (
        <CancelDialog
          order={cancelling}
          L={L}
          onCancel={() => setCancelling(null)}
          onConfirm={(reason, detail) => {
            doCancel(cancelling, reason, detail);
            setCancelling(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function queueLabel(o: OrderRecord, L: LocalOrders): string {
  if (o.paused) return L("queue_paused");
  if (o.status === "cancelled" || o.status === "delivered" || o.status === "draft" || o.status === "waiting_payment") return L("queue_none");
  if (o.queuePosition == null) return L("queue_in");
  return L("queue_pos", { n: o.queuePosition });
}

function etaLabel(o: OrderRecord, L: LocalOrders): string {
  const e = formatEstimate(o.estimatedMinutes);
  if (!e) return L("eta_none");
  if (e.unit === "minutes") return L("eta_min", { n: e.value });
  if (e.unit === "hours") return L("eta_hr", { n: e.value });
  return L("eta_day", { n: e.value });
}

function durationLabel(seconds: number | null, L: LocalOrders): string {
  if (seconds == null || seconds <= 0) return L("duration_none");
  if (seconds < 60) return L("dur_seconds", { n: seconds });
  return L("dur_minutes", { n: Math.round(seconds / 60) });
}

function fmtDate(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StatusPill({ status, L }: { status: OrderStatus; L: LocalOrders }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}>
      {L(`st_${status}`)}
    </span>
  );
}

function PriorityPill({ priority, L }: { priority: Priority; L: LocalOrders }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_TONE[priority]}`}>
      {L(`pr_${priority}`)}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function RowActions({
  L, onOpen, onEdit, onDuplicate, onCancel, onDelete,
}: {
  L: LocalOrders;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const btn = "inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground hover:bg-muted/50";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <button type="button" onClick={onOpen} className={btn} title={L("act_open")}>
        <Eye className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{L("act_open")}</span>
      </button>
      <button type="button" onClick={onEdit} className={btn} title={L("act_edit")}>
        <Pencil className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{L("act_edit")}</span>
      </button>
      <button type="button" onClick={onDuplicate} className={btn} title={L("act_duplicate")}>
        <Copy className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{L("act_duplicate")}</span>
      </button>
      <button type="button" onClick={onCancel} className={btn} title={L("act_cancel")}>
        <Ban className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{L("act_cancel")}</span>
      </button>
      <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700 hover:bg-rose-500/20 dark:text-rose-200" title={L("act_delete")}>
        <Trash2 className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{L("act_delete")}</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order workspace (tabs)
// ---------------------------------------------------------------------------

type Tab = "summary" | "timeline" | "queue" | "notify" | "notes" | "files" | "history";

function OrderWorkspace({
  order, L, onClose, onUpdate, onOrdersMut, onDuplicate, onRequestCancel,
}: {
  order: OrderRecord;
  L: LocalOrders;
  onClose: () => void;
  onUpdate: (mut: (o: OrderRecord) => OrderRecord) => void;
  onOrdersMut: React.Dispatch<React.SetStateAction<OrderRecord[]>>;
  onDuplicate: () => void;
  onRequestCancel: () => void;
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const { lang } = useI18n();

  const setStatus = (next: OrderStatus, kind: TimelineKind, note = "") => {
    onUpdate((o) => appendEvent({ ...o, status: next }, kind, note));
  };

  const setPriority = (p: Priority) => {
    onUpdate((o) =>
      appendEvent({ ...o, priority: p }, "priority_changed", `${L(`pr_${o.priority}`)} → ${L(`pr_${p}`)}`),
    );
    // Re-sort the queue after priority change
    setTimeout(() => onOrdersMut((prev) => reprioritizeQueue(prev)), 0);
  };

  const doQueue = (action: QueueAction) => {
    onOrdersMut((prev) => moveInQueue(prev, order.id, action));
    onUpdate((o) => appendEvent(o, "queue_moved", action));
  };

  const togglePause = () => {
    onUpdate((o) => appendEvent({ ...o, paused: !o.paused }, o.paused ? "resumed" : "paused"));
  };

  const resendNotification = (entry: NotificationLogEntry) => {
    onUpdate((o) => {
      const newLog: NotificationLogEntry = {
        ...entry,
        id: `nl-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        status: "sent",
      };
      return appendEvent({ ...o, notificationLogs: [...o.notificationLogs, newLog] }, "notification_resent", entry.channel);
    });
  };

  const addNote = (text: string) => {
    onUpdate((o) => {
      const note = { id: `n-${Math.random().toString(36).slice(2, 8)}`, author: "Admin", at: new Date().toISOString(), text };
      return appendEvent({ ...o, internalNotes: [...o.internalNotes, note] }, "note_added");
    });
  };

  const tabs: { key: Tab; label: string; icon: typeof Eye }[] = [
    { key: "summary", label: L("tab_summary"), icon: LayoutGrid },
    { key: "timeline", label: L("tab_timeline"), icon: History },
    { key: "queue", label: L("tab_queue"), icon: ListOrdered },
    { key: "notify", label: L("tab_notify"), icon: Mail },
    { key: "notes", label: L("tab_notes"), icon: StickyNote },
    { key: "files", label: L("tab_files"), icon: FileText },
    { key: "history", label: L("tab_history"), icon: History },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 sm:p-6">
      <div className="w-full max-w-5xl rounded-2xl border border-border/60 bg-background shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{order.id}</span>
              <ChevronRight className="h-3 w-3" />
              <span>{L(`type_${order.type}`)}</span>
            </div>
            <h2 className="mt-1 truncate font-[Fraunces] text-lg font-semibold text-foreground">{order.customerName}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <StatusPill status={order.status} L={L} />
              <PriorityPill priority={order.priority} L={L} />
              {order.paused && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-200">
                  {L("queue_paused")}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted/50" aria-label={L("close")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border/60 overflow-x-auto">
          <div className="flex min-w-max gap-1 px-2 py-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {tab === "summary" && (
            <SummaryTab order={order} L={L} lang={lang} onDuplicate={onDuplicate} onRequestCancel={onRequestCancel} />
          )}
          {tab === "timeline" && <TimelineTab order={order} L={L} lang={lang} />}
          {tab === "queue" && (
            <QueueTab
              order={order}
              L={L}
              setPriority={setPriority}
              doQueue={doQueue}
              togglePause={togglePause}
              setStatus={setStatus}
              onRequestCancel={onRequestCancel}
            />
          )}
          {tab === "notify" && <NotifyTab order={order} L={L} lang={lang} onResend={resendNotification} />}
          {tab === "notes" && <NotesTab order={order} L={L} lang={lang} onAdd={addNote} />}
          {tab === "files" && <FilesTab order={order} L={L} />}
          {tab === "history" && <TimelineTab order={order} L={L} lang={lang} reverse />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary tab
// ---------------------------------------------------------------------------

function SummaryTab({
  order, L, lang, onDuplicate, onRequestCancel,
}: {
  order: OrderRecord; L: LocalOrders; lang: Lang;
  onDuplicate: () => void; onRequestCancel: () => void;
}) {
  const langLabel = LANGS.find((l) => l.code === order.customerLanguage)?.label ?? order.customerLanguage;
  const notifSummary = order.notifications.filter((n) => n.enabled).map((n) => L(`n_${n.status}`)).join(" · ") || L("n_disabled");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Section title={L("section_summary")}>
        <Field label={L("f_name")} value={order.customerName} />
        <Field label={L("f_email")} value={order.customerEmail} />
        <Field label={L("f_language")} value={langLabel} />
        <Field label={L("f_country")} value={order.customerCountry} />
        <Field label={L("f_product")} value={order.productName} />
        <Field label={L("f_credits")} value={String(order.credits)} />
        <Field label={L("f_queue")} value={queueLabel(order, L)} />
        <Field label={L("f_priority")} value={L(`pr_${order.priority}`)} />
        <Field label={L("f_eta")} value={etaLabel(order, L)} />
        <Field label={L("f_payment")} value={L(`st_${order.status}`)} />
        <Field label={L("f_notif_status")} value={notifSummary} />
        <Field label={L("col_created")} value={fmtDate(order.createdAt, lang)} />
      </Section>
      <Section title={L("section_content")}>
        <Field label={L("f_recipient")} value={order.recipientName} />
        <Field label={L("f_occasion")} value={order.occasion} />
        <Field label={L("f_style")} value={order.style} />
        <Field label={L("f_duration")} value={durationLabel(order.durationSeconds, L)} />
        <Field label={L("f_notes")} value={order.customerNotes || "—"} multiline />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onDuplicate} className={btnBase}>
            <Copy className="h-3.5 w-3.5" /> {L("act_duplicate")}
          </button>
          <button type="button" onClick={onRequestCancel} className={btnDanger} disabled={order.status === "cancelled"}>
            <Ban className="h-3.5 w-3.5" /> {L("proc_cancel")}
          </button>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline tab
// ---------------------------------------------------------------------------

const TIMELINE_ICONS: Record<TimelineKind, typeof CheckCircle2> = {
  created: FileText,
  payment: CreditCard,
  queued: ListOrdered,
  processing_started: Play,
  processing_finished: CheckCircle2,
  notification_sent: Send,
  delivered: Truck,
  cancelled: Ban,
  priority_changed: AlertTriangle,
  queue_moved: ArrowUp,
  paused: PauseCircle,
  resumed: PlayCircle,
  status_changed: RefreshCw,
  note_added: StickyNote,
  notification_resent: Send,
};

function TimelineTab({
  order, L, lang, reverse,
}: { order: OrderRecord; L: LocalOrders; lang: Lang; reverse?: boolean }) {
  const events = reverse ? [...order.timeline].reverse() : order.timeline;
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">{L("timeline_empty")}</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const Icon = TIMELINE_ICONS[e.kind] ?? CheckCircle2;
        return (
          <li key={e.id} className="flex gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{L(`tl_${e.kind}`)}</span>
                <span className="text-[11px] text-muted-foreground">{fmtDate(e.at, lang)}</span>
              </div>
              {e.note && <p className="mt-1 text-xs text-muted-foreground break-words">{e.note}</p>}
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{e.author}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Queue & processing tab
// ---------------------------------------------------------------------------

function QueueTab({
  order, L, setPriority, doQueue, togglePause, setStatus, onRequestCancel,
}: {
  order: OrderRecord;
  L: LocalOrders;
  setPriority: (p: Priority) => void;
  doQueue: (a: QueueAction) => void;
  togglePause: () => void;
  setStatus: (s: OrderStatus, k: TimelineKind, note?: string) => void;
  onRequestCancel: () => void;
}) {
  const cancelled = order.status === "cancelled";
  const delivered = order.status === "delivered";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Section title={L("f_priority")}>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              disabled={cancelled}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                order.priority === p ? PRIORITY_TONE[p] : "border-border/60 text-muted-foreground hover:bg-muted/50"
              } disabled:opacity-40`}
            >
              {L(`pr_${p}`)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{L("queue_pos", { n: order.queuePosition ?? 0 })}</p>
      </Section>

      <Section title={L("col_queue")}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => doQueue("top")} disabled={cancelled || delivered} className={btnBase}>
            <ArrowUpToLine className="h-3.5 w-3.5" /> {L("queue_send_top")}
          </button>
          <button type="button" onClick={() => doQueue("up")} disabled={cancelled || delivered} className={btnBase}>
            <ArrowUp className="h-3.5 w-3.5" /> {L("queue_move_up")}
          </button>
          <button type="button" onClick={() => doQueue("down")} disabled={cancelled || delivered} className={btnBase}>
            <ArrowDown className="h-3.5 w-3.5" /> {L("queue_move_down")}
          </button>
          <button type="button" onClick={togglePause} disabled={cancelled || delivered} className={btnBase}>
            {order.paused ? <><PlayCircle className="h-3.5 w-3.5" /> {L("queue_resume")}</> : <><PauseCircle className="h-3.5 w-3.5" /> {L("queue_pause")}</>}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{etaLabel(order, L)}</p>
      </Section>

      <Section title={L("tab_queue")}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setStatus("processing", "processing_started")} disabled={cancelled || delivered} className={btnBase}>
            <Play className="h-3.5 w-3.5" /> {L("proc_start")}
          </button>
          <button type="button" onClick={() => setStatus("in_queue", "paused")} disabled={cancelled || delivered || order.status !== "processing"} className={btnBase}>
            <PauseCircle className="h-3.5 w-3.5" /> {L("proc_pause")}
          </button>
          <button type="button" onClick={() => setStatus("processing", "resumed")} disabled={cancelled || delivered} className={btnBase}>
            <PlayCircle className="h-3.5 w-3.5" /> {L("proc_resume")}
          </button>
          <button type="button" onClick={() => setStatus("ready", "processing_finished")} disabled={cancelled || delivered} className={btnBase}>
            <PackageCheck className="h-3.5 w-3.5" /> {L("proc_mark_ready")}
          </button>
          <button type="button" onClick={() => setStatus("delivered", "delivered")} disabled={cancelled || delivered} className={btnBase}>
            <Truck className="h-3.5 w-3.5" /> {L("proc_mark_delivered")}
          </button>
          <button type="button" onClick={onRequestCancel} disabled={cancelled} className={btnDanger}>
            <Ban className="h-3.5 w-3.5" /> {L("proc_cancel")}
          </button>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications history tab
// ---------------------------------------------------------------------------

function NotifyTab({
  order, L, lang, onResend,
}: { order: OrderRecord; L: LocalOrders; lang: Lang; onResend: (n: NotificationLogEntry) => void }) {
  const [preview, setPreview] = useState<NotificationLogEntry | null>(null);
  return (
    <div className="space-y-3">
      {order.notificationLogs.length === 0 && (
        <p className="text-sm text-muted-foreground">{L("nh_empty")}</p>
      )}
      {order.notificationLogs.map((n) => (
        <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground">
              {n.channel === "email" ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{L(n.subjectKey)}</div>
              <div className="text-[11px] text-muted-foreground">{L(`ch_${n.channel}`)} · {fmtDate(n.at, lang)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotifyStatusPill status={n.status} L={L} />
            <button type="button" onClick={() => setPreview(n)} className={btnBase}>
              <EyeIcon className="h-3.5 w-3.5" /> {L("nh_preview")}
            </button>
            <button type="button" onClick={() => onResend(n)} className={btnBase}>
              <Send className="h-3.5 w-3.5" /> {L("nh_send_again")}
            </button>
          </div>
        </div>
      ))}

      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-[Fraunces] text-base font-semibold text-foreground">{L(preview.subjectKey)}</h3>
              <button type="button" onClick={() => setPreview(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted/50" aria-label={L("close")}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{L(`ch_${preview.channel}`)} · {fmtDate(preview.at, lang)}</p>
            <p className="mt-3 text-sm text-foreground whitespace-pre-wrap">{L(preview.bodyKey)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifyStatusPill({ status, L }: { status: NotifyStatus; L: LocalOrders }) {
  const tone =
    status === "sent"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
      : status === "failed"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200"
      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}>{L(`n_${status}`)}</span>;
}

// ---------------------------------------------------------------------------
// Notes tab
// ---------------------------------------------------------------------------

function NotesTab({ order, L, lang, onAdd }: { order: OrderRecord; L: LocalOrders; lang: Lang; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L("notes_admin_only")}</span>
      </div>
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={L("notes_placeholder")}
          className={`${inputCls} min-h-[90px]`}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => { onAdd(text.trim()); setText(""); }}
            className={btnPrimary + " disabled:opacity-40 disabled:pointer-events-none"}
          >
            <Plus className="h-3.5 w-3.5" /> {L("notes_add")}
          </button>
        </div>
      </div>
      {order.internalNotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{L("notes_empty")}</p>
      ) : (
        <ul className="space-y-2">
          {[...order.internalNotes].reverse().map((n) => (
            <li key={n.id} className="rounded-lg border border-border/60 bg-card/60 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{n.author}</span>
                <span className="text-[11px] text-muted-foreground">{fmtDate(n.at, lang)}</span>
              </div>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generated files tab
// ---------------------------------------------------------------------------

const FILE_TONE: Record<GeneratedFile["kind"], string> = {
  card: "from-amber-100 to-rose-100 dark:from-amber-900/40 dark:to-rose-900/40",
  song: "from-indigo-100 to-sky-100 dark:from-indigo-900/40 dark:to-sky-900/40",
  video: "from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40",
  cartoon: "from-pink-100 to-fuchsia-100 dark:from-pink-900/40 dark:to-fuchsia-900/40",
  premium: "from-yellow-100 to-orange-100 dark:from-yellow-900/40 dark:to-orange-900/40",
};

function FilesTab({ order, L }: { order: OrderRecord; L: LocalOrders }) {
  if (order.files.length === 0) {
    return <p className="text-sm text-muted-foreground">{L("files_empty")}</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {order.files.map((f) => (
        <div key={f.id} className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
          <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${FILE_TONE[f.kind]}`}>
            <FileText className="h-10 w-10 text-foreground/40" />
          </div>
          <div className="p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{L(`file_kind_${f.kind}`)}</div>
            <div className="mt-0.5 font-mono text-sm text-foreground">{f.label}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">{L("file_placeholder")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={btnBase} disabled title={L("file_placeholder")}>
                {L("file_download")}
              </button>
              <button type="button" className={btnBase} disabled title={L("file_placeholder")}>
                {L("file_replace")}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor (metadata) — kept from Core
// ---------------------------------------------------------------------------

function OrderEditor({
  initial, L, onSave, onCancel,
}: { initial: OrderRecord; L: LocalOrders; onSave: (o: OrderRecord) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<OrderRecord>(initial);
  const errors: string[] = [];
  if (!draft.id.trim()) errors.push(L("err_id"));
  if (!draft.customerName.trim()) errors.push(L("err_customer"));
  if (!draft.type) errors.push(L("err_type"));
  if (!draft.status) errors.push(L("err_status"));
  if (draft.credits < 0) errors.push(L("err_credits"));

  const upd = <K extends keyof OrderRecord>(k: K, v: OrderRecord[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <ModalShell onClose={onCancel} title={`${L("act_edit")} — ${initial.id}`} L={L}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">{L("f_order_id")}</label>
          <input className={inputCls} value={draft.id} onChange={(e) => upd("id", e.target.value)} />
          <label className="block text-xs text-muted-foreground">{L("f_name")}</label>
          <input className={inputCls} value={draft.customerName} onChange={(e) => upd("customerName", e.target.value)} />
          <label className="block text-xs text-muted-foreground">{L("f_email")}</label>
          <input className={inputCls} value={draft.customerEmail} onChange={(e) => upd("customerEmail", e.target.value)} />
          <label className="block text-xs text-muted-foreground">{L("f_language")}</label>
          <select className={inputCls} value={draft.customerLanguage} onChange={(e) => upd("customerLanguage", e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <label className="block text-xs text-muted-foreground">{L("f_country")}</label>
          <input className={inputCls} value={draft.customerCountry} onChange={(e) => upd("customerCountry", e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">{L("f_order_type")}</label>
          <select className={inputCls} value={draft.type} onChange={(e) => upd("type", e.target.value as OrderType)}>
            {ORDER_TYPES.map((t) => <option key={t} value={t}>{L(`type_${t}`)}</option>)}
          </select>
          <label className="block text-xs text-muted-foreground">{L("f_product")}</label>
          <input className={inputCls} value={draft.productName} onChange={(e) => upd("productName", e.target.value)} />
          <label className="block text-xs text-muted-foreground">{L("f_credits")}</label>
          <input type="number" className={inputCls} value={draft.credits} min={0}
            onChange={(e) => upd("credits", Math.max(0, Number(e.target.value) || 0))} />
          <label className="block text-xs text-muted-foreground">{L("f_payment")}</label>
          <select className={inputCls} value={draft.status} onChange={(e) => upd("status", e.target.value as OrderStatus)}>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{L(`st_${s}`)}</option>)}
          </select>
          <label className="block text-xs text-muted-foreground">{L("f_priority")}</label>
          <select className={inputCls} value={draft.priority} onChange={(e) => upd("priority", e.target.value as Priority)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{L(`pr_${p}`)}</option>)}
          </select>
          <label className="block text-xs text-muted-foreground">{L("f_queue")}</label>
          <input type="number" className={inputCls} value={draft.queuePosition ?? ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              upd("queuePosition", raw === "" ? null : Math.max(1, Number(raw) || 1));
            }} placeholder="—" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="block text-xs text-muted-foreground">{L("f_recipient")}</label>
          <input className={inputCls} value={draft.recipientName} onChange={(e) => upd("recipientName", e.target.value)} />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-muted-foreground">{L("f_occasion")}</label>
              <input className={inputCls} value={draft.occasion} onChange={(e) => upd("occasion", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">{L("f_style")}</label>
              <input className={inputCls} value={draft.style} onChange={(e) => upd("style", e.target.value)} />
            </div>
          </div>
          <label className="block text-xs text-muted-foreground">{L("f_notes")}</label>
          <textarea className={`${inputCls} min-h-[90px]`} value={draft.customerNotes}
            onChange={(e) => upd("customerNotes", e.target.value)} />
        </div>
      </div>

      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-200">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnBase}>{L("cancel")}</button>
        <button type="button" disabled={errors.length > 0}
          onClick={() => onSave({ ...draft, timeline: [...draft.timeline, makeTimelineEvent("status_changed", "", "Admin")] })}
          className={btnPrimary + " disabled:opacity-50"}>
          {L("save")}
        </button>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Section / Field / Modals
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value, mono, multiline }: { label: string; value: string; mono?: boolean; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className={`min-w-0 text-foreground ${mono ? "font-mono text-[11px]" : ""} ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>{value}</div>
    </div>
  );
}

function ModalShell({ title, children, L, onClose }: { title: string; children: React.ReactNode; L: LocalOrders; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl border border-border/60 bg-background p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted/50" aria-label={L("close")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, L, onCancel, onConfirm }: { title: string; body: string; L: LocalOrders; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-5 shadow-xl">
        <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={btnBase}>{L("keep")}</button>
          <button type="button" onClick={onConfirm} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-rose-700">
            {L("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelDialog({
  order, L, onCancel, onConfirm,
}: {
  order: OrderRecord; L: LocalOrders;
  onCancel: () => void; onConfirm: (reason: CancellationReason, detail: string) => void;
}) {
  const [reason, setReason] = useState<CancellationReason>("customer_request");
  const [detail, setDetail] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-5 shadow-xl">
        <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">{L("cancel_dialog_title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{order.id} · {order.customerName}</p>
        <p className="mt-2 text-sm text-muted-foreground">{L("cancel_dialog_note")}</p>

        <label className="mt-4 block text-xs text-muted-foreground">{L("cancel_reason_label")}</label>
        <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value as CancellationReason)}>
          {CANCELLATION_REASONS.map((r) => <option key={r} value={r}>{L(`cancel_reason_${r}`)}</option>)}
        </select>

        <label className="mt-3 block text-xs text-muted-foreground">{L("cancel_details_label")}</label>
        <textarea className={`${inputCls} min-h-[70px]`} value={detail} onChange={(e) => setDetail(e.target.value)} />

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={btnBase}>{L("keep")}</button>
          <button type="button" onClick={() => onConfirm(reason, detail.trim())} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-rose-700">
            {L("proc_cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Suppress unused imports guarded for future extension
void ConfirmModal;
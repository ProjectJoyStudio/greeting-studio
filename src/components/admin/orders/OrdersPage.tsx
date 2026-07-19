import { useMemo, useState } from "react";
import {
  Plus, RefreshCw, Search, Eye, Pencil, Copy, Ban, Trash2, X,
  AlertTriangle, Mail, MessageSquare,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import {
  DEMO_ORDERS, ORDER_TYPES, ORDER_STATUSES, STATUS_TONE,
  formatEstimate, makeTestOrder, duplicateOrder,
  type OrderRecord, type OrderType, type OrderStatus, type NotifyStatus,
} from "@/lib/admin/orders";
import { useLocalOrders, type LocalOrders } from "./i18n";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";

export function OrdersPage() {
  const { lang } = useI18n();
  const L = useLocalOrders(lang);

  const [orders, setOrders] = useState<OrderRecord[]>(() => [...DEMO_ORDERS]);
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | OrderType>("all");
  const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");

  const [viewing, setViewing] = useState<OrderRecord | null>(null);
  const [editing, setEditing] = useState<OrderRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrderRecord | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<OrderRecord | null>(null);

  const filtered = useMemo(() => {
    void tick;
    const q = query.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (q) {
        const hay =
          `${o.id} ${o.customerName} ${o.customerEmail}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sortDir === "newest" ? -cmp : cmp;
    });
    return list;
  }, [orders, query, statusFilter, typeFilter, sortDir, tick]);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground sm:text-3xl">
            {L("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{L("subtitle")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTick((n) => n + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground hover:bg-muted/50"
          >
            <RefreshCw className="h-4 w-4" /> {L("refresh")}
          </button>
          <button
            type="button"
            onClick={() => setOrders((prev) => [makeTestOrder(), ...prev])}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label={L("filter_status")}
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
        >
          <option value="all">{L("filter_status")}: {L("filter_all")}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{L(`st_${s}`)}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          aria-label={L("filter_type")}
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
        >
          <option value="all">{L("filter_type")}: {L("filter_all")}</option>
          {ORDER_TYPES.map((t) => (
            <option key={t} value={t}>{L(`type_${t}`)}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{L("sort_by")}</span>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as typeof sortDir)}
            className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground"
          >
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
              <th className="px-3 py-2">{L("col_product")}</th>
              <th className="px-3 py-2 text-right">{L("col_credits")}</th>
              <th className="px-3 py-2">{L("col_status")}</th>
              <th className="px-3 py-2">{L("col_queue")}</th>
              <th className="px-3 py-2">{L("col_eta")}</th>
              <th className="px-3 py-2">{L("col_created")}</th>
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
                <td className="px-3 py-2 text-xs text-muted-foreground">{o.productName}</td>
                <td className="px-3 py-2 text-right font-medium">{o.credits}</td>
                <td className="px-3 py-2"><StatusPill status={o.status} L={L} /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{queueLabel(o, L)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{etaLabel(o, L)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{o.createdAt.slice(0, 10)}</td>
                <td className="px-3 py-2">
                  <RowActions
                    L={L}
                    onView={() => setViewing(o)}
                    onEdit={() => setEditing({ ...o })}
                    onDuplicate={() => setOrders((prev) => [duplicateOrder(o), ...prev])}
                    onCancel={() => setConfirmCancel(o)}
                    onDelete={() => setConfirmDelete(o)}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {L("empty")}
                </td>
              </tr>
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
              <StatusPill status={o.status} L={L} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat label={L("col_type")} value={L(`type_${o.type}`)} />
              <Stat label={L("col_product")} value={o.productName} />
              <Stat label={L("col_credits")} value={String(o.credits)} />
              <Stat label={L("col_queue")} value={queueLabel(o, L)} />
              <Stat label={L("col_eta")} value={etaLabel(o, L)} />
              <Stat label={L("col_created")} value={o.createdAt.slice(0, 10)} />
            </dl>
            <div className="mt-3 flex flex-wrap justify-end gap-1">
              <RowActions
                L={L}
                onView={() => setViewing(o)}
                onEdit={() => setEditing({ ...o })}
                onDuplicate={() => setOrders((prev) => [duplicateOrder(o), ...prev])}
                onCancel={() => setConfirmCancel(o)}
                onDelete={() => setConfirmDelete(o)}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-8 text-center text-sm text-muted-foreground">
            {L("empty")}
          </div>
        )}
      </div>

      {viewing && (
        <DetailsModal order={viewing} L={L} onClose={() => setViewing(null)} />
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
          body={`${confirmDelete.id} · ${confirmDelete.customerName}`}
          L={L}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            setOrders((prev) => prev.filter((x) => x.id !== confirmDelete.id));
            setConfirmDelete(null);
          }}
        />
      )}

      {confirmCancel && (
        <ConfirmModal
          title={L("confirm_cancel_title")}
          body={`${confirmCancel.id} — ${L("confirm_cancel_body")}`}
          L={L}
          onCancel={() => setConfirmCancel(null)}
          onConfirm={() => {
            setOrders((prev) =>
              prev.map((x) =>
                x.id === confirmCancel.id
                  ? { ...x, status: "cancelled", queuePosition: null }
                  : x,
              ),
            );
            setConfirmCancel(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers & subcomponents
// ---------------------------------------------------------------------------

function queueLabel(o: OrderRecord, L: LocalOrders): string {
  if (o.status === "cancelled" || o.status === "delivered" || o.status === "draft" || o.status === "waiting_payment") {
    return L("queue_none");
  }
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

function StatusPill({ status, L }: { status: OrderStatus; L: LocalOrders }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}
    >
      {L(`st_${status}`)}
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
  L, onView, onEdit, onDuplicate, onCancel, onDelete,
}: {
  L: LocalOrders;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const btn =
    "inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground hover:bg-muted/50";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <button type="button" onClick={onView} className={btn} title={L("act_view")}>
        <Eye className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{L("act_view")}</span>
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
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700 hover:bg-rose-500/20 dark:text-rose-200"
        title={L("act_delete")}
      >
        <Trash2 className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{L("act_delete")}</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Details modal
// ---------------------------------------------------------------------------

function DetailsModal({
  order, L, onClose,
}: {
  order: OrderRecord;
  L: LocalOrders;
  onClose: () => void;
}) {
  const langLabel = LANGS.find((l) => l.code === order.customerLanguage)?.label ?? order.customerLanguage;
  return (
    <ModalShell onClose={onClose} title={`${order.id} · ${order.customerName}`} L={L}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Section title={L("section_customer")}>
          <Field label={L("f_name")} value={order.customerName} />
          <Field label={L("f_email")} value={order.customerEmail} />
          <Field label={L("f_language")} value={langLabel} />
          <Field label={L("f_country")} value={order.customerCountry} />
        </Section>
        <Section title={L("section_order")}>
          <Field label={L("f_order_id")} value={order.id} mono />
          <Field label={L("f_order_type")} value={L(`type_${order.type}`)} />
          <Field label={L("f_credits")} value={String(order.credits)} />
          <Field label={L("f_payment")} value={L(`st_${order.status}`)} />
          <Field label={L("f_queue")} value={queueLabel(order, L)} />
          <Field label={L("f_eta")} value={etaLabel(order, L)} />
        </Section>
        <Section title={L("section_content")}>
          <Field label={L("f_recipient")} value={order.recipientName} />
          <Field label={L("f_occasion")} value={order.occasion} />
          <Field label={L("f_style")} value={order.style} />
          <Field label={L("f_duration")} value={durationLabel(order.durationSeconds, L)} />
          <Field label={L("f_notes")} value={order.customerNotes || "—"} multiline />
        </Section>
        <Section title={L("section_notify")}>
          <div className="space-y-2">
            {order.notifications.map((n) => (
              <div
                key={n.channel}
                className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 text-foreground">
                  {n.channel === "email" ? (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{n.channel === "email" ? L("ch_email") : L("ch_sms")}</span>
                  <span className="text-muted-foreground">
                    {n.enabled ? "✓" : "✕"}
                  </span>
                </div>
                <NotifyPill enabled={n.enabled} status={n.status} L={L} />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </ModalShell>
  );
}

function NotifyPill({ enabled, status, L }: { enabled: boolean; status: NotifyStatus; L: LocalOrders }) {
  if (!enabled) {
    return (
      <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
        {L("n_disabled")}
      </span>
    );
  }
  const tone =
    status === "sent"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
      : status === "failed"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200"
      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      {L(`n_${status}`)}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value, mono, multiline }: { label: string; value: string; mono?: boolean; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div
        className={`min-w-0 text-foreground ${mono ? "font-mono text-[11px]" : ""} ${
          multiline ? "whitespace-pre-wrap" : "truncate"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function OrderEditor({
  initial, L, onSave, onCancel,
}: {
  initial: OrderRecord;
  L: LocalOrders;
  onSave: (o: OrderRecord) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<OrderRecord>(initial);
  const errors: string[] = [];
  if (!draft.id.trim()) errors.push(L("err_id"));
  if (!draft.customerName.trim()) errors.push(L("err_customer"));
  if (!draft.type) errors.push(L("err_type"));
  if (!draft.status) errors.push(L("err_status"));
  if (draft.credits < 0) errors.push(L("err_credits"));

  const upd = <K extends keyof OrderRecord>(k: K, v: OrderRecord[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

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
          <label className="block text-xs text-muted-foreground">{L("col_product")}</label>
          <input className={inputCls} value={draft.productName} onChange={(e) => upd("productName", e.target.value)} />
          <label className="block text-xs text-muted-foreground">{L("f_credits")}</label>
          <input
            type="number"
            className={inputCls}
            value={draft.credits}
            min={0}
            onChange={(e) => upd("credits", Math.max(0, Number(e.target.value) || 0))}
          />
          <label className="block text-xs text-muted-foreground">{L("f_payment")}</label>
          <select className={inputCls} value={draft.status} onChange={(e) => upd("status", e.target.value as OrderStatus)}>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{L(`st_${s}`)}</option>)}
          </select>
          <label className="block text-xs text-muted-foreground">{L("f_queue")}</label>
          <input
            type="number"
            className={inputCls}
            value={draft.queuePosition ?? ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              upd("queuePosition", raw === "" ? null : Math.max(1, Number(raw) || 1));
            }}
            placeholder="—"
          />
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
          <textarea
            className={`${inputCls} min-h-[90px]`}
            value={draft.customerNotes}
            onChange={(e) => upd("customerNotes", e.target.value)}
          />
        </div>
      </div>

      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-200">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground hover:bg-muted/50"
        >
          {L("cancel")}
        </button>
        <button
          type="button"
          disabled={errors.length > 0}
          onClick={() => onSave(draft)}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
        >
          {L("save")}
        </button>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Modal shell & confirm
// ---------------------------------------------------------------------------

function ModalShell({
  title, children, L, onClose,
}: {
  title: string;
  children: React.ReactNode;
  L: LocalOrders;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl border border-border/60 bg-background p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted/50"
            aria-label={L("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({
  title, body, L, onCancel, onConfirm,
}: {
  title: string;
  body: string;
  L: LocalOrders;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-5 shadow-xl">
        <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground hover:bg-muted/50"
          >
            {L("keep")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-rose-700"
          >
            {L("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Copy, Trash2, Search, Power, PowerOff, Pencil, X, AlertTriangle,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useEconomy } from "@/lib/admin/economy";
import {
  DEFAULT_PACKAGES, nextId, nowIso,
  type CreditPackage, type PackageStatus,
} from "@/lib/admin/credit-packages";
import { useLocal } from "./i18n";

// ---------------------------------------------------------------------------
// Credit Packages — core module.
// Focused, single-screen management of temporary credit packages.
// All data lives in local component state — no backend is connected yet.
// ---------------------------------------------------------------------------

type StatusFilter = "all" | PackageStatus;
type SortKey = "order" | "credits" | "price" | "name";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";

export function CreditPackagesPage() {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const { state: economy } = useEconomy();
  const currency = economy.general.currency || "EUR";

  const [packages, setPackages] = useState<CreditPackage[]>(() => [...DEFAULT_PACKAGES]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [editing, setEditing] = useState<CreditPackage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CreditPackage | null>(null);

  const filtered = useMemo(() => {
    let list = packages.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "price") return a.priceEUR - b.priceEUR;
      if (sortKey === "credits")
        return b.credits + b.bonusCredits - (a.credits + a.bonusCredits);
      return a.displayOrder - b.displayOrder;
    });
    return list;
  }, [packages, filter, query, sortKey]);

  const usedIds = useMemo(() => new Set(packages.map((p) => p.internalId)), [packages]);

  const toggleStatus = (id: string) => {
    setPackages((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: p.status === "active" ? "inactive" : "active",
              active: p.status !== "active",
              updatedAt: nowIso(),
            }
          : p,
      ),
    );
  };

  const duplicate = (p: CreditPackage) => {
    let base = `${p.internalId}_COPY`;
    let candidate = base;
    let i = 2;
    while (usedIds.has(candidate)) candidate = `${base}_${i++}`;
    const copy: CreditPackage = {
      ...p,
      id: nextId("pkg"),
      internalId: candidate,
      name: `${p.name} (Copy)`,
      status: "draft",
      active: false,
      displayOrder: Math.max(0, ...packages.map((x) => x.displayOrder)) + 1,
      updatedAt: nowIso(),
    };
    setPackages((prev) => [...prev, copy]);
  };

  const remove = (id: string) => {
    setPackages((prev) => prev.filter((p) => p.id !== id));
    setConfirmDelete(null);
  };

  const save = (p: CreditPackage) => {
    setPackages((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      const withTs = { ...p, active: p.status === "active", updatedAt: nowIso() };
      return exists ? prev.map((x) => (x.id === p.id ? withTs : x)) : [...prev, withTs];
    });
    setEditing(null);
  };

  const startNew = () => {
    const p: CreditPackage = {
      id: nextId("pkg"),
      internalId: "",
      name: "",
      credits: 10,
      bonusCredits: 0,
      priceEUR: 5,
      productionCostPerCreditEUR: 0.15,
      badge: "none",
      color: "#F7C873",
      active: false,
      status: "draft",
      visibleCountries: [],
      visibleLanguages: [],
      startDate: null,
      endDate: null,
      notes: "",
      displayOrder: Math.max(0, ...packages.map((x) => x.displayOrder)) + 1,
      updatedAt: nowIso(),
    };
    setEditing(p);
  };

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground sm:text-3xl">
            {L("cp_title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{L("cp_subtitle_core")}</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> {L("cp_create")}
        </button>
      </header>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L("cp_demo_notice")}</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("cp_search")}
            className="w-full rounded-md border border-border/60 bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
          aria-label={L("col_status")}
        >
          <option value="all">{L("cp_filter_all")}</option>
          <option value="active">{L("cp_filter_active")}</option>
          <option value="inactive">{L("cp_filter_inactive")}</option>
          <option value="draft">{L("cp_filter_draft")}</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{L("cp_sort_by")}</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="order">{L("col_order")}</option>
            <option value="credits">{L("col_total")}</option>
            <option value="price">{L("col_price")}</option>
            <option value="name">{L("col_name")}</option>
          </select>
        </label>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-card/70 md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{L("col_name")}</th>
              <th className="px-3 py-2">{L("col_id")}</th>
              <th className="px-3 py-2 text-right">{L("col_base")}</th>
              <th className="px-3 py-2 text-right">{L("col_bonus")}</th>
              <th className="px-3 py-2 text-right">{L("col_total")}</th>
              <th className="px-3 py-2 text-right">{L("col_price")}</th>
              <th className="px-3 py-2">{L("col_status")}</th>
              <th className="px-3 py-2 text-right">{L("col_order")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: p.color }}
                    />
                    <span className="font-medium text-foreground">{p.name || "—"}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {p.internalId}
                </td>
                <td className="px-3 py-2 text-right">{p.credits}</td>
                <td className="px-3 py-2 text-right">+{p.bonusCredits}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {p.credits + p.bonusCredits}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatMoney(p.priceEUR, currency)}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={p.status} L={L} />
                </td>
                <td className="px-3 py-2 text-right">{p.displayOrder}</td>
                <td className="px-3 py-2">
                  <RowActions
                    p={p}
                    L={L}
                    onEdit={() => setEditing({ ...p })}
                    onDuplicate={() => duplicate(p)}
                    onToggle={() => toggleStatus(p.id)}
                    onDelete={() => setConfirmDelete(p)}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {L("empty_state")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: p.color }}
                  />
                  <h3 className="truncate font-semibold text-foreground">{p.name || "—"}</h3>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {p.internalId}
                </p>
              </div>
              <StatusPill status={p.status} L={L} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat label={L("col_base")} value={String(p.credits)} />
              <Stat label={L("col_bonus")} value={`+${p.bonusCredits}`} />
              <Stat label={L("col_total")} value={String(p.credits + p.bonusCredits)} />
              <Stat label={L("col_price")} value={formatMoney(p.priceEUR, currency)} />
              <Stat label={L("col_order")} value={String(p.displayOrder)} />
            </dl>
            <div className="mt-3 flex flex-wrap justify-end gap-1">
              <RowActions
                p={p}
                L={L}
                onEdit={() => setEditing({ ...p })}
                onDuplicate={() => duplicate(p)}
                onToggle={() => toggleStatus(p.id)}
                onDelete={() => setConfirmDelete(p)}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
            {L("empty_state")}
          </p>
        )}
      </div>

      {editing && (
        <PackageEditor
          key={editing.id}
          initial={editing}
          currency={currency}
          otherIds={new Set(
            packages.filter((p) => p.id !== editing.id).map((p) => p.internalId),
          )}
          onSave={save}
          onCancel={() => setEditing(null)}
          L={L}
        />
      )}

      {confirmDelete && (
        <ConfirmDelete
          pkg={confirmDelete}
          currency={currency}
          L={L}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete.id)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatusPill({ status, L }: { status: PackageStatus; L: (k: string) => string }) {
  const cls =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "draft"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {L(`st_${status}`)}
    </span>
  );
}

function RowActions({
  p, L, onEdit, onDuplicate, onToggle, onDelete,
}: {
  p: CreditPackage;
  L: (k: string) => string;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1 text-muted-foreground">
      <IconBtn label={L("act_edit")} onClick={onEdit}><Pencil className="h-4 w-4" /></IconBtn>
      <IconBtn label={L("act_duplicate")} onClick={onDuplicate}><Copy className="h-4 w-4" /></IconBtn>
      <IconBtn label={L("act_toggle")} onClick={onToggle}>
        {p.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
      </IconBtn>
      <IconBtn label={L("act_delete")} onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  children, onClick, label,
}: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Editor modal
// ---------------------------------------------------------------------------

interface Errors {
  name?: string;
  internalId?: string;
  credits?: string;
  bonusCredits?: string;
  priceEUR?: string;
  displayOrder?: string;
}

function PackageEditor({
  initial, currency, otherIds, onSave, onCancel, L,
}: {
  initial: CreditPackage;
  currency: string;
  otherIds: Set<string>;
  onSave: (p: CreditPackage) => void;
  onCancel: () => void;
  L: (k: string) => string;
}) {
  const [draft, setDraft] = useState<CreditPackage>({ ...initial });
  const [attempted, setAttempted] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);

  const errors: Errors = useMemo(() => {
    const e: Errors = {};
    if (!draft.name.trim()) e.name = L("err_name_required");
    const idTrim = draft.internalId.trim();
    if (!idTrim) e.internalId = L("err_id_required");
    else if (otherIds.has(idTrim)) e.internalId = L("err_id_unique");
    if (!Number.isFinite(draft.credits) || draft.credits <= 0) e.credits = L("err_base_gtz");
    if (!Number.isFinite(draft.bonusCredits) || draft.bonusCredits < 0)
      e.bonusCredits = L("err_bonus_neg");
    if (!Number.isFinite(draft.priceEUR) || draft.priceEUR < 0) e.priceEUR = L("err_price_neg");
    if (!Number.isFinite(draft.displayOrder) || draft.displayOrder < 0)
      e.displayOrder = L("err_order_neg");
    return e;
  }, [draft, otherIds, L]);

  const hasErrors = Object.keys(errors).length > 0;
  const total = Math.max(0, (draft.credits || 0) + (draft.bonusCredits || 0));
  const perCredit = total > 0 ? draft.priceEUR / total : 0;

  const set = <K extends keyof CreditPackage>(k: K, v: CreditPackage[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleCancel = () => {
    if (dirty && !window.confirm(L("unsaved_confirm"))) return;
    onCancel();
  };

  // Warn on browser close/refresh while editing.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const submit = () => {
    setAttempted(true);
    if (hasErrors) return;
    onSave({ ...draft, internalId: draft.internalId.trim(), name: draft.name.trim() });
  };

  const showErr = (k: keyof Errors) => (attempted ? errors[k] : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/60 bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <h3 className="truncate font-[Fraunces] text-lg font-semibold text-foreground">
              {initial.name || L("cp_create")}
            </h3>
            {dirty && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-300">
                • {L("unsaved_changes")}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleCancel}
            aria-label={L("act_cancel")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Field label={L("fld_internal_id")} error={showErr("internalId")}>
            <input
              value={draft.internalId}
              onChange={(e) => set("internalId", e.target.value)}
              placeholder="STARTER"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label={L("fld_name")} error={showErr("name")}>
            <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field label={L("fld_credits")} error={showErr("credits")}>
            <input
              type="number" min={1} value={draft.credits}
              onChange={(e) => set("credits", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label={L("fld_bonus")} error={showErr("bonusCredits")}>
            <input
              type="number" min={0} value={draft.bonusCredits}
              onChange={(e) => set("bonusCredits", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label={L("fld_total_auto")}>
            <input value={total} readOnly className={`${inputCls} bg-muted/40 font-medium`} />
          </Field>
          <Field label={L("fld_currency")}>
            <input value={currency} readOnly className={`${inputCls} bg-muted/40`} />
          </Field>
          <Field label={L("fld_customer_price")} error={showErr("priceEUR")}>
            <input
              type="number" min={0} step="0.01" value={draft.priceEUR}
              onChange={(e) => set("priceEUR", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label={L("fld_effective_ppc")}>
            <input
              value={total > 0 ? formatMoney(perCredit, currency, 4) : "—"}
              readOnly className={`${inputCls} bg-muted/40`}
            />
          </Field>
          <Field label={L("fld_order")} error={showErr("displayOrder")}>
            <input
              type="number" min={0} value={draft.displayOrder}
              onChange={(e) => set("displayOrder", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label={L("fld_status")}>
            <select
              value={draft.status}
              onChange={(e) => set("status", e.target.value as PackageStatus)}
              className={inputCls}
            >
              <option value="draft">{L("st_draft")}</option>
              <option value="active">{L("st_active")}</option>
              <option value="inactive">{L("st_inactive")}</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={L("fld_notes")}>
              <textarea
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className={`${inputCls} resize-y`}
              />
            </Field>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted/50"
          >
            {L("act_cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={attempted && hasErrors}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {L("act_save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {error}
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

function ConfirmDelete({
  pkg, currency, L, onCancel, onConfirm,
}: {
  pkg: CreditPackage;
  currency: string;
  L: (k: string) => string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-5 shadow-2xl">
        <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">
          {L("confirm_delete_title")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{L("confirm_delete_body")}</p>
        <dl className="mt-4 space-y-1 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{L("col_name")}</dt>
            <dd className="font-medium text-foreground">{pkg.name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{L("col_total")}</dt>
            <dd className="font-medium text-foreground">{pkg.credits + pkg.bonusCredits}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{L("col_price")}</dt>
            <dd className="font-medium text-foreground">
              {formatMoney(pkg.priceEUR, currency)}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            {L("keep_package")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
          >
            {L("delete_package")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function formatMoney(amount: number, currency: string, digits = 2): string {
  try {
    return new Intl.NumberFormat("en-EN", {
      style: "currency",
      currency,
      maximumFractionDigits: digits,
      minimumFractionDigits: Math.min(2, digits),
    }).format(amount);
  } catch {
    return `${amount.toFixed(digits)} ${currency}`;
  }
}
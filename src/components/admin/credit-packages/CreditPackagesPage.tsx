import { useEffect, useMemo, useState } from "react";
import {
  Plus, Copy, Trash2, Search, Power, PowerOff, Pencil, X, AlertTriangle,
  Eye, Star, ArrowLeft, Check,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import { useEconomy } from "@/lib/admin/economy";
import {
  DEFAULT_PACKAGES, nextId, nowIso,
  COUNTRY_OPTIONS, BADGE_KINDS,
  computeEffectiveStatus, isVisibleToCustomer, computeSavings,
  type CreditPackage, type PackageStatus, type EffectiveStatus, type BadgeKind,
} from "@/lib/admin/credit-packages";
import { useLocal } from "./i18n";

// ---------------------------------------------------------------------------
// Credit Packages — core module + extended settings and customer preview.
// All data is held in local component state — no backend is connected yet.
// ---------------------------------------------------------------------------

type StatusFilter = "all" | EffectiveStatus;
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
  const [showCustomerView, setShowCustomerView] = useState(false);

  const withEffective = useMemo(
    () => packages.map((p) => ({ ...p, effective: computeEffectiveStatus(p) })),
    [packages],
  );

  const filtered = useMemo(() => {
    let list = withEffective.filter((p) => {
      if (filter !== "all" && p.effective !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.customerName.toLowerCase().includes(q) &&
          !p.internalId.toLowerCase().includes(q)
        ) return false;
      }
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
  }, [withEffective, filter, query, sortKey]);

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
    const base = `${p.internalId}_COPY`;
    let candidate = base;
    let i = 2;
    while (usedIds.has(candidate)) candidate = `${base}_${i++}`;
    const copy: CreditPackage = {
      ...p,
      id: nextId("pkg"),
      internalId: candidate,
      name: `${p.name} (Copy)`,
      customerName: `${p.customerName} (Copy)`,
      highlighted: false,
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
      // Enforce single highlight
      const cleared = p.highlighted
        ? prev.map((x) => (x.id !== p.id ? { ...x, highlighted: false } : x))
        : prev;
      const exists = cleared.some((x) => x.id === p.id);
      const withTs: CreditPackage = {
        ...p,
        active: p.status === "active",
        updatedAt: nowIso(),
      };
      return exists ? cleared.map((x) => (x.id === p.id ? withTs : x)) : [...cleared, withTs];
    });
    setEditing(null);
  };

  const startNew = () => {
    const p: CreditPackage = {
      id: nextId("pkg"),
      internalId: "",
      name: "",
      customerName: "",
      description: "",
      originalPriceEUR: null,
      iconEmoji: "🎁",
      highlighted: false,
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

  const highlightedOther = (excludeId: string) =>
    packages.find((x) => x.id !== excludeId && x.highlighted) || null;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground sm:text-3xl">
            {L("cp_title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{L("cp_subtitle_core")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomerView(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground hover:bg-muted/50"
          >
            <Eye className="h-4 w-4" /> {L("preview_customer_view")}
          </button>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {L("cp_create")}
          </button>
        </div>
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
          <option value="scheduled">{L("cp_filter_scheduled")}</option>
          <option value="inactive">{L("cp_filter_inactive")}</option>
          <option value="draft">{L("cp_filter_draft")}</option>
          <option value="expired">{L("cp_filter_expired")}</option>
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
              <th className="px-3 py-2">{L("col_badge")}</th>
              <th className="px-3 py-2 text-right">{L("col_total")}</th>
              <th className="px-3 py-2 text-right">{L("col_price")}</th>
              <th className="px-3 py-2 text-right">{L("col_effective_ppc")}</th>
              <th className="px-3 py-2">{L("col_status")}</th>
              <th className="px-3 py-2">{L("col_visibility")}</th>
              <th className="px-3 py-2">{L("col_period")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const total = p.credits + p.bonusCredits;
              const ppc = total > 0 ? p.priceEUR / total : 0;
              return (
                <tr key={p.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: p.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-foreground">
                            {p.name || "—"}
                          </span>
                          {p.highlighted && (
                            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {p.internalId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {p.badge === "none" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <BadgeChip badge={p.badge} L={L} />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {total}
                    {p.bonusCredits > 0 && (
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ({p.credits}+{p.bonusCredits})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(p.priceEUR, currency)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {total > 0 ? formatMoney(ppc, currency, 4) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={p.effective} L={L} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <VisibilitySummary p={p} lang={lang} L={L} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <PeriodSummary p={p} L={L} />
                  </td>
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
              );
            })}
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
        {filtered.map((p) => {
          const total = p.credits + p.bonusCredits;
          const ppc = total > 0 ? p.priceEUR / total : 0;
          return (
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
                    {p.highlighted && (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {p.internalId}
                  </p>
                </div>
                <StatusPill status={p.effective} L={L} />
              </div>
              <div className="mt-2">
                {p.badge !== "none" && <BadgeChip badge={p.badge} L={L} />}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Stat label={L("col_total")} value={`${total} (${p.credits}+${p.bonusCredits})`} />
                <Stat label={L("col_price")} value={formatMoney(p.priceEUR, currency)} />
                <Stat label={L("col_effective_ppc")} value={total > 0 ? formatMoney(ppc, currency, 4) : "—"} />
                <Stat label={L("col_order")} value={String(p.displayOrder)} />
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {L("col_visibility")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    <VisibilitySummary p={p} lang={lang} L={L} />
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {L("col_period")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    <PeriodSummary p={p} L={L} />
                  </dd>
                </div>
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
          );
        })}
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
          lang={lang}
          otherIds={new Set(
            packages.filter((p) => p.id !== editing.id).map((p) => p.internalId),
          )}
          currentHighlight={highlightedOther(editing.id)}
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

      {showCustomerView && (
        <CustomerAllPreview
          packages={packages}
          currency={currency}
          initialLang={lang}
          L={L}
          onClose={() => setShowCustomerView(false)}
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

function StatusPill({ status, L }: { status: EffectiveStatus; L: (k: string) => string }) {
  const cls =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "scheduled"
        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
        : status === "expired"
          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
          : status === "draft"
            ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
            : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {L(`st_${status}`)}
    </span>
  );
}

function BadgeChip({ badge, L }: { badge: BadgeKind; L: (k: string) => string }) {
  const cls: Record<BadgeKind, string> = {
    none: "",
    popular: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    best_value: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    limited: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    new: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls[badge]}`}>
      {L(`badge_${badge}`)}
    </span>
  );
}

function VisibilitySummary({
  p, lang, L,
}: { p: CreditPackage; lang: Lang; L: (k: string) => string }) {
  const c = p.visibleCountries;
  const l = p.visibleLanguages;
  const cLabel = c.length === 0
    ? L("vis_all_countries")
    : c.length <= 2
      ? c.map((code) => COUNTRY_OPTIONS.find((x) => x.code === code)?.labels[lang] ?? code).join(" + ")
      : L("vis_n_countries").replace("{n}", String(c.length));
  const lLabel = l.length === 0
    ? L("vis_all_languages")
    : l.length <= 3
      ? l.map((x) => x.toUpperCase()).join(" + ")
      : L("vis_n_languages").replace("{n}", String(l.length));
  return (
    <span>
      <span className="block">{cLabel}</span>
      <span className="block">{lLabel}</span>
    </span>
  );
}

function PeriodSummary({
  p, L,
}: { p: CreditPackage; L: (k: string) => string }) {
  const fmt = (iso: string | null) => iso ?? "";
  if (!p.startDate && !p.endDate) return <>{L("period_open")}</>;
  if (p.startDate && p.endDate) return <>{L("period_between").replace("{a}", fmt(p.startDate)).replace("{b}", fmt(p.endDate))}</>;
  if (p.endDate) return <>{L("period_until").replace("{d}", fmt(p.endDate))}</>;
  return <>{L("period_from").replace("{d}", fmt(p.startDate))}</>;
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
// Editor modal with extended sections and live customer card preview
// ---------------------------------------------------------------------------

interface Errors {
  name?: string;
  customerName?: string;
  internalId?: string;
  credits?: string;
  bonusCredits?: string;
  priceEUR?: string;
  originalPriceEUR?: string;
  displayOrder?: string;
  endDate?: string;
  countries?: string;
  languages?: string;
}

function PackageEditor({
  initial, currency, lang, otherIds, currentHighlight, onSave, onCancel, L,
}: {
  initial: CreditPackage;
  currency: string;
  lang: Lang;
  otherIds: Set<string>;
  currentHighlight: CreditPackage | null;
  onSave: (p: CreditPackage) => void;
  onCancel: () => void;
  L: (k: string) => string;
}) {
  const [draft, setDraft] = useState<CreditPackage>({ ...initial });
  const [attempted, setAttempted] = useState(false);
  const [allCountries, setAllCountries] = useState(draft.visibleCountries.length === 0);
  const [allLanguages, setAllLanguages] = useState(draft.visibleLanguages.length === 0);
  const [noEndDate, setNoEndDate] = useState(!draft.endDate);
  const [countryQuery, setCountryQuery] = useState("");
  const [highlightConfirm, setHighlightConfirm] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );

  const errors: Errors = useMemo(() => {
    const e: Errors = {};
    if (!draft.name.trim()) e.name = L("err_name_required");
    if (!draft.customerName.trim()) e.customerName = L("err_customer_name_required");
    const idTrim = draft.internalId.trim();
    if (!idTrim) e.internalId = L("err_id_required");
    else if (otherIds.has(idTrim)) e.internalId = L("err_id_unique");
    if (!Number.isFinite(draft.credits) || draft.credits <= 0) e.credits = L("err_base_gtz");
    if (!Number.isFinite(draft.bonusCredits) || draft.bonusCredits < 0)
      e.bonusCredits = L("err_bonus_neg");
    if (!Number.isFinite(draft.priceEUR) || draft.priceEUR < 0) e.priceEUR = L("err_price_neg");
    if (
      draft.originalPriceEUR !== null &&
      Number.isFinite(draft.originalPriceEUR) &&
      draft.originalPriceEUR < draft.priceEUR
    ) e.originalPriceEUR = L("err_original_lt_price");
    if (!Number.isFinite(draft.displayOrder) || draft.displayOrder < 0)
      e.displayOrder = L("err_order_neg");
    if (draft.startDate && draft.endDate && new Date(draft.endDate) < new Date(draft.startDate))
      e.endDate = L("err_end_before_start");
    if (!allCountries && draft.visibleCountries.length === 0)
      e.countries = L("err_country_required");
    if (!allLanguages && draft.visibleLanguages.length === 0)
      e.languages = L("err_language_required");
    return e;
  }, [draft, otherIds, L, allCountries, allLanguages]);

  const hasErrors = Object.keys(errors).length > 0;
  const total = Math.max(0, (draft.credits || 0) + (draft.bonusCredits || 0));
  const perCredit = total > 0 ? draft.priceEUR / total : 0;
  const savings = computeSavings(draft.priceEUR, draft.originalPriceEUR);

  const set = <K extends keyof CreditPackage>(k: K, v: CreditPackage[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleCountry = (code: string) =>
    set(
      "visibleCountries",
      draft.visibleCountries.includes(code)
        ? draft.visibleCountries.filter((x) => x !== code)
        : [...draft.visibleCountries, code],
    );

  const toggleLanguage = (code: Lang) =>
    set(
      "visibleLanguages",
      draft.visibleLanguages.includes(code)
        ? draft.visibleLanguages.filter((x) => x !== code)
        : [...draft.visibleLanguages, code],
    );

  const handleCancel = () => {
    if (dirty && !window.confirm(L("unsaved_confirm"))) return;
    onCancel();
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const commitSave = () => {
    const finalDraft: CreditPackage = {
      ...draft,
      internalId: draft.internalId.trim(),
      name: draft.name.trim(),
      customerName: draft.customerName.trim(),
      visibleCountries: allCountries ? [] : draft.visibleCountries,
      visibleLanguages: allLanguages ? [] : draft.visibleLanguages,
      endDate: noEndDate ? null : draft.endDate,
    };
    onSave(finalDraft);
  };

  const submit = () => {
    setAttempted(true);
    if (hasErrors) return;
    // Highlight replacement confirmation
    if (draft.highlighted && currentHighlight) {
      setHighlightConfirm(true);
      return;
    }
    commitSave();
  };

  const showErr = (k: keyof Errors) => (attempted ? errors[k] : undefined);

  const filteredCountries = COUNTRY_OPTIONS.filter((c) => {
    if (!countryQuery) return true;
    const q = countryQuery.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.labels[lang] ?? c.labels.en).toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 sm:p-4">
      <div className="my-4 w-full max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
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

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {/* Core values */}
            <FormSection title={L("sec_core")}>
              <div className="grid gap-3 sm:grid-cols-2">
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
                      rows={2}
                      className={`${inputCls} resize-y`}
                    />
                  </Field>
                </div>
              </div>
            </FormSection>

            {/* Customer presentation */}
            <FormSection title={L("sec_customer")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={L("fld_customer_name")} error={showErr("customerName")}>
                  <input
                    value={draft.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label={L("fld_icon")}>
                  <input
                    value={draft.iconEmoji}
                    onChange={(e) => set("iconEmoji", e.target.value.slice(0, 4))}
                    className={inputCls}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={L("fld_description")}>
                    <textarea
                      value={draft.description}
                      onChange={(e) => set("description", e.target.value)}
                      rows={2}
                      className={`${inputCls} resize-y`}
                    />
                  </Field>
                </div>
                <Field label={L("fld_badge")}>
                  <select
                    value={draft.badge}
                    onChange={(e) => set("badge", e.target.value as BadgeKind)}
                    className={inputCls}
                  >
                    {BADGE_KINDS.map((b) => (
                      <option key={b} value={b}>{L(`badge_${b}`)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={L("fld_accent")}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draft.color}
                      onChange={(e) => set("color", e.target.value)}
                      className="h-8 w-12 shrink-0 rounded-md border border-border/60 bg-background"
                    />
                    <input
                      value={draft.color}
                      onChange={(e) => set("color", e.target.value)}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                </Field>
                <Field label={L("fld_original_price")} error={showErr("originalPriceEUR")}>
                  <input
                    type="number" min={0} step="0.01"
                    value={draft.originalPriceEUR ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      set("originalPriceEUR", v === "" ? null : Number(v));
                    }}
                    className={inputCls}
                  />
                </Field>
                <div className="flex items-center gap-2 self-end pb-1">
                  <input
                    id="fld_highlight"
                    type="checkbox"
                    checked={draft.highlighted}
                    onChange={(e) => set("highlighted", e.target.checked)}
                  />
                  <label htmlFor="fld_highlight" className="flex items-center gap-1 text-sm text-foreground">
                    <Star className="h-4 w-4 text-amber-500" />
                    {L("fld_highlight")}
                  </label>
                </div>
              </div>
            </FormSection>

            {/* Availability */}
            <FormSection title={L("sec_availability")}>
              <div className="space-y-4">
                {/* Countries */}
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allCountries}
                      onChange={(e) => {
                        setAllCountries(e.target.checked);
                        if (e.target.checked) set("visibleCountries", []);
                      }}
                    />
                    <span className="font-medium text-foreground">{L("fld_all_countries")}</span>
                  </label>
                  {!allCountries && (
                    <div className="mt-2 rounded-md border border-border/60 bg-muted/20 p-2">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          placeholder={L("fld_country_search")}
                          className="w-full rounded-md border border-border/60 bg-background py-1 pl-8 pr-2 text-sm outline-none focus:border-primary/60"
                        />
                      </div>
                      <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                        {filteredCountries.map((c) => {
                          const on = draft.visibleCountries.includes(c.code);
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => toggleCountry(c.code)}
                              className={`flex items-center justify-between rounded-md px-2 py-1 text-left text-sm ${
                                on ? "bg-primary/15 text-foreground" : "hover:bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              <span>
                                <span className="font-mono text-xs text-muted-foreground mr-2">{c.code}</span>
                                {c.labels[lang] ?? c.labels.en}
                              </span>
                              {on && <Check className="h-4 w-4 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                      {showErr("countries") && (
                        <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                          {showErr("countries")}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Languages */}
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allLanguages}
                      onChange={(e) => {
                        setAllLanguages(e.target.checked);
                        if (e.target.checked) set("visibleLanguages", []);
                      }}
                    />
                    <span className="font-medium text-foreground">{L("fld_all_languages")}</span>
                  </label>
                  {!allLanguages && (
                    <div className="mt-2 flex flex-wrap gap-1.5 rounded-md border border-border/60 bg-muted/20 p-2">
                      {LANGS.map((lg) => {
                        const on = draft.visibleLanguages.includes(lg.code);
                        return (
                          <button
                            key={lg.code}
                            type="button"
                            onClick={() => toggleLanguage(lg.code)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                              on
                                ? "border-primary/60 bg-primary/15 text-foreground"
                                : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            <span className="font-mono">{lg.flag}</span>
                            <span>{lg.label}</span>
                          </button>
                        );
                      })}
                      {showErr("languages") && (
                        <p className="w-full text-[11px] font-medium text-rose-600 dark:text-rose-400">
                          {showErr("languages")}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={L("fld_start_date")}>
                    <input
                      type="date"
                      value={draft.startDate ?? ""}
                      onChange={(e) => set("startDate", e.target.value || null)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={L("fld_end_date")} error={showErr("endDate")}>
                    <input
                      type="date"
                      value={draft.endDate ?? ""}
                      disabled={noEndDate}
                      onChange={(e) => set("endDate", e.target.value || null)}
                      className={`${inputCls} ${noEndDate ? "opacity-50" : ""}`}
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={noEndDate}
                      onChange={(e) => {
                        setNoEndDate(e.target.checked);
                        if (e.target.checked) set("endDate", null);
                      }}
                    />
                    <span className="text-foreground">{L("fld_no_end_date")}</span>
                  </label>
                </div>
              </div>
            </FormSection>
          </div>

          {/* Live customer card preview */}
          <aside className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {L("preview_live_card")}
              </h4>
            </div>
            <CustomerCard pkg={draft} currency={currency} L={L} internal />
            <p className="text-[11px] text-muted-foreground">{L("preview_internal_note")}</p>
            {draft.originalPriceEUR !== null && savings.amount > 0 && (
              <p className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                {L("preview_savings")}: {formatMoney(savings.amount, currency)} ({savings.percent.toFixed(0)}%)
              </p>
            )}
          </aside>
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

      {highlightConfirm && currentHighlight && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-5 shadow-2xl">
            <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">
              {L("highlight_replace_title")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {L("highlight_replace_body").replace("{name}", currentHighlight.name)}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setHighlightConfirm(false)}
                className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted/50"
              >
                {L("act_cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setHighlightConfirm(false);
                  commitSave();
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                {L("highlight_replace_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/50 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
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
// Customer card (used both in editor preview and in all-packages preview)
// ---------------------------------------------------------------------------

function CustomerCard({
  pkg, currency, L, internal = false,
}: {
  pkg: CreditPackage;
  currency: string;
  L: (k: string) => string;
  internal?: boolean;
}) {
  const total = pkg.credits + pkg.bonusCredits;
  const savings = computeSavings(pkg.priceEUR, pkg.originalPriceEUR);
  const displayName = pkg.customerName || pkg.name || "—";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm ${
        pkg.highlighted ? "border-primary/70 ring-2 ring-primary/30" : "border-border/60"
      }`}
      style={{ boxShadow: pkg.highlighted ? `0 0 0 1px ${pkg.color}55` : undefined }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: pkg.color }}
      />
      {pkg.highlighted && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          <Star className="h-3 w-3 fill-current" /> {L("highlighted_ribbon")}
        </span>
      )}
      <div className="mt-2 flex items-start gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
          style={{ background: `${pkg.color}33` }}
          aria-hidden
        >
          {pkg.iconEmoji || "🎁"}
        </span>
        <div className="min-w-0">
          <h4 className="truncate font-[Fraunces] text-lg font-semibold text-foreground">
            {displayName}
          </h4>
          {pkg.badge !== "none" && <div className="mt-1"><BadgeChip badge={pkg.badge} L={L} /></div>}
        </div>
      </div>
      {pkg.description && (
        <p className="mt-2 text-sm text-muted-foreground">{pkg.description}</p>
      )}

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{L("base_credits_label")}</dt>
          <dd className="font-medium text-foreground">{pkg.credits}</dd>
        </div>
        {pkg.bonusCredits > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{L("bonus_credits_label")}</dt>
            <dd className="font-medium text-emerald-700 dark:text-emerald-300">+{pkg.bonusCredits}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border/60 pt-1">
          <dt className="text-muted-foreground">{L("total_credits_label")}</dt>
          <dd className="font-semibold text-foreground">{total}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-[Fraunces] text-2xl font-semibold text-foreground">
          {formatMoney(pkg.priceEUR, currency)}
        </span>
        {pkg.originalPriceEUR !== null && savings.amount > 0 && (
          <>
            <span className="text-sm text-muted-foreground line-through">
              {formatMoney(pkg.originalPriceEUR, currency)}
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              {L("save_pct").replace("{p}", savings.percent.toFixed(0))}
            </span>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={internal}
        className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-70"
      >
        {L("buy_credits")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// All packages customer preview
// ---------------------------------------------------------------------------

function CustomerAllPreview({
  packages, currency, initialLang, L, onClose,
}: {
  packages: CreditPackage[];
  currency: string;
  initialLang: Lang;
  L: (k: string) => string;
  onClose: () => void;
}) {
  const [country, setCountry] = useState<string>("");
  const [previewLang, setPreviewLang] = useState<string>(initialLang);

  const visible = useMemo(() => {
    return [...packages]
      .filter((p) =>
        isVisibleToCustomer(p, {
          country: country || undefined,
          language: previewLang || undefined,
        }),
      )
      .sort((a, b) => {
        if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
        return a.displayOrder - b.displayOrder;
      });
  }, [packages, country, previewLang]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/98 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" /> {L("preview_back")}
          </button>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
            {L("preview_internal_note")}
          </span>
        </div>

        <h2 className="mt-4 font-[Fraunces] text-2xl font-semibold text-foreground sm:text-3xl">
          {L("preview_all_title")}
        </h2>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
          <label className="text-xs">
            <span className="mb-1 block font-medium text-muted-foreground">
              {L("preview_country")}
            </span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputCls}
            >
              <option value="">{L("vis_all_countries")}</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.labels[previewLang] ?? c.labels.en}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-muted-foreground">
              {L("preview_language")}
            </span>
            <select
              value={previewLang}
              onChange={(e) => setPreviewLang(e.target.value)}
              className={inputCls}
            >
              {LANGS.map((lg) => (
                <option key={lg.code} value={lg.code}>
                  {lg.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
            {L("preview_no_packages")}
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <CustomerCard key={p.id} pkg={p} currency={currency} L={L} internal />
            ))}
          </div>
        )}
      </div>
    </div>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
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
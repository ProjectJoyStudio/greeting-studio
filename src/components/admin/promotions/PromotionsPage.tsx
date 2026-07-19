import { useEffect, useMemo, useState } from "react";
import {
  Plus, Pencil, Copy, Trash2, Power, PowerOff, Eye, Search, X, AlertTriangle,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import { useEconomy } from "@/lib/admin/economy";
import { DEFAULT_PACKAGES, COUNTRY_OPTIONS } from "@/lib/admin/credit-packages";
import {
  DEFAULT_PROMOTIONS, DEFAULT_PROMO_CODES,
  PROMOTION_TYPES, PROMO_CODE_TYPES,
  computePromotionStatus, computePromoCodeStatus,
  usesPercentage, usesFixedDiscount, usesBonusCredits, usesBonusPercentage,
  previewPromotionBenefit, previewPromoCodeBenefit,
  collectPromotionWarnings, collectPromoCodeWarnings, hasDangerousWarning,
  benefitLabel, promoCodeBenefitLabel, sanitizeCode, nextPromoId, nowIso,
  type Promotion, type PromoCode, type PromotionType,
  type EffectivePromoStatus, type PromoCodeDiscountType, type OverlapWarning,
} from "@/lib/admin/promotions";
import { useLocalPromo, type LocalPromo } from "./i18n";

// ---------------------------------------------------------------------------
// Promotions and Promo Codes — frontend-only working module.
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";

type Tab = "promotions" | "codes";

export function PromotionsPage() {
  const { lang } = useI18n();
  const L = useLocalPromo(lang);
  const { state: economy } = useEconomy();
  const currency = economy.general.currency || "EUR";
  const minMarginPercent = economy.safety.minProfitMargin ?? 30;
  const costPerCreditEUR = DEFAULT_PACKAGES[0]?.productionCostPerCreditEUR ?? 0.15;

  const [tab, setTab] = useState<Tab>("promotions");
  const [promotions, setPromotions] = useState<Promotion[]>(() => [...DEFAULT_PROMOTIONS]);
  const [codes, setCodes] = useState<PromoCode[]>(() => [...DEFAULT_PROMO_CODES]);

  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [previewingPromo, setPreviewingPromo] = useState<Promotion | null>(null);
  const [previewingCode, setPreviewingCode] = useState<PromoCode | null>(null);
  const [confirmDeletePromo, setConfirmDeletePromo] = useState<Promotion | null>(null);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<PromoCode | null>(null);

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
            onClick={() => setEditingPromo(newPromotion(promotions))}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground hover:bg-muted/50"
          >
            <Plus className="h-4 w-4" /> {L("create_promotion")}
          </button>
          <button
            type="button"
            onClick={() => setEditingCode(newPromoCode())}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {L("create_code")}
          </button>
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L("demo_notice")}</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-md border border-border/60 bg-card/50 p-1 text-sm">
        <TabButton active={tab === "promotions"} onClick={() => setTab("promotions")}>
          {L("tab_promotions")}
        </TabButton>
        <TabButton active={tab === "codes"} onClick={() => setTab("codes")}>
          {L("tab_codes")}
        </TabButton>
      </div>

      {tab === "promotions" ? (
        <PromotionsTable
          items={promotions}
          lang={lang}
          L={L}
          currency={currency}
          onEdit={(p) => setEditingPromo({ ...p })}
          onDuplicate={(p) => setPromotions((prev) => [...prev, duplicatePromotion(p, prev)])}
          onToggle={(id) =>
            setPromotions((prev) => prev.map((p) => (
              p.id === id
                ? {
                    ...p,
                    status: p.status === "active" ? "inactive" : "active",
                    updatedAt: nowIso(),
                  }
                : p
            )))
          }
          onPreview={(p) => setPreviewingPromo(p)}
          onDelete={(p) => setConfirmDeletePromo(p)}
        />
      ) : (
        <CodesTable
          items={codes}
          promotions={promotions}
          lang={lang}
          L={L}
          currency={currency}
          onEdit={(c) => setEditingCode({ ...c })}
          onDuplicate={(c) => setCodes((prev) => [...prev, duplicatePromoCode(c, prev)])}
          onToggle={(id) =>
            setCodes((prev) => prev.map((c) => (
              c.id === id ? { ...c, active: !c.active, updatedAt: nowIso() } : c
            )))
          }
          onPreview={(c) => setPreviewingCode(c)}
          onDelete={(c) => setConfirmDeleteCode(c)}
        />
      )}

      {editingPromo && (
        <PromotionEditor
          key={editingPromo.id}
          initial={editingPromo}
          otherPromotions={promotions.filter((p) => p.id !== editingPromo.id)}
          codes={codes}
          currency={currency}
          lang={lang}
          L={L}
          minMarginPercent={minMarginPercent}
          costPerCreditEUR={costPerCreditEUR}
          onSave={(p) => {
            setPromotions((prev) => {
              const exists = prev.some((x) => x.id === p.id);
              return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
            });
            setEditingPromo(null);
          }}
          onCancel={() => setEditingPromo(null)}
        />
      )}

      {editingCode && (
        <PromoCodeEditor
          key={editingCode.id}
          initial={editingCode}
          otherCodes={codes.filter((c) => c.id !== editingCode.id)}
          promotions={promotions}
          currency={currency}
          lang={lang}
          L={L}
          minMarginPercent={minMarginPercent}
          costPerCreditEUR={costPerCreditEUR}
          onSave={(c) => {
            setCodes((prev) => {
              const exists = prev.some((x) => x.id === c.id);
              return exists ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c];
            });
            setEditingCode(null);
          }}
          onCancel={() => setEditingCode(null)}
        />
      )}

      {previewingPromo && (
        <PreviewModal
          title={previewingPromo.customerTitle || previewingPromo.name}
          L={L}
          currency={currency}
          onClose={() => setPreviewingPromo(null)}
        >
          <PromotionPreviewBody p={previewingPromo} L={L} currency={currency} />
        </PreviewModal>
      )}

      {previewingCode && (
        <PreviewModal
          title={previewingCode.code}
          L={L}
          currency={currency}
          onClose={() => setPreviewingCode(null)}
        >
          <PromoCodePreviewBody c={previewingCode} L={L} currency={currency} />
        </PreviewModal>
      )}

      {confirmDeletePromo && (
        <ConfirmDelete
          title={L("confirm_delete_promo_title")}
          L={L}
          lines={[
            confirmDeletePromo.name,
            benefitLabel(confirmDeletePromo),
            L(`st_${computePromotionStatus(confirmDeletePromo)}`),
          ]}
          onCancel={() => setConfirmDeletePromo(null)}
          onConfirm={() => {
            setPromotions((prev) => prev.filter((p) => p.id !== confirmDeletePromo.id));
            setConfirmDeletePromo(null);
          }}
        />
      )}

      {confirmDeleteCode && (
        <ConfirmDelete
          title={L("confirm_delete_code_title")}
          L={L}
          lines={[
            confirmDeleteCode.code,
            promoCodeBenefitLabel(confirmDeleteCode),
            L(`st_${computePromoCodeStatus(confirmDeleteCode)}`),
          ]}
          onCancel={() => setConfirmDeleteCode(null)}
          onConfirm={() => {
            setCodes((prev) => prev.filter((c) => c.id !== confirmDeleteCode.id));
            setConfirmDeleteCode(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function PromotionsTable({
  items, lang, L, currency, onEdit, onDuplicate, onToggle, onPreview, onDelete,
}: {
  items: Promotion[];
  lang: Lang;
  L: LocalPromo;
  currency: string;
  onEdit: (p: Promotion) => void;
  onDuplicate: (p: Promotion) => void;
  onToggle: (id: string) => void;
  onPreview: (p: Promotion) => void;
  onDelete: (p: Promotion) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EffectivePromoStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PromotionType>("all");
  const [targetFilter, setTargetFilter] = useState<"all" | "all_packages" | "specific">("all");
  const [sortKey, setSortKey] = useState<"start" | "end" | "edited">("edited");

  const filtered = useMemo(() => {
    let list = items.map((p) => ({ ...p, effective: computePromotionStatus(p) }));
    list = list.filter((p) => {
      if (statusFilter !== "all" && p.effective !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (targetFilter === "all_packages" && !p.applyAllPackages) return false;
      if (targetFilter === "specific" && p.applyAllPackages) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.internalId.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sortKey === "start") return (a.startDate ?? "").localeCompare(b.startDate ?? "");
      if (sortKey === "end") return (a.endDate ?? "").localeCompare(b.endDate ?? "");
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [items, query, statusFilter, typeFilter, targetFilter, sortKey]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("search")}
            className="w-full rounded-md border border-border/60 bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
          aria-label={L("filter_status")}
        >
          <option value="all">{L("filter_all")}</option>
          {["draft", "scheduled", "active", "inactive", "expired"].map((s) => (
            <option key={s} value={s}>{L(`st_${s}`)}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
          aria-label={L("filter_type")}
        >
          <option value="all">{L("filter_all")}</option>
          {PROMOTION_TYPES.map((t) => (
            <option key={t} value={t}>{L(`type_${t}`)}</option>
          ))}
        </select>
        <select
          value={targetFilter}
          onChange={(e) => setTargetFilter(e.target.value as typeof targetFilter)}
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
          aria-label={L("filter_target")}
        >
          <option value="all">{L("filter_all")}</option>
          <option value="all_packages">{L("target_all")}</option>
          <option value="specific">{L("target_specific")}</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{L("sort_by")}</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="edited">{L("col_last_edited")}</option>
            <option value="start">{L("col_start")}</option>
            <option value="end">{L("col_end")}</option>
          </select>
        </label>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-card/70 md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{L("col_name")}</th>
              <th className="px-3 py-2">{L("col_type")}</th>
              <th className="px-3 py-2">{L("col_benefit")}</th>
              <th className="px-3 py-2">{L("col_applies")}</th>
              <th className="px-3 py-2">{L("col_start")}</th>
              <th className="px-3 py-2">{L("col_end")}</th>
              <th className="px-3 py-2">{L("col_status")}</th>
              <th className="px-3 py-2">{L("col_usage")}</th>
              <th className="px-3 py-2">{L("col_last_edited")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{p.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{p.internalId}</div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{L(`type_${p.type}`)}</td>
                <td className="px-3 py-2 font-medium">{benefitLabel(p)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {p.applyAllPackages ? L("target_all") : `${p.packageIds.length} pkg`}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.startDate ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.endDate ?? "—"}</td>
                <td className="px-3 py-2"><StatusPill status={p.effective} L={L} /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{L("usage_placeholder")}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {p.updatedAt.slice(0, 10)}
                </td>
                <td className="px-3 py-2">
                  <RowActions
                    isActive={p.status === "active"}
                    L={L}
                    onEdit={() => onEdit(p)}
                    onDuplicate={() => onDuplicate(p)}
                    onToggle={() => onToggle(p.id)}
                    onPreview={() => onPreview(p)}
                    onDelete={() => onDelete(p)}
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

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-foreground">{p.name}</h3>
                <p className="font-mono text-[11px] text-muted-foreground">{p.internalId}</p>
              </div>
              <StatusPill status={p.effective} L={L} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat label={L("col_type")} value={L(`type_${p.type}`)} />
              <Stat label={L("col_benefit")} value={benefitLabel(p)} />
              <Stat label={L("col_start")} value={p.startDate ?? "—"} />
              <Stat label={L("col_end")} value={p.endDate ?? "—"} />
            </dl>
            <div className="mt-3 flex flex-wrap justify-end gap-1">
              <RowActions
                isActive={p.status === "active"} L={L}
                onEdit={() => onEdit(p)}
                onDuplicate={() => onDuplicate(p)}
                onToggle={() => onToggle(p.id)}
                onPreview={() => onPreview(p)}
                onDelete={() => onDelete(p)}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
            {L("empty")}
          </p>
        )}
      </div>
    </>
  );
}

function CodesTable({
  items, promotions, lang, L, currency, onEdit, onDuplicate, onToggle, onPreview, onDelete,
}: {
  items: PromoCode[];
  promotions: Promotion[];
  lang: Lang;
  L: LocalPromo;
  currency: string;
  onEdit: (c: PromoCode) => void;
  onDuplicate: (c: PromoCode) => void;
  onToggle: (id: string) => void;
  onPreview: (c: PromoCode) => void;
  onDelete: (c: PromoCode) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EffectivePromoStatus>("all");
  const [sortKey, setSortKey] = useState<"expiration" | "limit" | "edited">("edited");

  const filtered = useMemo(() => {
    let list = items.map((c) => ({ ...c, effective: computePromoCodeStatus(c) }));
    list = list.filter((c) => {
      if (statusFilter !== "all" && c.effective !== statusFilter) return false;
      if (query && !c.code.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortKey === "expiration") return (a.expirationDate ?? "").localeCompare(b.expirationDate ?? "");
      if (sortKey === "limit") return a.usageLimit - b.usageLimit;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [items, query, statusFilter, sortKey]);

  const promoName = (id: string | null) =>
    id ? promotions.find((p) => p.id === id)?.name ?? "—" : "—";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("search")}
            className="w-full rounded-md border border-border/60 bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
        >
          <option value="all">{L("filter_all")}</option>
          {["scheduled", "active", "inactive", "expired"].map((s) => (
            <option key={s} value={s}>{L(`st_${s}`)}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{L("sort_by")}</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="edited">{L("col_last_edited")}</option>
            <option value="expiration">{L("col_expiration")}</option>
            <option value="limit">{L("col_limit")}</option>
          </select>
        </label>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-card/70 md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{L("col_code")}</th>
              <th className="px-3 py-2">{L("col_description")}</th>
              <th className="px-3 py-2">{L("col_benefit")}</th>
              <th className="px-3 py-2">{L("col_link")}</th>
              <th className="px-3 py-2">{L("col_limit")}</th>
              <th className="px-3 py-2">{L("col_usage")}</th>
              <th className="px-3 py-2">{L("col_expiration")}</th>
              <th className="px-3 py-2">{L("col_status")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-mono font-medium">{c.code}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{c.description}</td>
                <td className="px-3 py-2">{promoCodeBenefitLabel(c)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{promoName(c.linkedPromotionId)}</td>
                <td className="px-3 py-2 text-xs">{c.usageLimit === 0 ? "∞" : c.usageLimit}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{L("usage_placeholder")}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{c.expirationDate ?? "—"}</td>
                <td className="px-3 py-2"><StatusPill status={c.effective} L={L} /></td>
                <td className="px-3 py-2">
                  <RowActions
                    isActive={c.active} L={L}
                    onEdit={() => onEdit(c)}
                    onDuplicate={() => onDuplicate(c)}
                    onToggle={() => onToggle(c.id)}
                    onPreview={() => onPreview(c)}
                    onDelete={() => onDelete(c)}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {L("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-mono font-semibold text-foreground">{c.code}</h3>
              <StatusPill status={c.effective} L={L} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat label={L("col_benefit")} value={promoCodeBenefitLabel(c)} />
              <Stat label={L("col_limit")} value={c.usageLimit === 0 ? "∞" : String(c.usageLimit)} />
              <Stat label={L("col_expiration")} value={c.expirationDate ?? "—"} />
              <Stat label={L("col_link")} value={promoName(c.linkedPromotionId)} />
            </dl>
            <div className="mt-3 flex flex-wrap justify-end gap-1">
              <RowActions
                isActive={c.active} L={L}
                onEdit={() => onEdit(c)}
                onDuplicate={() => onDuplicate(c)}
                onToggle={() => onToggle(c.id)}
                onPreview={() => onPreview(c)}
                onDelete={() => onDelete(c)}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
            {L("empty")}
          </p>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Editor: Promotion
// ---------------------------------------------------------------------------

function PromotionEditor({
  initial, otherPromotions, codes, currency, lang, L,
  minMarginPercent, costPerCreditEUR, onSave, onCancel,
}: {
  initial: Promotion;
  otherPromotions: Promotion[];
  codes: PromoCode[];
  currency: string;
  lang: Lang;
  L: LocalPromo;
  minMarginPercent: number;
  costPerCreditEUR: number;
  onSave: (p: Promotion) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Promotion>({ ...initial });
  const [attempted, setAttempted] = useState(false);
  const [noEnd, setNoEnd] = useState(!draft.endDate);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const otherIds = useMemo(
    () => new Set(otherPromotions.map((p) => p.internalId)),
    [otherPromotions],
  );

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = L("err_name_required");
    const idTrim = draft.internalId.trim();
    if (!idTrim) e.internalId = L("err_id_required");
    else if (otherIds.has(idTrim)) e.internalId = L("err_id_unique");
    if (usesPercentage(draft.type) || usesBonusPercentage(draft.type)) {
      const v = usesPercentage(draft.type) ? draft.percentageValue : draft.bonusPercentage;
      if (v < 0 || v > 100) e.percentageValue = L("err_pct_range");
    }
    if (usesFixedDiscount(draft.type) && draft.fixedDiscountEUR < 0) e.fixedDiscountEUR = L("err_negative");
    if (usesBonusCredits(draft.type) && draft.bonusCredits < 0) e.bonusCredits = L("err_negative");
    if (draft.minimumPurchaseEUR < 0) e.minimumPurchaseEUR = L("err_negative");
    if (draft.startDate && draft.endDate && new Date(draft.endDate) < new Date(draft.startDate))
      e.endDate = L("err_end_before_start");
    if (!draft.applyAllPackages && draft.packageIds.length === 0)
      e.packages = L("err_packages_required");
    if (!draft.applyAllCountries && draft.countries.length === 0)
      e.countries = L("err_country_required");
    if (!draft.applyAllLanguages && draft.languages.length === 0)
      e.languages = L("err_language_required");
    if (draft.status === "active" && computePromotionStatus(draft) === "expired")
      e.status = L("err_expired_active");
    return e;
  }, [draft, otherIds, L]);

  const warnings = useMemo(
    () => collectPromotionWarnings(draft, otherPromotions, codes, {
      minMarginPercent, costPerCreditEUR,
    }),
    [draft, otherPromotions, codes, minMarginPercent, costPerCreditEUR],
  );

  const hasErrors = Object.keys(errors).length > 0;

  const set = <K extends keyof Promotion>(k: K, v: Promotion[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleCancel = () => {
    if (dirty && !window.confirm(L("unsaved_confirm"))) return;
    onCancel();
  };

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const submit = () => {
    setAttempted(true);
    if (hasErrors) return;
    if (hasDangerousWarning(warnings)) {
      if (!window.confirm(`${L("confirm_dangerous_title")}\n\n${L("confirm_dangerous_body")}`))
        return;
    }
    onSave({
      ...draft,
      internalId: draft.internalId.trim(),
      name: draft.name.trim(),
      endDate: noEnd ? null : draft.endDate,
      updatedAt: nowIso(),
    });
  };

  const showErr = (k: string) => (attempted ? errors[k] : undefined);

  return (
    <ModalShell title={initial.name || L("create_promotion")} dirty={dirty} L={L} onClose={handleCancel}>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <FormSection title={L("sec_basic")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L("fld_internal_id")} error={showErr("internalId")}>
                <input value={draft.internalId} onChange={(e) => set("internalId", e.target.value)}
                  className={`${inputCls} font-mono`} />
              </Field>
              <Field label={L("fld_name")} error={showErr("name")}>
                <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </Field>
              <Field label={L("fld_customer_title")}>
                <input value={draft.customerTitle} onChange={(e) => set("customerTitle", e.target.value)} className={inputCls} />
              </Field>
              <Field label={L("fld_customer_desc")}>
                <input value={draft.customerDescription} onChange={(e) => set("customerDescription", e.target.value)} className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={L("fld_internal_notes")}>
                  <textarea value={draft.internalNotes} onChange={(e) => set("internalNotes", e.target.value)}
                    rows={2} className={`${inputCls} resize-y`} />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection title={L("sec_settings")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L("fld_type")}>
                <select value={draft.type} onChange={(e) => set("type", e.target.value as PromotionType)} className={inputCls}>
                  {PROMOTION_TYPES.map((t) => (
                    <option key={t} value={t}>{L(`type_${t}`)}</option>
                  ))}
                </select>
              </Field>
              {usesPercentage(draft.type) && (
                <Field label={L("fld_percentage")} error={showErr("percentageValue")}>
                  <input type="number" min={0} max={100} value={draft.percentageValue}
                    onChange={(e) => set("percentageValue", Number(e.target.value))} className={inputCls} />
                </Field>
              )}
              {usesFixedDiscount(draft.type) && (
                <Field label={L("fld_fixed")} error={showErr("fixedDiscountEUR")}>
                  <input type="number" min={0} step="0.01" value={draft.fixedDiscountEUR}
                    onChange={(e) => set("fixedDiscountEUR", Number(e.target.value))} className={inputCls} />
                </Field>
              )}
              {usesBonusCredits(draft.type) && (
                <Field label={L("fld_bonus_credits")} error={showErr("bonusCredits")}>
                  <input type="number" min={0} value={draft.bonusCredits}
                    onChange={(e) => set("bonusCredits", Number(e.target.value))} className={inputCls} />
                </Field>
              )}
              {usesBonusPercentage(draft.type) && (
                <Field label={L("fld_bonus_percent")} error={showErr("percentageValue")}>
                  <input type="number" min={0} max={100} value={draft.bonusPercentage}
                    onChange={(e) => set("bonusPercentage", Number(e.target.value))} className={inputCls} />
                </Field>
              )}
              <Field label={L("fld_min_purchase")} error={showErr("minimumPurchaseEUR")}>
                <input type="number" min={0} step="0.01" value={draft.minimumPurchaseEUR}
                  onChange={(e) => set("minimumPurchaseEUR", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label={L("fld_max_discount")}>
                <input type="number" min={0} step="0.01"
                  value={draft.maximumDiscountEUR ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    set("maximumDiscountEUR", v === "" ? null : Number(v));
                  }}
                  className={inputCls} />
              </Field>
            </div>
          </FormSection>

          <FormSection title={L("sec_targeting")}>
            <div className="space-y-4">
              <SelectAllOrMany
                label={L("packages")}
                allLabel={L("fld_apply_all_packages")}
                all={draft.applyAllPackages}
                onAllChange={(b) => {
                  set("applyAllPackages", b);
                  if (b) set("packageIds", []);
                }}
                error={showErr("packages")}
              >
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {DEFAULT_PACKAGES.map((pkg) => (
                    <label key={pkg.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox"
                        checked={draft.packageIds.includes(pkg.id)}
                        onChange={(e) => set(
                          "packageIds",
                          e.target.checked
                            ? [...draft.packageIds, pkg.id]
                            : draft.packageIds.filter((x) => x !== pkg.id),
                        )} />
                      <span>{pkg.name}</span>
                    </label>
                  ))}
                </div>
              </SelectAllOrMany>

              <SelectAllOrMany
                label={L("countries")}
                allLabel={L("fld_apply_all_countries")}
                all={draft.applyAllCountries}
                onAllChange={(b) => {
                  set("applyAllCountries", b);
                  if (b) set("countries", []);
                }}
                error={showErr("countries")}
              >
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {COUNTRY_OPTIONS.map((c) => (
                    <label key={c.code} className="flex items-center gap-2 text-sm">
                      <input type="checkbox"
                        checked={draft.countries.includes(c.code)}
                        onChange={(e) => set(
                          "countries",
                          e.target.checked
                            ? [...draft.countries, c.code]
                            : draft.countries.filter((x) => x !== c.code),
                        )} />
                      <span>{c.labels[lang] ?? c.labels.en}</span>
                    </label>
                  ))}
                </div>
              </SelectAllOrMany>

              <SelectAllOrMany
                label={L("languages")}
                allLabel={L("fld_apply_all_languages")}
                all={draft.applyAllLanguages}
                onAllChange={(b) => {
                  set("applyAllLanguages", b);
                  if (b) set("languages", []);
                }}
                error={showErr("languages")}
              >
                <div className="flex flex-wrap gap-2">
                  {LANGS.map((l) => (
                    <label key={l.code} className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 text-sm">
                      <input type="checkbox"
                        checked={draft.languages.includes(l.code)}
                        onChange={(e) => set(
                          "languages",
                          e.target.checked
                            ? [...draft.languages, l.code]
                            : draft.languages.filter((x) => x !== l.code),
                        )} />
                      {l.flag}
                    </label>
                  ))}
                </div>
              </SelectAllOrMany>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.firstPurchaseOnly}
                    onChange={(e) => set("firstPurchaseOnly", e.target.checked)} />
                  {L("fld_first_purchase_only")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.oneUsePerUser}
                    onChange={(e) => set("oneUsePerUser", e.target.checked)} />
                  {L("fld_one_per_user")}
                </label>
              </div>
            </div>
          </FormSection>

          <FormSection title={L("sec_period")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L("fld_start")}>
                <input type="date" value={draft.startDate ?? ""}
                  onChange={(e) => set("startDate", e.target.value || null)} className={inputCls} />
              </Field>
              <Field label={L("fld_end")} error={showErr("endDate")}>
                <input type="date" value={draft.endDate ?? ""} disabled={noEnd}
                  onChange={(e) => set("endDate", e.target.value || null)} className={inputCls} />
              </Field>
              <label className="col-span-full flex items-center gap-2 text-sm">
                <input type="checkbox" checked={noEnd}
                  onChange={(e) => {
                    setNoEnd(e.target.checked);
                    if (e.target.checked) set("endDate", null);
                  }} />
                {L("fld_no_end")}
              </label>
              <Field label={L("fld_status")} error={showErr("status")}>
                <select value={draft.status}
                  onChange={(e) => set("status", e.target.value as Promotion["status"])} className={inputCls}>
                  <option value="draft">{L("st_draft")}</option>
                  <option value="active">{L("st_active")}</option>
                  <option value="inactive">{L("st_inactive")}</option>
                </select>
              </Field>
            </div>
          </FormSection>
        </div>

        <aside className="space-y-4">
          <PromotionPreviewBody p={draft} L={L} currency={currency} liveHint />
          {warnings.length > 0 && <WarningsBox items={warnings} L={L} />}
        </aside>
      </div>

      <EditorFooter
        L={L}
        saveLabel={L("save_promo")}
        onCancel={handleCancel}
        onSubmit={submit}
        disabled={hasErrors}
      />
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Editor: Promo Code
// ---------------------------------------------------------------------------

function PromoCodeEditor({
  initial, otherCodes, promotions, currency, lang, L,
  minMarginPercent, costPerCreditEUR, onSave, onCancel,
}: {
  initial: PromoCode;
  otherCodes: PromoCode[];
  promotions: Promotion[];
  currency: string;
  lang: Lang;
  L: LocalPromo;
  minMarginPercent: number;
  costPerCreditEUR: number;
  onSave: (c: PromoCode) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<PromoCode>({ ...initial });
  const [attempted, setAttempted] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const otherCodesSet = useMemo(
    () => new Set(otherCodes.map((c) => c.code)),
    [otherCodes],
  );

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const codeTrim = draft.code.trim();
    if (!codeTrim) e.code = L("err_code_required");
    else if (/\s/.test(codeTrim)) e.code = L("err_code_spaces");
    else if (otherCodesSet.has(codeTrim)) e.code = L("err_code_unique");
    if (draft.discountValue < 0) e.discountValue = L("err_negative");
    if ((draft.discountType === "percentage" || draft.discountType === "combined") &&
        (draft.discountValue < 0 || draft.discountValue > 100))
      e.discountValue = L("err_pct_range");
    if (draft.bonusCredits < 0) e.bonusCredits = L("err_negative");
    if (draft.usageLimit < 0) e.usageLimit = L("err_negative");
    if (draft.minimumPurchaseEUR < 0) e.minimumPurchaseEUR = L("err_negative");
    if (draft.startDate && draft.expirationDate &&
        new Date(draft.expirationDate) < new Date(draft.startDate))
      e.expirationDate = L("err_end_before_start");
    if (draft.active && computePromoCodeStatus(draft) === "expired")
      e.active = L("err_expired_active");
    if (!draft.applyAllPackages && draft.packageIds.length === 0)
      e.packages = L("err_packages_required");
    return e;
  }, [draft, otherCodesSet, L]);

  const warnings = useMemo(
    () => collectPromoCodeWarnings(draft, promotions, otherCodes, {
      minMarginPercent, costPerCreditEUR,
    }),
    [draft, promotions, otherCodes, minMarginPercent, costPerCreditEUR],
  );

  const hasErrors = Object.keys(errors).length > 0;

  const set = <K extends keyof PromoCode>(k: K, v: PromoCode[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleCancel = () => {
    if (dirty && !window.confirm(L("unsaved_confirm"))) return;
    onCancel();
  };

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const submit = () => {
    setAttempted(true);
    if (hasErrors) return;
    if (hasDangerousWarning(warnings)) {
      if (!window.confirm(`${L("confirm_dangerous_title")}\n\n${L("confirm_dangerous_body")}`))
        return;
    }
    onSave({ ...draft, code: sanitizeCode(draft.code), updatedAt: nowIso() });
  };

  const showErr = (k: string) => (attempted ? errors[k] : undefined);
  const needsPercentage = draft.discountType === "percentage" || draft.discountType === "combined";
  const needsFixed = draft.discountType === "fixed";
  const needsBonus = draft.discountType === "bonus_credits" || draft.discountType === "combined";

  return (
    <ModalShell title={initial.code || L("create_code")} dirty={dirty} L={L} onClose={handleCancel}>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <FormSection title={L("sec_basic")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L("fld_promo_code")} error={showErr("code")}>
                <input
                  value={draft.code}
                  onChange={(e) => set("code", sanitizeCode(e.target.value))}
                  className={`${inputCls} font-mono uppercase`}
                />
              </Field>
              <Field label={L("fld_linked_promo")}>
                <select
                  value={draft.linkedPromotionId ?? ""}
                  onChange={(e) => set("linkedPromotionId", e.target.value || null)}
                  className={inputCls}
                >
                  <option value="">{L("fld_none")}</option>
                  {promotions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label={L("fld_promo_desc")}>
                  <input value={draft.description}
                    onChange={(e) => set("description", e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label={L("fld_promo_message")}>
                  <textarea value={draft.customerMessage}
                    onChange={(e) => set("customerMessage", e.target.value)}
                    rows={2} className={`${inputCls} resize-y`} />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection title={L("sec_settings")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L("fld_discount_type")}>
                <select value={draft.discountType}
                  onChange={(e) => set("discountType", e.target.value as PromoCodeDiscountType)}
                  className={inputCls}>
                  {PROMO_CODE_TYPES.map((t) => (
                    <option key={t} value={t}>{L(`code_type_${t}`)}</option>
                  ))}
                </select>
              </Field>
              {(needsPercentage || needsFixed) && (
                <Field label={L("fld_discount_value")} error={showErr("discountValue")}>
                  <input type="number" min={0} step="0.01" value={draft.discountValue}
                    onChange={(e) => set("discountValue", Number(e.target.value))} className={inputCls} />
                </Field>
              )}
              {needsBonus && (
                <Field label={L("fld_bonus_credits")} error={showErr("bonusCredits")}>
                  <input type="number" min={0} value={draft.bonusCredits}
                    onChange={(e) => set("bonusCredits", Number(e.target.value))} className={inputCls} />
                </Field>
              )}
              <Field label={L("fld_min_purchase")} error={showErr("minimumPurchaseEUR")}>
                <input type="number" min={0} step="0.01" value={draft.minimumPurchaseEUR}
                  onChange={(e) => set("minimumPurchaseEUR", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label={L("fld_usage_limit")} error={showErr("usageLimit")}>
                <input type="number" min={0} value={draft.usageLimit}
                  onChange={(e) => set("usageLimit", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label={L("fld_start")}>
                <input type="date" value={draft.startDate ?? ""}
                  onChange={(e) => set("startDate", e.target.value || null)} className={inputCls} />
              </Field>
              <Field label={L("fld_expiration")} error={showErr("expirationDate")}>
                <input type="date" value={draft.expirationDate ?? ""}
                  onChange={(e) => set("expirationDate", e.target.value || null)} className={inputCls} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.onePerUser}
                  onChange={(e) => set("onePerUser", e.target.checked)} />
                {L("fld_one_per_user")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.active}
                  onChange={(e) => set("active", e.target.checked)} />
                {L("fld_active_toggle")}
              </label>
              {showErr("active") && (
                <p className="col-span-full text-xs text-rose-600 dark:text-rose-400">{showErr("active")}</p>
              )}
            </div>
          </FormSection>

          <FormSection title={L("sec_targeting")}>
            <SelectAllOrMany
              label={L("packages")}
              allLabel={L("fld_apply_all_packages")}
              all={draft.applyAllPackages}
              onAllChange={(b) => {
                set("applyAllPackages", b);
                if (b) set("packageIds", []);
              }}
              error={showErr("packages")}
            >
              <div className="grid gap-1.5 sm:grid-cols-2">
                {DEFAULT_PACKAGES.map((pkg) => (
                  <label key={pkg.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox"
                      checked={draft.packageIds.includes(pkg.id)}
                      onChange={(e) => set(
                        "packageIds",
                        e.target.checked
                          ? [...draft.packageIds, pkg.id]
                          : draft.packageIds.filter((x) => x !== pkg.id),
                      )} />
                    <span>{pkg.name}</span>
                  </label>
                ))}
              </div>
            </SelectAllOrMany>
          </FormSection>

          <FormSection title={L("fld_internal_notes")}>
            <textarea value={draft.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
              rows={2} className={`${inputCls} resize-y`} />
          </FormSection>
        </div>

        <aside className="space-y-4">
          <PromoCodePreviewBody c={draft} L={L} currency={currency} liveHint />
          {warnings.length > 0 && <WarningsBox items={warnings} L={L} />}
        </aside>
      </div>

      <EditorFooter
        L={L}
        saveLabel={L("save_code")}
        onCancel={handleCancel}
        onSubmit={submit}
        disabled={hasErrors}
      />
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Preview bodies
// ---------------------------------------------------------------------------

function PromotionPreviewBody({
  p, L, currency, liveHint,
}: { p: Promotion; L: LocalPromo; currency: string; liveHint?: boolean }) {
  const preview = previewPromotionBenefit(p, 20, 50);
  const applicable = p.applyAllPackages
    ? L("preview_all_packages")
    : p.packageIds
        .map((id) => DEFAULT_PACKAGES.find((x) => x.id === id)?.name ?? id)
        .join(", ") || "—";
  const period =
    p.startDate || p.endDate
      ? `${p.startDate ?? "…"} → ${p.endDate ?? "∞"}`
      : "∞";

  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{L("preview_title")}</h4>
        {liveHint && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {L("preview_internal")}
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{p.customerDescription || "—"}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Stat label={L("preview_original")} value={formatMoney(preview.originalPriceEUR, currency)} />
        <Stat label={L("preview_final")} value={formatMoney(preview.finalPriceEUR, currency)} />
        <Stat label={L("preview_credits")} value={String(preview.totalCredits)} />
        <Stat label={L("preview_savings")} value={formatMoney(preview.savingsEUR, currency)} />
        <Stat label={L("preview_savings_pct")} value={`${preview.savingsPercent.toFixed(1)}%`} />
        <Stat label={L("col_type")} value={L(`type_${p.type}`)} />
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{L("preview_applicable")}</dt>
          <dd className="font-medium text-foreground">{applicable}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{L("preview_period")}</dt>
          <dd className="font-medium text-foreground">{period}</dd>
        </div>
      </dl>
    </div>
  );
}

function PromoCodePreviewBody({
  c, L, currency, liveHint,
}: { c: PromoCode; L: LocalPromo; currency: string; liveHint?: boolean }) {
  const preview = previewPromoCodeBenefit(c, 20, 50);
  const applicable = c.applyAllPackages
    ? L("preview_all_packages")
    : c.packageIds
        .map((id) => DEFAULT_PACKAGES.find((x) => x.id === id)?.name ?? id)
        .join(", ") || "—";
  const period = c.expirationDate ? `${c.startDate ?? "…"} → ${c.expirationDate}` : (c.startDate ?? "∞");

  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{L("preview_title")}</h4>
        {liveHint && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {L("preview_internal")}
          </span>
        )}
      </div>
      <p className="mb-1 font-mono text-lg font-semibold text-foreground">{c.code || "—"}</p>
      <p className="mb-3 text-xs text-muted-foreground">{c.customerMessage || c.description || "—"}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Stat label={L("preview_original")} value={formatMoney(preview.originalPriceEUR, currency)} />
        <Stat label={L("preview_final")} value={formatMoney(preview.finalPriceEUR, currency)} />
        <Stat label={L("preview_credits")} value={String(preview.totalCredits)} />
        <Stat label={L("preview_savings")} value={formatMoney(preview.savingsEUR, currency)} />
        <Stat label={L("preview_savings_pct")} value={`${preview.savingsPercent.toFixed(1)}%`} />
        <Stat label={L("col_limit")} value={c.usageLimit === 0 ? "∞" : String(c.usageLimit)} />
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{L("preview_applicable")}</dt>
          <dd className="font-medium text-foreground">{applicable}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{L("preview_period")}</dt>
          <dd className="font-medium text-foreground">{period}</dd>
        </div>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatusPill({ status, L }: { status: EffectivePromoStatus; L: LocalPromo }) {
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

function RowActions({
  isActive, L, onEdit, onDuplicate, onToggle, onPreview, onDelete,
}: {
  isActive: boolean;
  L: LocalPromo;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1 text-muted-foreground">
      <IconBtn label={L("edit")} onClick={onEdit}><Pencil className="h-4 w-4" /></IconBtn>
      <IconBtn label={L("duplicate")} onClick={onDuplicate}><Copy className="h-4 w-4" /></IconBtn>
      <IconBtn label={L("toggle")} onClick={onToggle}>
        {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
      </IconBtn>
      <IconBtn label={L("preview")} onClick={onPreview}><Eye className="h-4 w-4" /></IconBtn>
      <IconBtn label={L("delete")} onClick={onDelete}><Trash2 className="h-4 w-4" /></IconBtn>
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="rounded-md p-1.5 hover:bg-muted hover:text-foreground">
      {children}
    </button>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">{children}</div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </label>
  );
}

function SelectAllOrMany({
  label, allLabel, all, onAllChange, error, children,
}: {
  label: string;
  allLabel: string;
  all: boolean;
  onAllChange: (b: boolean) => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={all} onChange={(e) => onAllChange(e.target.checked)} />
          {allLabel}
        </label>
      </div>
      {!all && children}
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

function WarningsBox({ items, L }: { items: OverlapWarning[]; L: LocalPromo }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" /> {L("warn_title")}
      </div>
      <ul className="space-y-1 text-xs">
        {items.map((w, i) => {
          const arg = w.message.split(":").slice(1).join(":");
          return <li key={i}>• {L(`warn_${w.kind}`, { a: arg })}</li>;
        })}
      </ul>
    </div>
  );
}

function ModalShell({
  title, dirty, L, onClose, children,
}: {
  title: string;
  dirty: boolean;
  L: LocalPromo;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 sm:p-4">
      <div className="my-4 w-full max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <h3 className="truncate font-[Fraunces] text-lg font-semibold text-foreground">{title}</h3>
            {dirty && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-300">
                • {L("unsaved_changes")}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label={L("cancel")}
            className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditorFooter({
  L, saveLabel, onCancel, onSubmit, disabled,
}: {
  L: LocalPromo;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
      <button type="button" onClick={onCancel}
        className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted/50">
        {L("cancel")}
      </button>
      <button type="button" onClick={onSubmit} disabled={disabled}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
        {saveLabel}
      </button>
    </div>
  );
}

function PreviewModal({
  title, L, currency, onClose, children,
}: {
  title: string;
  L: LocalPromo;
  currency: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 sm:p-4">
      <div className="my-4 w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h3 className="truncate font-[Fraunces] text-lg font-semibold text-foreground">{title}</h3>
          <button type="button" onClick={onClose} aria-label={L("cancel")}
            className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDelete({
  title, L, lines, onCancel, onConfirm,
}: {
  title: string;
  L: LocalPromo;
  lines: string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background shadow-2xl">
        <div className="border-b border-border/60 px-5 py-3">
          <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="space-y-1 px-5 py-4 text-sm">
          {lines.map((line, i) => (
            <p key={i} className="text-foreground">{line}</p>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          <button type="button" onClick={onCancel}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
            {L("keep")}
          </button>
          <button type="button" onClick={onConfirm}
            className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-500/15 dark:text-rose-300">
            {L("delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function newPromotion(existing: Promotion[]): Promotion {
  const ids = new Set(existing.map((p) => p.internalId));
  let base = "NEW_PROMOTION";
  let candidate = base;
  let i = 2;
  while (ids.has(candidate)) candidate = `${base}_${i++}`;
  return {
    id: nextPromoId("prm"),
    internalId: candidate,
    name: "",
    customerTitle: "",
    customerDescription: "",
    internalNotes: "",
    type: "percentage_discount",
    percentageValue: 10,
    fixedDiscountEUR: 0,
    bonusCredits: 0,
    bonusPercentage: 0,
    minimumPurchaseEUR: 0,
    maximumDiscountEUR: null,
    applyAllPackages: true,
    packageIds: [],
    applyAllCountries: true,
    countries: [],
    applyAllLanguages: true,
    languages: [],
    firstPurchaseOnly: false,
    oneUsePerUser: false,
    startDate: null,
    endDate: null,
    status: "draft",
    updatedAt: nowIso(),
  };
}

function duplicatePromotion(p: Promotion, existing: Promotion[]): Promotion {
  const ids = new Set(existing.map((x) => x.internalId));
  const base = `${p.internalId}_COPY`;
  let candidate = base;
  let i = 2;
  while (ids.has(candidate)) candidate = `${base}_${i++}`;
  return {
    ...p,
    id: nextPromoId("prm"),
    internalId: candidate,
    name: `${p.name} (Copy)`,
    status: "draft",
    updatedAt: nowIso(),
  };
}

function newPromoCode(): PromoCode {
  return {
    id: nextPromoId("pc"),
    code: "",
    description: "",
    customerMessage: "",
    discountType: "percentage",
    discountValue: 10,
    bonusCredits: 0,
    linkedPromotionId: null,
    minimumPurchaseEUR: 0,
    applyAllPackages: true,
    packageIds: [],
    usageLimit: 0,
    onePerUser: false,
    startDate: null,
    expirationDate: null,
    active: false,
    internalNotes: "",
    updatedAt: nowIso(),
  };
}

function duplicatePromoCode(c: PromoCode, existing: PromoCode[]): PromoCode {
  const codes = new Set(existing.map((x) => x.code));
  const base = `${c.code}_COPY`;
  let candidate = base;
  let i = 2;
  while (codes.has(candidate)) candidate = `${base}_${i++}`;
  return {
    ...c,
    id: nextPromoId("pc"),
    code: candidate,
    active: false,
    updatedAt: nowIso(),
  };
}

function formatMoney(v: number, currency: string, digits = 2): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(v);
  } catch {
    return `${v.toFixed(digits)} ${currency}`;
  }
}
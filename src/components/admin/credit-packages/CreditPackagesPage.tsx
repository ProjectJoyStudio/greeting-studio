import { useMemo, useState } from "react";
import {
  Plus, Copy, Trash2, ChevronUp, ChevronDown, Search,
  Power, PowerOff, Pencil, Check, X, AlertTriangle, TrendingUp, TrendingDown,
} from "lucide-react";

import { useI18n, LANGS } from "@/lib/i18n";
import {
  DEFAULT_PACKAGES, DEFAULT_BONUS_RULES, DEFAULT_DISCOUNTS, DEFAULT_PROMOS,
  BADGE_KINDS, BONUS_KINDS, DISCOUNT_KINDS, DISCOUNT_SCOPES, PROMO_DISCOUNT_TYPES,
  computeBreakdown, overlappingDiscounts, nextId, nowIso,
  type CreditPackage, type BonusRule, type Discount, type PromoCode,
  type BadgeKind, type BonusKind, type DiscountKind, type DiscountScope, type PromoDiscountType,
} from "@/lib/admin/credit-packages";
import { useLocal } from "./i18n";

type TabKey = "packages" | "bonuses" | "discounts" | "promos";

// Minimum acceptable margin — mirrors economy safety default.
const MIN_MARGIN = 30;
const WARN_MARGIN = 45;

// ---------------------------------------------------------------------------

export function CreditPackagesPage() {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const [tab, setTab] = useState<TabKey>("packages");

  const [packages, setPackages] = useState<CreditPackage[]>(() => [...DEFAULT_PACKAGES]);
  const [bonusRules, setBonusRules] = useState<BonusRule[]>(() => [...DEFAULT_BONUS_RULES]);
  const [discounts, setDiscounts] = useState<Discount[]>(() => [...DEFAULT_DISCOUNTS]);
  const [promos, setPromos] = useState<PromoCode[]>(() => [...DEFAULT_PROMOS]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[Fraunces] text-3xl font-semibold text-foreground">{L("cp_title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{L("cp_subtitle")}</p>
      </header>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-card/70 p-1">
        {(["packages", "bonuses", "discounts", "promos"] as TabKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              tab === k ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {L(`cp_tab_${k}`)}
          </button>
        ))}
      </div>

      {tab === "packages" && (
        <PackagesTab
          packages={packages}
          setPackages={setPackages}
          bonusRules={bonusRules}
          discounts={discounts}
        />
      )}
      {tab === "bonuses" && <BonusesTab rules={bonusRules} setRules={setBonusRules} />}
      {tab === "discounts" && (
        <DiscountsTab discounts={discounts} setDiscounts={setDiscounts} packages={packages} />
      )}
      {tab === "promos" && <PromosTab promos={promos} setPromos={setPromos} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PACKAGES TAB
// ---------------------------------------------------------------------------

function PackagesTab({
  packages, setPackages, bonusRules, discounts,
}: {
  packages: CreditPackage[];
  setPackages: (v: CreditPackage[]) => void;
  bonusRules: BonusRule[];
  discounts: Discount[];
}) {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortKey, setSortKey] = useState<"order" | "name" | "price" | "credits">("order");
  const [editing, setEditing] = useState<CreditPackage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const activeBonusExtra = useMemo(() => {
    const fixed = bonusRules.filter((r) => r.enabled && r.kind === "fixed").reduce((s, r) => s + r.value, 0);
    const pct = bonusRules.filter((r) => r.enabled && r.kind === "percentage").reduce((s, r) => s + r.value, 0);
    return { fixed, pct };
  }, [bonusRules]);

  const activeGlobalDiscount = useMemo(() => {
    const active = discounts.find((d) => d.enabled && d.scope === "global");
    if (!active) return { fixedEUR: 0, pct: 0 };
    return active.kind === "percentage"
      ? { fixedEUR: 0, pct: active.value }
      : { fixedEUR: active.value, pct: 0 };
  }, [discounts]);

  const filtered = useMemo(() => {
    let list = packages.filter((p) => {
      if (filter === "active" && !p.active) return false;
      if (filter === "inactive" && p.active) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "price") return a.priceEUR - b.priceEUR;
      if (sortKey === "credits") return a.credits - b.credits;
      return a.displayOrder - b.displayOrder;
    });
    return list;
  }, [packages, filter, query, sortKey]);

  const move = (id: string, dir: -1 | 1) => {
    const ordered = [...packages].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = ordered.findIndex((p) => p.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    const a = ordered[idx];
    const b = ordered[swap];
    const t = a.displayOrder;
    a.displayOrder = b.displayOrder;
    b.displayOrder = t;
    setPackages([...ordered].map((p) => ({ ...p, updatedAt: p.id === a.id || p.id === b.id ? nowIso() : p.updatedAt })));
  };

  const toggle = (id: string) => {
    setPackages(packages.map((p) => (p.id === id ? { ...p, active: !p.active, updatedAt: nowIso() } : p)));
  };

  const duplicate = (p: CreditPackage) => {
    const copy: CreditPackage = {
      ...p,
      id: nextId("pkg"),
      name: `${p.name} (copy)`,
      displayOrder: Math.max(0, ...packages.map((x) => x.displayOrder)) + 1,
      updatedAt: nowIso(),
    };
    setPackages([...packages, copy]);
  };

  const remove = (id: string) => {
    setPackages(packages.filter((p) => p.id !== id));
    setConfirmDelete(null);
  };

  const save = (p: CreditPackage) => {
    const exists = packages.some((x) => x.id === p.id);
    const next = exists
      ? packages.map((x) => (x.id === p.id ? { ...p, updatedAt: nowIso() } : x))
      : [...packages, { ...p, updatedAt: nowIso() }];
    setPackages(next);
    setEditing(null);
  };

  const startNew = () => {
    const p: CreditPackage = {
      id: nextId("pkg"),
      name: "",
      credits: 10,
      bonusCredits: 0,
      priceEUR: 5,
      productionCostPerCreditEUR: 0.15,
      badge: "none",
      color: "#F7C873",
      active: true,
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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
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
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
          >
            <option value="all">{L("cp_filter_all")}</option>
            <option value="active">{L("cp_filter_active")}</option>
            <option value="inactive">{L("cp_filter_inactive")}</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
          >
            <option value="order">#</option>
            <option value="name">{L("col_name")}</option>
            <option value="credits">{L("col_credits")}</option>
            <option value="price">{L("col_price")}</option>
          </select>
          <button
            type="button"
            onClick={startNew}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {L("cp_new_package")}
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{L("col_name")}</th>
                <th className="px-3 py-2 text-right">{L("col_credits")}</th>
                <th className="px-3 py-2 text-right">{L("col_bonus")}</th>
                <th className="px-3 py-2 text-right">{L("col_final")}</th>
                <th className="px-3 py-2 text-right">{L("col_price")}</th>
                <th className="px-3 py-2">{L("col_status")}</th>
                <th className="px-3 py-2">{L("col_visibility")}</th>
                <th className="px-3 py-2">{L("col_active_period")}</th>
                <th className="px-3 py-2">{L("col_last_edited")}</th>
                <th className="px-3 py-2 text-right">{L("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const expired = p.endDate && new Date(p.endDate).getTime() < Date.now();
                const scoped = p.visibleCountries.length > 0 || p.visibleLanguages.length > 0;
                return (
                  <tr key={p.id} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="font-medium text-foreground">{p.name}</span>
                        {p.badge !== "none" && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                            {L(`badge_${p.badge}`)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{p.credits}</td>
                    <td className="px-3 py-2 text-right">+{p.bonusCredits}</td>
                    <td className="px-3 py-2 text-right font-medium">{p.credits + p.bonusCredits}</td>
                    <td className="px-3 py-2 text-right">€{p.priceEUR.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        p.active
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {p.active ? L("st_active") : L("st_inactive")}
                        {expired && p.active ? " ⚠" : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {scoped ? L("vis_scoped") : L("vis_all")}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {p.startDate || "—"} – {p.endDate || "∞"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1 text-muted-foreground">
                        <IconBtn label={L("act_move_up")} onClick={() => move(p.id, -1)}><ChevronUp className="h-4 w-4" /></IconBtn>
                        <IconBtn label={L("act_move_down")} onClick={() => move(p.id, 1)}><ChevronDown className="h-4 w-4" /></IconBtn>
                        <IconBtn label={L("act_toggle")} onClick={() => toggle(p.id)}>
                          {p.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </IconBtn>
                        <IconBtn label={L("act_edit")} onClick={() => setEditing({ ...p })}><Pencil className="h-4 w-4" /></IconBtn>
                        <IconBtn label={L("act_duplicate")} onClick={() => duplicate(p)}><Copy className="h-4 w-4" /></IconBtn>
                        <IconBtn label={L("act_delete")} onClick={() => setConfirmDelete(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-sm text-muted-foreground">—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right column — live previews */}
      <aside className="space-y-4">
        {(editing ?? filtered[0]) && (
          <>
            <CustomerPreview pkg={editing ?? filtered[0]} />
            <DynamicPricePanel
              pkg={editing ?? filtered[0]}
              extraBonusFixed={activeBonusExtra.fixed}
              extraBonusPct={activeBonusExtra.pct}
              extraDiscountEUR={activeGlobalDiscount.fixedEUR}
              extraDiscountPct={activeGlobalDiscount.pct}
            />
            <ProfitPanel
              pkg={editing ?? filtered[0]}
              extraBonusFixed={activeBonusExtra.fixed}
              extraBonusPct={activeBonusExtra.pct}
              extraDiscountEUR={activeGlobalDiscount.fixedEUR}
              extraDiscountPct={activeGlobalDiscount.pct}
            />
          </>
        )}
      </aside>

      {editing && (
        <PackageEditor
          pkg={editing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={L("act_confirm_delete")}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete)}
        />
      )}
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
      className="rounded-md p-1 hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// EDITOR (modal)
// ---------------------------------------------------------------------------

function PackageEditor({
  pkg, onSave, onCancel,
}: { pkg: CreditPackage; onSave: (p: CreditPackage) => void; onCancel: () => void }) {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const [draft, setDraft] = useState<CreditPackage>({ ...pkg });

  const errors: string[] = [];
  if (draft.priceEUR < 0) errors.push(L("err_negative_price"));
  if (draft.credits <= 0) errors.push(L("err_zero_credits"));
  if (draft.active && draft.endDate && new Date(draft.endDate).getTime() < Date.now()) {
    errors.push(L("err_expired_active"));
  }

  const set = <K extends keyof CreditPackage>(k: K, v: CreditPackage[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">
            {pkg.name || L("cp_new_package")}
          </h3>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Field label={L("fld_name")}>
            <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field label={L("fld_badge")}>
            <select value={draft.badge} onChange={(e) => set("badge", e.target.value as BadgeKind)} className={inputCls}>
              {BADGE_KINDS.map((b) => (
                <option key={b} value={b}>{L(`badge_${b}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={L("fld_credits")}>
            <input type="number" min={1} value={draft.credits} onChange={(e) => set("credits", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label={L("fld_bonus")}>
            <input type="number" min={0} value={draft.bonusCredits} onChange={(e) => set("bonusCredits", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label={L("fld_price")}>
            <input type="number" min={0} step="0.01" value={draft.priceEUR} onChange={(e) => set("priceEUR", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label={L("fld_cost")}>
            <input type="number" min={0} step="0.01" value={draft.productionCostPerCreditEUR} onChange={(e) => set("productionCostPerCreditEUR", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label={L("fld_color")}>
            <input type="color" value={draft.color} onChange={(e) => set("color", e.target.value)} className="h-9 w-full rounded-md border border-border/60 bg-background" />
          </Field>
          <Field label={L("fld_active")}>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />
              {draft.active ? L("st_active") : L("st_inactive")}
            </label>
          </Field>
          <Field label={L("fld_countries")}>
            <input
              value={draft.visibleCountries.join(",")}
              placeholder={L("fld_placeholder_all")}
              onChange={(e) => set("visibleCountries", e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))}
              className={inputCls}
            />
          </Field>
          <Field label={L("fld_languages")}>
            <div className="flex flex-wrap gap-1.5">
              {LANGS.map((l) => {
                const on = draft.visibleLanguages.includes(l.code);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() =>
                      set("visibleLanguages",
                        on
                          ? draft.visibleLanguages.filter((x) => x !== l.code)
                          : [...draft.visibleLanguages, l.code])
                    }
                    className={`rounded-md border px-2 py-1 text-xs ${
                      on ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    {l.flag}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={L("fld_start")}>
            <input type="date" value={draft.startDate ?? ""} onChange={(e) => set("startDate", e.target.value || null)} className={inputCls} />
          </Field>
          <Field label={L("fld_end")}>
            <input type="date" value={draft.endDate ?? ""} onChange={(e) => set("endDate", e.target.value || null)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={L("fld_notes")}>
              <textarea value={draft.notes} rows={3} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
            </Field>
          </div>

          {errors.length > 0 && (
            <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {errors.map((e, i) => (<div key={i}>⚠ {e}</div>))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 bg-muted/30 px-5 py-3">
          <button type="button" onClick={onCancel} className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm">
            {L("act_cancel")}
          </button>
          <button
            type="button"
            disabled={errors.length > 0}
            onClick={() => onSave(draft)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {L("act_save")}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm outline-none focus:border-primary/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted-foreground">
      <span className="mb-1 inline-block">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// PREVIEW / PRICING / PROFIT
// ---------------------------------------------------------------------------

function CustomerPreview({ pkg }: { pkg: CreditPackage }) {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const final = pkg.credits + pkg.bonusCredits;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{L("preview_title")}</div>
      <div
        className="mt-3 rounded-xl p-4 text-slate-900"
        style={{ background: `linear-gradient(135deg, ${pkg.color}22, ${pkg.color}66)` }}
      >
        <div className="flex items-center justify-between">
          <div className="font-[Fraunces] text-xl font-semibold">{pkg.name || "—"}</div>
          {pkg.badge !== "none" && (
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-800 shadow-sm">
              {L(`badge_${pkg.badge}`)}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-[Fraunces] text-3xl font-semibold">{final}</span>
          <span className="text-sm opacity-80">credits</span>
          {pkg.bonusCredits > 0 && (
            <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              +{pkg.bonusCredits}
            </span>
          )}
        </div>
        <div className="mt-2 text-sm opacity-80">€{pkg.priceEUR.toFixed(2)}</div>
        <button type="button" className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white">
          {L("preview_choose")}
        </button>
      </div>
    </div>
  );
}

function DynamicPricePanel({
  pkg, extraBonusFixed, extraBonusPct, extraDiscountEUR, extraDiscountPct,
}: {
  pkg: CreditPackage;
  extraBonusFixed: number;
  extraBonusPct: number;
  extraDiscountEUR: number;
  extraDiscountPct: number;
}) {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const extraBonus = extraBonusFixed + Math.round((pkg.credits * extraBonusPct) / 100);
  const b = computeBreakdown(pkg, extraBonus, extraDiscountEUR, extraDiscountPct);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Live pricing</div>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{L("preview_final_credits")}</dt>
        <dd className="text-right font-medium">{b.finalCredits}</dd>
        <dt className="text-muted-foreground">€ / {L("preview_per_credit")}</dt>
        <dd className="text-right">€{b.effectivePricePerCredit.toFixed(3)}</dd>
        <dt className="text-muted-foreground">{L("preview_savings")}</dt>
        <dd className="text-right text-emerald-700">{b.savingsPercent.toFixed(0)}%</dd>
        <dt className="text-muted-foreground">{L("preview_you_pay")}</dt>
        <dd className="text-right font-semibold">€{b.customerPaysEUR.toFixed(2)}</dd>
      </dl>
    </div>
  );
}

function ProfitPanel({
  pkg, extraBonusFixed, extraBonusPct, extraDiscountEUR, extraDiscountPct,
}: {
  pkg: CreditPackage;
  extraBonusFixed: number;
  extraBonusPct: number;
  extraDiscountEUR: number;
  extraDiscountPct: number;
}) {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const extraBonus = extraBonusFixed + Math.round((pkg.credits * extraBonusPct) / 100);
  const b = computeBreakdown(pkg, extraBonus, extraDiscountEUR, extraDiscountPct);

  const tone =
    b.marginPercent < MIN_MARGIN
      ? "bg-destructive/10 text-destructive"
      : b.marginPercent < WARN_MARGIN
      ? "bg-amber-500/15 text-amber-700"
      : "bg-emerald-500/15 text-emerald-700";
  const toneLabel =
    b.marginPercent < MIN_MARGIN
      ? L("profit_danger")
      : b.marginPercent < WARN_MARGIN
      ? L("profit_warning")
      : L("profit_healthy");

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{L("profit_title")}</div>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{L("profit_income")}</dt>
        <dd className="text-right">€{b.customerPaysEUR.toFixed(2)}</dd>
        <dt className="text-muted-foreground">{L("profit_cost")}</dt>
        <dd className="text-right">€{b.estimatedCostEUR.toFixed(2)}</dd>
        <dt className="text-muted-foreground">{L("profit_gross")}</dt>
        <dd className="text-right font-medium">€{b.grossProfitEUR.toFixed(2)}</dd>
        <dt className="text-muted-foreground">{L("profit_margin")}</dt>
        <dd className="text-right font-semibold">{b.marginPercent.toFixed(1)}%</dd>
      </dl>
      <div className={`mt-3 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${tone}`}>
        {b.marginPercent < MIN_MARGIN ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
        {toneLabel}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BONUSES
// ---------------------------------------------------------------------------

function BonusesTab({ rules, setRules }: { rules: BonusRule[]; setRules: (v: BonusRule[]) => void }) {
  const { lang } = useI18n();
  const L = useLocal(lang);

  const update = (id: string, patch: Partial<BonusRule>) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rules.map((r) => (
        <div key={r.id} className="grid gap-3 rounded-xl border border-border/60 bg-card/70 p-4 md:grid-cols-[220px_1fr_140px_120px]">
          <div>
            <div className="font-medium text-foreground">{L(`br_kind_${r.kind}`)}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{r.kind}</div>
          </div>
          <input
            className={inputCls}
            value={r.description}
            onChange={(e) => update(r.id, { description: e.target.value })}
            placeholder={L("br_description")}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              value={r.value}
              onChange={(e) => update(r.id, { value: Number(e.target.value) })}
              className={inputCls}
            />
            <span className="text-xs text-muted-foreground">
              {r.kind === "percentage" ? "%" : L("col_credits").toLowerCase()}
            </span>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={r.enabled} onChange={(e) => update(r.id, { enabled: e.target.checked })} />
            {L("br_enabled")}
          </label>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DISCOUNTS
// ---------------------------------------------------------------------------

function DiscountsTab({
  discounts, setDiscounts, packages,
}: {
  discounts: Discount[];
  setDiscounts: (v: Discount[]) => void;
  packages: CreditPackage[];
}) {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const overlaps = useMemo(() => overlappingDiscounts(discounts), [discounts]);

  const update = (id: string, patch: Partial<Discount>) =>
    setDiscounts(discounts.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const add = () => {
    setDiscounts([
      ...discounts,
      {
        id: nextId("dsc"),
        name: "Discount",
        kind: "percentage",
        value: 10,
        scope: "global",
        scopeTargets: [],
        startDate: null,
        endDate: null,
        enabled: true,
      },
    ]);
  };

  const remove = (id: string) => setDiscounts(discounts.filter((d) => d.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> {L("dsc_new")}
        </button>
      </div>

      {overlaps.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" /> {L("dsc_overlap_warning")}
        </div>
      )}

      {discounts.map((d) => (
        <div key={d.id} className="grid gap-3 rounded-xl border border-border/60 bg-card/70 p-4 md:grid-cols-6">
          <input
            className={inputCls}
            value={d.name}
            onChange={(e) => update(d.id, { name: e.target.value })}
          />
          <select value={d.kind} onChange={(e) => update(d.id, { kind: e.target.value as DiscountKind })} className={inputCls}>
            {DISCOUNT_KINDS.map((k) => <option key={k} value={k}>{L(`dsc_kind_${k}`)}</option>)}
          </select>
          <input
            type="number"
            min={0}
            value={d.value}
            onChange={(e) => update(d.id, { value: Number(e.target.value) })}
            className={inputCls}
          />
          <select value={d.scope} onChange={(e) => update(d.id, { scope: e.target.value as DiscountScope, scopeTargets: [] })} className={inputCls}>
            {DISCOUNT_SCOPES.map((s) => <option key={s} value={s}>{L(`dsc_scope_${s}`)}</option>)}
          </select>
          {d.scope === "package" ? (
            <select
              className={inputCls}
              value={d.scopeTargets[0] ?? ""}
              onChange={(e) => update(d.id, { scopeTargets: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">—</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : d.scope === "language" ? (
            <select
              className={inputCls}
              value={d.scopeTargets[0] ?? ""}
              onChange={(e) => update(d.id, { scopeTargets: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">—</option>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          ) : d.scope === "country" ? (
            <input
              className={inputCls}
              placeholder="ISO codes, comma"
              value={d.scopeTargets.join(",")}
              onChange={(e) => update(d.id, { scopeTargets: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) })}
            />
          ) : (
            <div className="text-xs text-muted-foreground">—</div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={inputCls}
              value={d.startDate ?? ""}
              onChange={(e) => update(d.id, { startDate: e.target.value || null })}
            />
            <input
              type="date"
              className={inputCls}
              value={d.endDate ?? ""}
              onChange={(e) => update(d.id, { endDate: e.target.value || null })}
            />
          </div>
          <div className="flex items-center justify-between gap-2 md:col-span-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.enabled} onChange={(e) => update(d.id, { enabled: e.target.checked })} />
              {L("br_enabled")}
            </label>
            <button type="button" onClick={() => remove(d.id)} className="text-xs text-destructive hover:underline">
              {L("act_delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROMO CODES
// ---------------------------------------------------------------------------

function PromosTab({ promos, setPromos }: { promos: PromoCode[]; setPromos: (v: PromoCode[]) => void }) {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const [error, setError] = useState<string | null>(null);

  const update = (id: string, patch: Partial<PromoCode>) => {
    if (patch.code) {
      const dup = promos.some((p) => p.id !== id && p.code.trim().toLowerCase() === patch.code!.trim().toLowerCase());
      if (dup) {
        setError(L("promo_duplicate_error"));
        return;
      }
    }
    setError(null);
    setPromos(promos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const add = () => {
    let code = "NEW";
    let i = 1;
    while (promos.some((p) => p.code === code)) code = `NEW-${++i}`;
    setPromos([
      ...promos,
      {
        id: nextId("promo"),
        code,
        description: "",
        discountType: "percentage",
        discountValue: 10,
        bonusCredits: 0,
        expiresAt: null,
        usageLimit: 0,
        onePerUser: true,
        active: true,
      },
    ]);
  };

  const remove = (id: string) => setPromos(promos.filter((p) => p.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> {L("promo_new")}
        </button>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
      )}
      {promos.map((p) => (
        <div key={p.id} className="grid gap-3 rounded-xl border border-border/60 bg-card/70 p-4 md:grid-cols-4">
          <Field label={L("promo_code")}>
            <input value={p.code} onChange={(e) => update(p.id, { code: e.target.value.toUpperCase() })} className={inputCls} />
          </Field>
          <Field label={L("promo_desc")}>
            <input value={p.description} onChange={(e) => update(p.id, { description: e.target.value })} className={inputCls} />
          </Field>
          <Field label={L("promo_dtype")}>
            <select value={p.discountType} onChange={(e) => update(p.id, { discountType: e.target.value as PromoDiscountType })} className={inputCls}>
              {PROMO_DISCOUNT_TYPES.map((k) => <option key={k} value={k}>{L(`promo_type_${k}`)}</option>)}
            </select>
          </Field>
          <Field label={L("promo_dvalue")}>
            <input type="number" min={0} value={p.discountValue} onChange={(e) => update(p.id, { discountValue: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label={L("promo_bonus")}>
            <input type="number" min={0} value={p.bonusCredits} onChange={(e) => update(p.id, { bonusCredits: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label={L("promo_expires")}>
            <input type="date" value={p.expiresAt ?? ""} onChange={(e) => update(p.id, { expiresAt: e.target.value || null })} className={inputCls} />
          </Field>
          <Field label={L("promo_limit")}>
            <input type="number" min={0} value={p.usageLimit} onChange={(e) => update(p.id, { usageLimit: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label={L("promo_one_per_user")}>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.onePerUser} onChange={(e) => update(p.id, { onePerUser: e.target.checked })} />
              {p.onePerUser ? L("st_active") : L("st_inactive")}
            </label>
          </Field>
          <div className="md:col-span-4 flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-xs">
            <div>
              <span className="text-muted-foreground">{L("promo_customer_benefit")}: </span>
              <span className="font-medium text-foreground">
                {p.discountType === "percentage" && `${p.discountValue}% off`}
                {p.discountType === "fixed" && `€${p.discountValue.toFixed(2)} off`}
                {p.discountType === "bonus_credits" && `+${p.discountValue} credits`}
                {p.bonusCredits > 0 && ` · +${p.bonusCredits} bonus credits`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={p.active} onChange={(e) => update(p.id, { active: e.target.checked })} />
                {p.active ? L("st_active") : L("st_inactive")}
              </label>
              <button type="button" onClick={() => remove(p.id)} className="text-destructive hover:underline">
                {L("act_delete")}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CONFIRM DIALOG
// ---------------------------------------------------------------------------

function ConfirmDialog({
  message, onCancel, onConfirm,
}: { message: string; onCancel: () => void; onConfirm: () => void }) {
  const { lang } = useI18n();
  const L = useLocal(lang);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-background p-5 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-medium">{L("act_delete")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm">
            {L("act_cancel")}
          </button>
          <button type="button" onClick={onConfirm} className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground">
            <Check className="h-4 w-4" /> {L("act_delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
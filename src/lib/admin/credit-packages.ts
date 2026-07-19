// ---------------------------------------------------------------------------
// Credit Packages, Bonus Rules, Discounts and Promo Codes — frontend-only
// demo store for the Admin Panel. Ready to be replaced by a backend later:
// every entity has a stable `id`, timestamps and no cross-references beyond
// string ids so it can be serialised over an API without changes.
// ---------------------------------------------------------------------------

export type BadgeKind = "none" | "popular" | "best_value" | "limited" | "new";

export type BonusKind =
  | "fixed"
  | "percentage"
  | "first_purchase"
  | "birthday"
  | "holiday"
  | "promotional"
  | "referral";

export type DiscountKind = "percentage" | "fixed";
export type DiscountScope = "global" | "country" | "language" | "package";

export type PromoDiscountType = "percentage" | "fixed" | "bonus_credits";

export type PackageStatus = "draft" | "active" | "inactive";

/**
 * Derived, presentation-only status. It is a superset of {@link PackageStatus}
 * and folds in the current date + active-period rules so the table and
 * customer preview can show Scheduled / Expired without persisting them.
 */
export type EffectiveStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "inactive"
  | "expired";

/** Demonstration country roster for the visibility picker. */
export interface CountryOption {
  code: string;
  labels: Record<string, string>;
}
export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "DE", labels: { en: "Germany", ru: "Германия", de: "Deutschland", uk: "Німеччина", fr: "Allemagne", pl: "Niemcy" } },
  { code: "UA", labels: { en: "Ukraine", ru: "Украина", de: "Ukraine", uk: "Україна", fr: "Ukraine", pl: "Ukraina" } },
  { code: "PL", labels: { en: "Poland", ru: "Польша", de: "Polen", uk: "Польща", fr: "Pologne", pl: "Polska" } },
  { code: "FR", labels: { en: "France", ru: "Франция", de: "Frankreich", uk: "Франція", fr: "France", pl: "Francja" } },
  { code: "AT", labels: { en: "Austria", ru: "Австрия", de: "Österreich", uk: "Австрія", fr: "Autriche", pl: "Austria" } },
  { code: "CH", labels: { en: "Switzerland", ru: "Швейцария", de: "Schweiz", uk: "Швейцарія", fr: "Suisse", pl: "Szwajcaria" } },
  { code: "GB", labels: { en: "United Kingdom", ru: "Великобритания", de: "Vereinigtes Königreich", uk: "Велика Британія", fr: "Royaume-Uni", pl: "Wielka Brytania" } },
  { code: "US", labels: { en: "United States", ru: "США", de: "USA", uk: "США", fr: "États-Unis", pl: "USA" } },
  { code: "CA", labels: { en: "Canada", ru: "Канада", de: "Kanada", uk: "Канада", fr: "Canada", pl: "Kanada" } },
];

export const LANGUAGE_CODES = ["en", "de", "ru", "uk", "fr", "pl"] as const;

export interface CreditPackage {
  id: string;
  internalId: string;
  name: string;
  /** Public-facing display name shown on the customer card. */
  customerName: string;
  /** Short customer-facing description shown under the name. */
  description: string;
  /** Optional original price used to compute savings; null = no strike-through. */
  originalPriceEUR: number | null;
  /** Icon placeholder shown on the customer card. */
  iconEmoji: string;
  /** Only one package may be highlighted at a time (enforced in the UI). */
  highlighted: boolean;
  credits: number;
  bonusCredits: number;
  priceEUR: number;
  productionCostPerCreditEUR: number; // internal cost per credit
  badge: BadgeKind;
  color: string; // hex — used by the customer preview card
  active: boolean;
  status: PackageStatus;
  visibleCountries: string[]; // ISO codes; empty = all
  visibleLanguages: string[]; // Lang codes; empty = all
  startDate: string | null; // ISO date (yyyy-mm-dd)
  endDate: string | null;
  notes: string;
  displayOrder: number;
  updatedAt: string; // ISO
}

export interface BonusRule {
  id: string;
  kind: BonusKind;
  enabled: boolean;
  value: number; // credits or percent depending on kind
  description: string;
}

export interface Discount {
  id: string;
  name: string;
  kind: DiscountKind;
  value: number;
  scope: DiscountScope;
  scopeTargets: string[]; // country codes, lang codes or package ids
  startDate: string | null;
  endDate: string | null;
  enabled: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: PromoDiscountType;
  discountValue: number;
  bonusCredits: number;
  expiresAt: string | null;
  usageLimit: number; // 0 = unlimited
  onePerUser: boolean;
  active: boolean;
}

let uid = 0;
export const nextId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${(++uid).toString(36)}`;

export const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Demo seed data
// ---------------------------------------------------------------------------

export const DEFAULT_PACKAGES: CreditPackage[] = [
  {
    id: "pkg_starter",
    internalId: "STARTER",
    name: "Starter",
    customerName: "Starter",
    description: "A gentle way to try Project Joy.",
    originalPriceEUR: null,
    iconEmoji: "✨",
    highlighted: false,
    credits: 20,
    bonusCredits: 0,
    priceEUR: 9,
    productionCostPerCreditEUR: 0.15,
    badge: "new",
    color: "#F7C873",
    active: true,
    status: "active",
    visibleCountries: [],
    visibleLanguages: [],
    startDate: null,
    endDate: null,
    notes: "Entry-level package for first-time customers.",
    displayOrder: 1,
    updatedAt: nowIso(),
  },
  {
    id: "pkg_popular",
    internalId: "POPULAR",
    name: "Popular",
    customerName: "Popular",
    description: "Most chosen by our customers.",
    originalPriceEUR: 24,
    iconEmoji: "💛",
    highlighted: true,
    credits: 50,
    bonusCredits: 5,
    priceEUR: 19,
    productionCostPerCreditEUR: 0.14,
    badge: "popular",
    color: "#E58BA6",
    active: true,
    status: "active",
    visibleCountries: [],
    visibleLanguages: [],
    startDate: null,
    endDate: null,
    notes: "Most chosen package overall.",
    displayOrder: 2,
    updatedAt: nowIso(),
  },
  {
    id: "pkg_value",
    internalId: "VALUE",
    name: "Best Value",
    customerName: "Best Value",
    description: "Best price for every credit.",
    originalPriceEUR: 49,
    iconEmoji: "🌟",
    highlighted: false,
    credits: 100,
    bonusCredits: 15,
    priceEUR: 39,
    productionCostPerCreditEUR: 0.13,
    badge: "best_value",
    color: "#B58BE0",
    active: true,
    status: "active",
    visibleCountries: [],
    visibleLanguages: [],
    startDate: null,
    endDate: null,
    notes: "Best price per credit.",
    displayOrder: 3,
    updatedAt: nowIso(),
  },
  {
    id: "pkg_premium",
    internalId: "PREMIUM",
    name: "Premium",
    customerName: "Premium",
    description: "For studios and heavy users.",
    originalPriceEUR: 109,
    iconEmoji: "👑",
    highlighted: false,
    credits: 250,
    bonusCredits: 50,
    priceEUR: 89,
    productionCostPerCreditEUR: 0.12,
    badge: "limited",
    color: "#8FB8A7",
    active: true,
    status: "active",
    visibleCountries: [],
    visibleLanguages: [],
    startDate: null,
    endDate: null,
    notes: "For studios and heavy users.",
    displayOrder: 4,
    updatedAt: nowIso(),
  },
];

export const DEFAULT_BONUS_RULES: BonusRule[] = [
  { id: "br_fixed", kind: "fixed", enabled: true, value: 5, description: "Flat bonus credits on every purchase." },
  { id: "br_pct", kind: "percentage", enabled: true, value: 10, description: "Percentage bonus based on package credits." },
  { id: "br_first", kind: "first_purchase", enabled: true, value: 15, description: "Extra credits for the first purchase." },
  { id: "br_birthday", kind: "birthday", enabled: true, value: 20, description: "Birthday gift bonus credits." },
  { id: "br_holiday", kind: "holiday", enabled: false, value: 25, description: "Seasonal holiday campaign bonus." },
  { id: "br_promo", kind: "promotional", enabled: false, value: 15, description: "Bonus attached to a running promo." },
  { id: "br_referral", kind: "referral", enabled: true, value: 10, description: "Bonus when a friend joins." },
];

export const DEFAULT_DISCOUNTS: Discount[] = [
  {
    id: "dsc_welcome",
    name: "Welcome 10%",
    kind: "percentage",
    value: 10,
    scope: "global",
    scopeTargets: [],
    startDate: null,
    endDate: null,
    enabled: true,
  },
];

export const DEFAULT_PROMOS: PromoCode[] = [
  {
    id: "promo_launch",
    code: "JOY-LAUNCH",
    description: "Launch campaign — 15% off any package.",
    discountType: "percentage",
    discountValue: 15,
    bonusCredits: 0,
    expiresAt: null,
    usageLimit: 500,
    onePerUser: true,
    active: true,
  },
];

// ---------------------------------------------------------------------------
// Derived calculations — pure functions the UI can call while the admin
// edits values, without touching stored state.
// ---------------------------------------------------------------------------

export interface PricingBreakdown {
  finalCredits: number;
  effectivePricePerCredit: number;
  savingsPercent: number; // vs baseline pricePerCredit at credits only
  customerPaysEUR: number;
  platformRevenueEUR: number;
  estimatedCostEUR: number;
  grossProfitEUR: number;
  marginPercent: number;
}

export function computeBreakdown(
  pkg: CreditPackage,
  extraBonusCredits = 0,
  extraDiscountEUR = 0,
  extraDiscountPercent = 0,
): PricingBreakdown {
  const finalCredits = Math.max(0, pkg.credits + pkg.bonusCredits + extraBonusCredits);
  const pctOff = Math.min(90, Math.max(0, extraDiscountPercent));
  const baseAfterFixed = Math.max(0, pkg.priceEUR - Math.max(0, extraDiscountEUR));
  const customerPaysEUR = Math.max(0, baseAfterFixed * (1 - pctOff / 100));
  const effectivePricePerCredit = finalCredits > 0 ? customerPaysEUR / finalCredits : 0;
  const baselinePricePerCredit = pkg.credits > 0 ? pkg.priceEUR / pkg.credits : 0;
  const savingsPercent =
    baselinePricePerCredit > 0
      ? Math.max(0, (1 - effectivePricePerCredit / baselinePricePerCredit) * 100)
      : 0;
  const estimatedCostEUR = finalCredits * pkg.productionCostPerCreditEUR;
  const grossProfitEUR = customerPaysEUR - estimatedCostEUR;
  const marginPercent = customerPaysEUR > 0 ? (grossProfitEUR / customerPaysEUR) * 100 : 0;
  return {
    finalCredits,
    effectivePricePerCredit,
    savingsPercent,
    customerPaysEUR,
    platformRevenueEUR: customerPaysEUR,
    estimatedCostEUR,
    grossProfitEUR,
    marginPercent,
  };
}

export function overlappingDiscounts(list: Discount[]): string[][] {
  const active = list.filter((d) => d.enabled);
  const groups: string[][] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const aStart = a.startDate ? new Date(a.startDate).getTime() : -Infinity;
      const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
      const bStart = b.startDate ? new Date(b.startDate).getTime() : -Infinity;
      const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
      const overlap = aStart <= bEnd && bStart <= aEnd;
      if (!overlap) continue;
      const sameScope =
        a.scope === b.scope &&
        (a.scope === "global" ||
          a.scopeTargets.some((t) => b.scopeTargets.includes(t)));
      if (sameScope) groups.push([a.id, b.id]);
    }
  }
  return groups;
}

export const BADGE_KINDS: BadgeKind[] = ["none", "popular", "best_value", "limited", "new"];
export const BONUS_KINDS: BonusKind[] = [
  "fixed", "percentage", "first_purchase", "birthday", "holiday", "promotional", "referral",
];
export const DISCOUNT_KINDS: DiscountKind[] = ["percentage", "fixed"];
export const DISCOUNT_SCOPES: DiscountScope[] = ["global", "country", "language", "package"];
export const PROMO_DISCOUNT_TYPES: PromoDiscountType[] = ["percentage", "fixed", "bonus_credits"];

// ---------------------------------------------------------------------------
// Effective status, visibility & savings helpers
// ---------------------------------------------------------------------------

function toDate(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Derive the presentation status from stored status + active window. */
export function computeEffectiveStatus(
  p: Pick<CreditPackage, "status" | "startDate" | "endDate">,
  now: number = Date.now(),
): EffectiveStatus {
  if (p.status === "draft") return "draft";
  if (p.status === "inactive") return "inactive";
  const end = toDate(p.endDate);
  if (end !== null && end < now) return "expired";
  const start = toDate(p.startDate);
  if (start !== null && start > now) return "scheduled";
  return "active";
}

/** Whether a package should appear in the public-facing customer preview. */
export function isVisibleToCustomer(
  p: CreditPackage,
  ctx: { country?: string; language?: string; now?: number } = {},
): boolean {
  const eff = computeEffectiveStatus(p, ctx.now);
  if (eff !== "active") return false;
  if (
    ctx.country &&
    p.visibleCountries.length > 0 &&
    !p.visibleCountries.includes(ctx.country)
  )
    return false;
  if (
    ctx.language &&
    p.visibleLanguages.length > 0 &&
    !p.visibleLanguages.includes(ctx.language)
  )
    return false;
  return true;
}

/** Savings vs. original price. Returns zeros when no valid original is set. */
export function computeSavings(
  customerPrice: number,
  originalPrice: number | null,
): { amount: number; percent: number } {
  if (
    originalPrice === null ||
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(customerPrice) ||
    originalPrice <= 0 ||
    originalPrice <= customerPrice
  ) {
    return { amount: 0, percent: 0 };
  }
  const amount = originalPrice - customerPrice;
  return { amount, percent: (amount / originalPrice) * 100 };
}
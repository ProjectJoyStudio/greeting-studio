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

export interface CreditPackage {
  id: string;
  internalId: string;
  name: string;
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
    name: "Starter",
    credits: 20,
    bonusCredits: 0,
    priceEUR: 9,
    productionCostPerCreditEUR: 0.15,
    badge: "new",
    color: "#F7C873",
    active: true,
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
    name: "Popular",
    credits: 50,
    bonusCredits: 10,
    priceEUR: 19,
    productionCostPerCreditEUR: 0.14,
    badge: "popular",
    color: "#E58BA6",
    active: true,
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
    name: "Best Value",
    credits: 120,
    bonusCredits: 30,
    priceEUR: 39,
    productionCostPerCreditEUR: 0.13,
    badge: "best_value",
    color: "#B58BE0",
    active: true,
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
    name: "Premium",
    credits: 300,
    bonusCredits: 90,
    priceEUR: 89,
    productionCostPerCreditEUR: 0.12,
    badge: "limited",
    color: "#8FB8A7",
    active: true,
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
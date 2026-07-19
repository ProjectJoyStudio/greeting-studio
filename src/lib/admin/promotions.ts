// ---------------------------------------------------------------------------
// Promotions and Promo Codes — frontend-only demo store for the Admin Panel.
// Shapes are backend-ready (stable ids + ISO date strings) so a future API
// can drop in without a UI rewrite. No values here are commercial offers.
// ---------------------------------------------------------------------------

import { COUNTRY_OPTIONS, LANGUAGE_CODES } from "@/lib/admin/credit-packages";

export { COUNTRY_OPTIONS, LANGUAGE_CODES };

export type PromotionType =
  | "percentage_discount"
  | "fixed_discount"
  | "bonus_credits"
  | "extra_credits_percentage"
  | "first_purchase"
  | "package_specific"
  | "limited_time"
  | "country_specific"
  | "language_specific"
  | "seasonal";

export const PROMOTION_TYPES: PromotionType[] = [
  "percentage_discount",
  "fixed_discount",
  "bonus_credits",
  "extra_credits_percentage",
  "first_purchase",
  "package_specific",
  "limited_time",
  "country_specific",
  "language_specific",
  "seasonal",
];

export type PromotionStatus = "draft" | "active" | "inactive";
export type EffectivePromoStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "inactive"
  | "expired";

export interface Promotion {
  id: string;
  internalId: string;
  name: string;
  customerTitle: string;
  customerDescription: string;
  internalNotes: string;

  type: PromotionType;
  percentageValue: number;      // 0-100
  fixedDiscountEUR: number;     // >= 0
  bonusCredits: number;         // >= 0
  bonusPercentage: number;      // 0-100
  minimumPurchaseEUR: number;   // >= 0
  maximumDiscountEUR: number | null;

  applyAllPackages: boolean;
  packageIds: string[];
  applyAllCountries: boolean;
  countries: string[];
  applyAllLanguages: boolean;
  languages: string[];
  firstPurchaseOnly: boolean;
  oneUsePerUser: boolean;

  startDate: string | null;
  endDate: string | null;
  status: PromotionStatus;

  updatedAt: string;
}

export type PromoCodeDiscountType =
  | "percentage"
  | "fixed"
  | "bonus_credits"
  | "combined";

export const PROMO_CODE_TYPES: PromoCodeDiscountType[] = [
  "percentage",
  "fixed",
  "bonus_credits",
  "combined",
];

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  customerMessage: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  bonusCredits: number;
  linkedPromotionId: string | null;
  minimumPurchaseEUR: number;

  applyAllPackages: boolean;
  packageIds: string[];

  usageLimit: number; // 0 = unlimited
  onePerUser: boolean;
  startDate: string | null;
  expirationDate: string | null;
  active: boolean;
  internalNotes: string;
  updatedAt: string;
}

let uid = 0;
export const nextPromoId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${(++uid).toString(36)}`;

export const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Demonstration data — clearly marked, no commercial value
// ---------------------------------------------------------------------------

export const DEFAULT_PROMOTIONS: Promotion[] = [
  {
    id: "prm_welcome",
    internalId: "WELCOME_OFFER",
    name: "Welcome Offer",
    customerTitle: "Welcome to Project Joy",
    customerDescription: "Extra bonus credits on your first purchase.",
    internalNotes: "Demonstration data.",
    type: "first_purchase",
    percentageValue: 0,
    fixedDiscountEUR: 0,
    bonusCredits: 15,
    bonusPercentage: 0,
    minimumPurchaseEUR: 0,
    maximumDiscountEUR: null,
    applyAllPackages: true,
    packageIds: [],
    applyAllCountries: true,
    countries: [],
    applyAllLanguages: true,
    languages: [],
    firstPurchaseOnly: true,
    oneUsePerUser: true,
    startDate: null,
    endDate: null,
    status: "active",
    updatedAt: nowIso(),
  },
  {
    id: "prm_birthday",
    internalId: "BIRTHDAY_CAMPAIGN",
    name: "Birthday Campaign",
    customerTitle: "Happy Birthday from Project Joy",
    customerDescription: "A little gift of extra credits for your birthday.",
    internalNotes: "Demonstration data.",
    type: "bonus_credits",
    percentageValue: 0,
    fixedDiscountEUR: 0,
    bonusCredits: 20,
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
    oneUsePerUser: true,
    startDate: null,
    endDate: null,
    status: "active",
    updatedAt: nowIso(),
  },
  {
    id: "prm_holiday",
    internalId: "HOLIDAY_SALE",
    name: "Holiday Sale",
    customerTitle: "Holiday Sale",
    customerDescription: "Save on every credit package this season.",
    internalNotes: "Demonstration data.",
    type: "percentage_discount",
    percentageValue: 15,
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
    status: "active",
    updatedAt: nowIso(),
  },
];

export const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    id: "pc_popular10",
    code: "POPULAR10",
    description: "10% off the Popular package.",
    customerMessage: "Use POPULAR10 for 10% off the Popular package.",
    discountType: "percentage",
    discountValue: 10,
    bonusCredits: 0,
    linkedPromotionId: null,
    minimumPurchaseEUR: 0,
    applyAllPackages: false,
    packageIds: ["pkg_popular"],
    usageLimit: 500,
    onePerUser: true,
    startDate: null,
    expirationDate: null,
    active: true,
    internalNotes: "Demonstration data.",
    updatedAt: nowIso(),
  },
];

// ---------------------------------------------------------------------------
// Derived helpers — pure, no state
// ---------------------------------------------------------------------------

function toDate(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

export function computePromotionStatus(
  p: Pick<Promotion, "status" | "startDate" | "endDate">,
  now: number = Date.now(),
): EffectivePromoStatus {
  if (p.status === "draft") return "draft";
  if (p.status === "inactive") return "inactive";
  const end = toDate(p.endDate);
  if (end !== null && end < now) return "expired";
  const start = toDate(p.startDate);
  if (start !== null && start > now) return "scheduled";
  return "active";
}

export function computePromoCodeStatus(
  c: Pick<PromoCode, "active" | "startDate" | "expirationDate">,
  now: number = Date.now(),
): EffectivePromoStatus {
  if (!c.active) return "inactive";
  const end = toDate(c.expirationDate);
  if (end !== null && end < now) return "expired";
  const start = toDate(c.startDate);
  if (start !== null && start > now) return "scheduled";
  return "active";
}

/** Which promo types actually use a percentage field. */
export function usesPercentage(t: PromotionType): boolean {
  return t === "percentage_discount" || t === "seasonal" || t === "limited_time";
}
export function usesFixedDiscount(t: PromotionType): boolean {
  return t === "fixed_discount";
}
export function usesBonusCredits(t: PromotionType): boolean {
  return t === "bonus_credits" || t === "first_purchase";
}
export function usesBonusPercentage(t: PromotionType): boolean {
  return t === "extra_credits_percentage";
}

export interface BenefitPreview {
  originalPriceEUR: number;
  finalPriceEUR: number;
  savingsEUR: number;
  savingsPercent: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
}

/** Apply a promotion to a demo package price/credits. Pure. */
export function previewPromotionBenefit(
  p: Promotion,
  demoPriceEUR: number,
  demoCredits: number,
): BenefitPreview {
  let price = demoPriceEUR;
  let bonus = 0;
  const originalPrice = demoPriceEUR;

  if (usesPercentage(p.type)) {
    const pct = Math.min(100, Math.max(0, p.percentageValue));
    let cut = (price * pct) / 100;
    if (p.maximumDiscountEUR !== null && p.maximumDiscountEUR >= 0) {
      cut = Math.min(cut, p.maximumDiscountEUR);
    }
    price = Math.max(0, price - cut);
  } else if (usesFixedDiscount(p.type)) {
    price = Math.max(0, price - Math.max(0, p.fixedDiscountEUR));
  } else if (usesBonusCredits(p.type)) {
    bonus = Math.max(0, p.bonusCredits);
  } else if (usesBonusPercentage(p.type)) {
    const pct = Math.min(100, Math.max(0, p.bonusPercentage));
    bonus = Math.round((demoCredits * pct) / 100);
  }

  const savings = Math.max(0, originalPrice - price);
  const savingsPercent = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;
  return {
    originalPriceEUR: originalPrice,
    finalPriceEUR: price,
    savingsEUR: savings,
    savingsPercent,
    baseCredits: demoCredits,
    bonusCredits: bonus,
    totalCredits: demoCredits + bonus,
  };
}

export function previewPromoCodeBenefit(
  c: PromoCode,
  demoPriceEUR: number,
  demoCredits: number,
): BenefitPreview {
  let price = demoPriceEUR;
  let bonus = 0;
  const originalPrice = demoPriceEUR;

  if (c.discountType === "percentage" || c.discountType === "combined") {
    const pct = Math.min(100, Math.max(0, c.discountValue));
    price = Math.max(0, price - (price * pct) / 100);
  }
  if (c.discountType === "fixed") {
    price = Math.max(0, price - Math.max(0, c.discountValue));
  }
  if (c.discountType === "bonus_credits" || c.discountType === "combined") {
    bonus = Math.max(0, c.bonusCredits);
  }
  const savings = Math.max(0, originalPrice - price);
  const savingsPercent = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;
  return {
    originalPriceEUR: originalPrice,
    finalPriceEUR: price,
    savingsEUR: savings,
    savingsPercent,
    baseCredits: demoCredits,
    bonusCredits: bonus,
    totalCredits: demoCredits + bonus,
  };
}

// ---------------------------------------------------------------------------
// Overlap warnings
// ---------------------------------------------------------------------------

function windowOverlaps(
  aStart: string | null, aEnd: string | null,
  bStart: string | null, bEnd: string | null,
): boolean {
  const as = toDate(aStart) ?? -Infinity;
  const ae = toDate(aEnd) ?? Infinity;
  const bs = toDate(bStart) ?? -Infinity;
  const be = toDate(bEnd) ?? Infinity;
  return as <= be && bs <= ae;
}

function packageOverlap(
  aAll: boolean, aIds: string[], bAll: boolean, bIds: string[],
): boolean {
  if (aAll || bAll) return true;
  return aIds.some((id) => bIds.includes(id));
}

export type OverlapKind =
  | "same_package_period"
  | "multiple_percentage"
  | "package_and_code"
  | "large_total_discount"
  | "below_min_margin";

export interface OverlapWarning {
  kind: OverlapKind;
  message: string;
  aId: string;
  bId?: string;
}

/**
 * Return warnings for the current draft against the rest of the world.
 * `otherPromotions` and `activeCodes` are the already-persisted items.
 */
export function collectPromotionWarnings(
  draft: Promotion,
  otherPromotions: Promotion[],
  activeCodes: PromoCode[],
  ctx: { minMarginPercent: number; costPerCreditEUR: number },
): OverlapWarning[] {
  const out: OverlapWarning[] = [];
  const effDraft = computePromotionStatus(draft);
  if (effDraft !== "active" && effDraft !== "scheduled") return out;

  for (const other of otherPromotions) {
    if (other.id === draft.id) continue;
    const effOther = computePromotionStatus(other);
    if (effOther !== "active" && effOther !== "scheduled") continue;
    if (
      !windowOverlaps(draft.startDate, draft.endDate, other.startDate, other.endDate)
    ) continue;
    if (
      !packageOverlap(
        draft.applyAllPackages, draft.packageIds,
        other.applyAllPackages, other.packageIds,
      )
    ) continue;

    out.push({
      kind: "same_package_period",
      message: `same_package_period:${other.name}`,
      aId: draft.id,
      bId: other.id,
    });

    if (usesPercentage(draft.type) && usesPercentage(other.type)) {
      out.push({
        kind: "multiple_percentage",
        message: `multiple_percentage:${other.name}`,
        aId: draft.id, bId: other.id,
      });
    }
  }

  for (const code of activeCodes) {
    if (computePromoCodeStatus(code) !== "active") continue;
    if (
      !packageOverlap(
        draft.applyAllPackages, draft.packageIds,
        code.applyAllPackages, code.packageIds,
      )
    ) continue;
    out.push({
      kind: "package_and_code",
      message: `package_and_code:${code.code}`,
      aId: draft.id,
    });
  }

  // Total discount / margin heuristics on a sample package.
  const samplePrice = 20;
  const sampleCredits = 50;
  const preview = previewPromotionBenefit(draft, samplePrice, sampleCredits);
  if (preview.savingsPercent >= 50) {
    out.push({
      kind: "large_total_discount",
      message: `large_total_discount:${preview.savingsPercent.toFixed(0)}%`,
      aId: draft.id,
    });
  }
  const cost = ctx.costPerCreditEUR * preview.totalCredits;
  const revenue = preview.finalPriceEUR;
  const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
  if (revenue > 0 && margin < ctx.minMarginPercent) {
    out.push({
      kind: "below_min_margin",
      message: `below_min_margin:${margin.toFixed(0)}%`,
      aId: draft.id,
    });
  }
  return out;
}

export function collectPromoCodeWarnings(
  draft: PromoCode,
  promotions: Promotion[],
  otherCodes: PromoCode[],
  ctx: { minMarginPercent: number; costPerCreditEUR: number },
): OverlapWarning[] {
  const out: OverlapWarning[] = [];
  if (computePromoCodeStatus(draft) !== "active") return out;

  for (const p of promotions) {
    if (computePromotionStatus(p) !== "active") continue;
    if (
      !packageOverlap(
        draft.applyAllPackages, draft.packageIds,
        p.applyAllPackages, p.packageIds,
      )
    ) continue;
    out.push({
      kind: "package_and_code",
      message: `package_and_code:${p.name}`,
      aId: draft.id, bId: p.id,
    });
  }

  for (const other of otherCodes) {
    if (other.id === draft.id) continue;
    if (computePromoCodeStatus(other) !== "active") continue;
    if (
      !packageOverlap(
        draft.applyAllPackages, draft.packageIds,
        other.applyAllPackages, other.packageIds,
      )
    ) continue;
    if (
      (draft.discountType === "percentage" || draft.discountType === "combined") &&
      (other.discountType === "percentage" || other.discountType === "combined")
    ) {
      out.push({
        kind: "multiple_percentage",
        message: `multiple_percentage:${other.code}`,
        aId: draft.id, bId: other.id,
      });
    }
  }

  const preview = previewPromoCodeBenefit(draft, 20, 50);
  if (preview.savingsPercent >= 50) {
    out.push({
      kind: "large_total_discount",
      message: `large_total_discount:${preview.savingsPercent.toFixed(0)}%`,
      aId: draft.id,
    });
  }
  const cost = ctx.costPerCreditEUR * preview.totalCredits;
  const revenue = preview.finalPriceEUR;
  const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
  if (revenue > 0 && margin < ctx.minMarginPercent) {
    out.push({
      kind: "below_min_margin",
      message: `below_min_margin:${margin.toFixed(0)}%`,
      aId: draft.id,
    });
  }
  return out;
}

export function hasDangerousWarning(list: OverlapWarning[]): boolean {
  return list.some(
    (w) => w.kind === "large_total_discount" || w.kind === "below_min_margin",
  );
}

/** Benefit summary label used in tables. */
export function benefitLabel(p: Promotion): string {
  switch (p.type) {
    case "percentage_discount":
    case "seasonal":
    case "limited_time":
      return `-${p.percentageValue}%`;
    case "fixed_discount":
      return `-${p.fixedDiscountEUR} €`;
    case "bonus_credits":
    case "first_purchase":
      return `+${p.bonusCredits} credits`;
    case "extra_credits_percentage":
      return `+${p.bonusPercentage}% credits`;
    case "package_specific":
      return p.percentageValue > 0
        ? `-${p.percentageValue}%`
        : `-${p.fixedDiscountEUR} €`;
    case "country_specific":
    case "language_specific":
      return p.percentageValue > 0
        ? `-${p.percentageValue}%`
        : `+${p.bonusCredits} credits`;
  }
}

export function promoCodeBenefitLabel(c: PromoCode): string {
  const parts: string[] = [];
  if (c.discountType === "percentage" || c.discountType === "combined") {
    parts.push(`-${c.discountValue}%`);
  }
  if (c.discountType === "fixed") {
    parts.push(`-${c.discountValue} €`);
  }
  if (c.discountType === "bonus_credits" || c.discountType === "combined") {
    parts.push(`+${c.bonusCredits} credits`);
  }
  return parts.join(" · ") || "—";
}

export function sanitizeCode(v: string): string {
  return v.toUpperCase().replace(/\s+/g, "");
}
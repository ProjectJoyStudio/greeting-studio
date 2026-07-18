import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Project Joy — Admin Economy Center (frontend-only demo state).
// Editable configuration for the Admin Panel. Intentionally decoupled from
// src/lib/studio/pricing.ts: changing values here does NOT affect the public
// Studio in this task. A future backend will replace this in-memory store.
// ---------------------------------------------------------------------------

export type FormatKey =
  | "card"
  | "animated"
  | "song"
  | "video-greeting"
  | "video-clip"
  | "voice"
  | "fairy-tale"
  | "cartoon-episode"
  | "premium";

export const FORMAT_KEYS: FormatKey[] = [
  "card",
  "animated",
  "song",
  "video-greeting",
  "video-clip",
  "voice",
  "fairy-tale",
  "cartoon-episode",
  "premium",
];

export interface FormatConfig {
  id: FormatKey;
  enabled: boolean;
  isTimeBased: boolean;
  isPremium: boolean;
  baseCredits: number;
  creditsPer30s: number;
  minDurationSec: number;
  maxDurationSec: number;
  minOrderCredits: number;
  processingSecondsPer30s: number;
  standardMultiplier: number;
  priorityMultiplier: number;
  productionCost: number;
  markupPercent: number;
  minProfitPercent: number;
}

export interface GeneralCreditSettings {
  creditName: string;
  currency: string;
  creditValue: number;
  minPurchase: number;
  maxPurchase: number;
  minOrderValue: number;
  creditExpirationDays: number;
  creditExpirationEnabled: boolean;
  roundingRule: "none" | "up" | "nearest";
  minMarginPercent: number;
}

export interface ProcessingSettings {
  standardEnabled: boolean;
  standardCreditMult: number;
  standardTimeMult: number;
  standardMinBufferMin: number;
  standardMaxBufferMin: number;
  priorityEnabled: boolean;
  priorityCreditMult: number;
  priorityTimeMult: number;
  priorityExtraCredits: number;
  priorityDailyLimit: number;
}

export interface PremiumSettings {
  baseAssessment: number;
  typeCoef: number;
  durationCoef: number;
  charactersCoef: number;
  scenesCoef: number;
  voiceCoef: number;
  musicCoef: number;
  specialCoef: number;
  filesCoef: number;
  simpleMult: number;
  mediumMult: number;
  complexMult: number;
  priorityMult: number;
  minOrderCredits: number;
  manualReview: boolean;
}

export interface CostCalcSettings {
  productionCost: number;
  paymentCost: number;
  notificationCost: number;
  storageCost: number;
  supportReserve: number;
  regenReserve: number;
  refundReserve: number;
  markupPercent: number;
  taxPercent: number;
  customerCredits: number;
}

export interface SafetyLimits {
  maxCreditsPerOrder: number;
  maxDurationSec: number;
  maxEpisodes: number;
  maxActiveOrdersPerUser: number;
  maxPriorityOrders: number;
  minProfitMargin: number;
  blockBelowCost: boolean;
  manualReviewAbove: number;
  emergencyDisabled: Record<FormatKey, boolean>;
}

export interface EconomyState {
  general: GeneralCreditSettings;
  formats: Record<FormatKey, FormatConfig>;
  processing: ProcessingSettings;
  premium: PremiumSettings;
  cost: CostCalcSettings;
  safety: SafetyLimits;
}

const timeBased = (
  id: FormatKey,
  baseCredits: number,
  creditsPer30s: number,
  maxSec: number,
  procPer30s: number,
  cost: number,
): FormatConfig => ({
  id,
  enabled: true,
  isTimeBased: true,
  isPremium: false,
  baseCredits,
  creditsPer30s,
  minDurationSec: 30,
  maxDurationSec: maxSec,
  minOrderCredits: baseCredits,
  processingSecondsPer30s: procPer30s,
  standardMultiplier: 1,
  priorityMultiplier: 1.5,
  productionCost: cost,
  markupPercent: 200,
  minProfitPercent: 40,
});

export const DEFAULT_ECONOMY: EconomyState = {
  general: {
    creditName: "Joy Credit",
    currency: "EUR",
    creditValue: 0.5,
    minPurchase: 10,
    maxPurchase: 1000,
    minOrderValue: 1,
    creditExpirationDays: 365,
    creditExpirationEnabled: false,
    roundingRule: "up",
    minMarginPercent: 30,
  },
  formats: {
    card: {
      id: "card", enabled: true, isTimeBased: false, isPremium: false,
      baseCredits: 1, creditsPer30s: 0, minDurationSec: 0, maxDurationSec: 0,
      minOrderCredits: 1, processingSecondsPer30s: 0, standardMultiplier: 1,
      priorityMultiplier: 1.5, productionCost: 0.1, markupPercent: 400, minProfitPercent: 50,
    },
    animated: {
      id: "animated", enabled: true, isTimeBased: false, isPremium: false,
      baseCredits: 3, creditsPer30s: 0, minDurationSec: 0, maxDurationSec: 0,
      minOrderCredits: 3, processingSecondsPer30s: 0, standardMultiplier: 1,
      priorityMultiplier: 1.5, productionCost: 0.3, markupPercent: 350, minProfitPercent: 45,
    },
    song: timeBased("song", 6, 2, 300, 6 * 60, 0.8),
    "video-greeting": timeBased("video-greeting", 8, 3, 300, 12 * 60, 1.2),
    "video-clip": timeBased("video-clip", 14, 4, 480, 15 * 60, 2.5),
    voice: timeBased("voice", 4, 1, 300, 3 * 60, 0.4),
    "fairy-tale": timeBased("fairy-tale", 5, 1, 480, 5 * 60, 0.6),
    "cartoon-episode": timeBased("cartoon-episode", 16, 5, 480, 18 * 60, 3.2),
    premium: {
      id: "premium", enabled: true, isTimeBased: false, isPremium: true,
      baseCredits: 0, creditsPer30s: 0, minDurationSec: 0, maxDurationSec: 0,
      minOrderCredits: 40, processingSecondsPer30s: 0, standardMultiplier: 1,
      priorityMultiplier: 1.5, productionCost: 0, markupPercent: 250, minProfitPercent: 40,
    },
  },
  processing: {
    standardEnabled: true, standardCreditMult: 1, standardTimeMult: 1,
    standardMinBufferMin: 5, standardMaxBufferMin: 30,
    priorityEnabled: true, priorityCreditMult: 1.5, priorityTimeMult: 0.4,
    priorityExtraCredits: 5, priorityDailyLimit: 50,
  },
  premium: {
    baseAssessment: 30, typeCoef: 1, durationCoef: 0.2, charactersCoef: 2,
    scenesCoef: 3, voiceCoef: 5, musicCoef: 4, specialCoef: 8, filesCoef: 2,
    simpleMult: 1, mediumMult: 1.4, complexMult: 2, priorityMult: 1.5,
    minOrderCredits: 40, manualReview: true,
  },
  cost: {
    productionCost: 1.5, paymentCost: 0.4, notificationCost: 0.05, storageCost: 0.1,
    supportReserve: 0.3, regenReserve: 0.2, refundReserve: 0.15,
    markupPercent: 200, taxPercent: 20, customerCredits: 10,
  },
  safety: {
    maxCreditsPerOrder: 500, maxDurationSec: 480, maxEpisodes: 5,
    maxActiveOrdersPerUser: 10, maxPriorityOrders: 50, minProfitMargin: 30,
    blockBelowCost: true, manualReviewAbove: 200,
    emergencyDisabled: {
      card: false, animated: false, song: false, "video-greeting": false,
      "video-clip": false, voice: false, "fairy-tale": false,
      "cartoon-episode": false, premium: false,
    },
  },
};

type Ctx = {
  state: EconomyState;
  dirty: boolean;
  update: (mut: (draft: EconomyState) => void) => void;
  save: () => void;
  discard: () => void;
};

const EconomyCtx = createContext<Ctx | null>(null);

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);
}

export function EconomyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EconomyState>(() => clone(DEFAULT_ECONOMY));
  const originalRef = useRef<EconomyState>(clone(DEFAULT_ECONOMY));
  const [dirty, setDirty] = useState(false);

  const update = useCallback((mut: (draft: EconomyState) => void) => {
    setState((prev) => {
      const next = clone(prev);
      mut(next);
      return next;
    });
    setDirty(true);
  }, []);

  const save = useCallback(() => {
    originalRef.current = clone(state);
    setDirty(false);
  }, [state]);

  const discard = useCallback(() => {
    setState(clone(originalRef.current));
    setDirty(false);
  }, []);

  const value = useMemo(
    () => ({ state, dirty, update, save, discard }),
    [state, dirty, update, save, discard],
  );

  return <EconomyCtx.Provider value={value}>{children}</EconomyCtx.Provider>;
}

export function useEconomy() {
  const ctx = useContext(EconomyCtx);
  if (!ctx) throw new Error("useEconomy must be used inside EconomyProvider");
  return ctx;
}

export function estimateFormat(
  cfg: FormatConfig,
  durationSec: number,
  tier: "standard" | "priority",
  episodes: number,
  processing: ProcessingSettings,
): { credits: number; processingSeconds: number } {
  const mult = tier === "priority" ? processing.priorityCreditMult : processing.standardCreditMult;
  const tmult = tier === "priority" ? processing.priorityTimeMult : processing.standardTimeMult;
  const units = cfg.isTimeBased ? durationSec / 30 : 0;
  const ep = Math.max(1, episodes);
  const credits = Math.max(
    cfg.minOrderCredits,
    Math.round((cfg.baseCredits + units * cfg.creditsPer30s) * mult * ep),
  );
  const proc = Math.max(
    30,
    Math.round(units * cfg.processingSecondsPer30s * tmult * ep),
  );
  return { credits, processingSeconds: proc };
}

/** Coarse translated bucket — Project Joy never shows exact clock times. */
export function approxDurationKey(seconds: number): string {
  if (seconds <= 5 * 60) return "approx_5m";
  if (seconds <= 10 * 60) return "approx_10m";
  if (seconds <= 20 * 60) return "approx_20m";
  if (seconds <= 45 * 60) return "approx_45m";
  if (seconds <= 60 * 60) return "approx_1h";
  if (seconds <= 2 * 3600) return "approx_2h";
  if (seconds <= 24 * 3600) return "approx_1d";
  return "approx_1_2d";
}

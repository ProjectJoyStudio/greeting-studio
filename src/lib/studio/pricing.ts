// ---------------------------------------------------------------------------
// Project Joy Studio — temporary pricing & estimate configuration.
//
// This module is a placeholder. Every value here is a demonstration default
// designed to be replaced later by values loaded from the Admin Economy
// settings. Nothing in this file should be treated as a final commercial
// price or SLA. Studio UI reads from this module so calculations live in
// exactly one place.
// ---------------------------------------------------------------------------

export type StudioGiftId =
  | "card"
  | "animated"
  | "song"
  | "video-greeting"
  | "video-clip"
  | "fairy-tale"
  | "cartoon"
  | "premium";

export type QueueTier = "standard" | "priority";

export interface DurationSpec {
  /** Allowed duration values, in seconds. */
  allowed: number[];
  /** Default seconds when the format is first picked. */
  default: number;
}

export interface FormatPricing {
  id: StudioGiftId;
  /** Base credits at minimum duration (or single-shot for static formats). */
  baseCredits: number;
  /** Additional credits per 30 seconds beyond the base. */
  creditsPer30s: number;
  /** null → static format, hide the duration control. */
  duration: DurationSpec | null;
  /** Base processing time in seconds. */
  baseProcessingSeconds: number;
  /** Additional processing time per 30 seconds of output. */
  processingSecondsPer30s: number;
  /** True → prep time is expressed in working days (human craft). */
  humanCraft: boolean;
  humanCraftDaysMin?: number;
  humanCraftDaysMax?: number;
}

export const STUDIO_PRICING: Record<StudioGiftId, FormatPricing> = {
  card: {
    id: "card",
    baseCredits: 1,
    creditsPer30s: 0,
    duration: null,
    baseProcessingSeconds: 5 * 60,
    processingSecondsPer30s: 0,
    humanCraft: false,
  },
  animated: {
    id: "animated",
    baseCredits: 3,
    creditsPer30s: 0,
    duration: null,
    baseProcessingSeconds: 25 * 60,
    processingSecondsPer30s: 0,
    humanCraft: false,
  },
  song: {
    id: "song",
    baseCredits: 6,
    creditsPer30s: 2,
    duration: { allowed: [60, 90, 120, 180, 300], default: 120 },
    baseProcessingSeconds: 40 * 60,
    processingSecondsPer30s: 6 * 60,
    humanCraft: false,
  },
  "video-greeting": {
    id: "video-greeting",
    baseCredits: 8,
    creditsPer30s: 3,
    duration: { allowed: [30, 60, 90, 120], default: 60 },
    baseProcessingSeconds: 45 * 60,
    processingSecondsPer30s: 12 * 60,
    humanCraft: false,
  },
  "video-clip": {
    id: "video-clip",
    baseCredits: 14,
    creditsPer30s: 4,
    duration: { allowed: [90, 120, 180, 300], default: 120 },
    baseProcessingSeconds: 60 * 60,
    processingSecondsPer30s: 15 * 60,
    humanCraft: false,
  },
  "fairy-tale": {
    id: "fairy-tale",
    baseCredits: 5,
    creditsPer30s: 1,
    duration: { allowed: [120, 180, 300], default: 180 },
    baseProcessingSeconds: 25 * 60,
    processingSecondsPer30s: 5 * 60,
    humanCraft: false,
  },
  cartoon: {
    id: "cartoon",
    baseCredits: 16,
    creditsPer30s: 5,
    duration: { allowed: [60, 90, 120, 180], default: 90 },
    baseProcessingSeconds: 70 * 60,
    processingSecondsPer30s: 18 * 60,
    humanCraft: false,
  },
  premium: {
    id: "premium",
    baseCredits: 50,
    creditsPer30s: 0,
    duration: null,
    baseProcessingSeconds: 0,
    processingSecondsPer30s: 0,
    humanCraft: true,
    humanCraftDaysMin: 3,
    humanCraftDaysMax: 5,
  },
};

/** Priority multipliers — placeholders, replace via Admin Economy. */
export const PRIORITY_CREDIT_MULTIPLIER = 1.5;
export const PRIORITY_TIME_MULTIPLIER = 0.4;

/** Queue placeholders — replace via Admin Economy. */
export const QUEUE_STANDARD_POSITION = 5;
export const QUEUE_PRIORITY_POSITION = 1;
export const QUEUE_DELAY_SECONDS_PER_POSITION = 8 * 60;

export interface Estimate {
  credits: number;
  processingSeconds: number;
  queuePosition: number;
  startInSeconds: number;
  completionInSeconds: number;
  humanCraft: boolean;
  humanCraftDaysMin?: number;
  humanCraftDaysMax?: number;
}

export function computeEstimate(
  giftId: StudioGiftId,
  durationSeconds: number | null,
  tier: QueueTier,
): Estimate {
  const p = STUDIO_PRICING[giftId];
  const priorityCredit = tier === "priority" ? PRIORITY_CREDIT_MULTIPLIER : 1;
  const priorityTime = tier === "priority" ? PRIORITY_TIME_MULTIPLIER : 1;
  const position =
    tier === "priority" ? QUEUE_PRIORITY_POSITION : QUEUE_STANDARD_POSITION;

  if (p.humanCraft) {
    return {
      credits: Math.round(p.baseCredits * priorityCredit),
      processingSeconds: 0,
      queuePosition: position,
      startInSeconds: 0,
      completionInSeconds: 0,
      humanCraft: true,
      humanCraftDaysMin: p.humanCraftDaysMin,
      humanCraftDaysMax: p.humanCraftDaysMax,
    };
  }

  const dur = durationSeconds ?? 0;
  const units = dur > 0 ? dur / 30 : 0;
  const credits = Math.max(
    1,
    Math.round((p.baseCredits + units * p.creditsPer30s) * priorityCredit),
  );
  const processing = Math.max(
    30,
    Math.round(
      (p.baseProcessingSeconds + units * p.processingSecondsPer30s) *
        priorityTime,
    ),
  );
  const startIn = Math.round(
    position * QUEUE_DELAY_SECONDS_PER_POSITION * priorityTime,
  );
  return {
    credits,
    processingSeconds: processing,
    queuePosition: position,
    startInSeconds: startIn,
    completionInSeconds: startIn + processing,
    humanCraft: false,
  };
}

/** Map an exact seconds value to its translation key. */
export function durationKey(seconds: number): string {
  const map: Record<number, string> = {
    30: "dur_30s",
    60: "dur_60s",
    90: "dur_90s",
    120: "dur_2m",
    180: "dur_3m",
    300: "dur_5m",
  };
  return map[seconds] ?? "dur_60s";
}

/** Break seconds into a rounded {value, unitKey} pair for i18n formatting. */
export function humanizeSeconds(seconds: number): {
  value: number;
  unitKey: "unit_seconds" | "unit_minutes" | "unit_hours" | "unit_days";
} {
  if (seconds < 60)
    return { value: Math.max(1, Math.round(seconds)), unitKey: "unit_seconds" };
  if (seconds < 3600)
    return { value: Math.max(1, Math.round(seconds / 60)), unitKey: "unit_minutes" };
  if (seconds < 86400)
    return { value: Math.max(1, Math.round(seconds / 3600)), unitKey: "unit_hours" };
  return { value: Math.max(1, Math.round(seconds / 86400)), unitKey: "unit_days" };
}
// Client-safe rules of the second page of the Personal Video Greeting:
// how long a video may be, what it costs and how well a greeting fits.

export const PVS_MIN_SECONDS = 5;
export const PVS_MAX_SECONDS = 60;
export const PVS_STEP_SECONDS = 1;
export const PVS_DEFAULT_SECONDS = 15;

/** One second of finished video costs one credit. */
export const PVS_CREDITS_PER_SECOND = 1;

/** A comfortable, warm speaking pace. */
export const PVS_WORDS_PER_SECOND = 2.2;

export type PvsGreetingMode = "manual" | "keywords";

export interface PvsVideoSetup {
  durationSeconds: number;
  greetingMode: PvsGreetingMode;
  greetingText: string;
  greetingKeywords: string;
}

export const PVS_DEFAULT_SETUP: PvsVideoSetup = {
  durationSeconds: PVS_DEFAULT_SECONDS,
  greetingMode: "manual",
  greetingText: "",
  greetingKeywords: "",
};

export function clampDuration(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return PVS_DEFAULT_SECONDS;
  return Math.min(PVS_MAX_SECONDS, Math.max(PVS_MIN_SECONDS, n));
}

export function videoCredits(seconds: number): number {
  return clampDuration(seconds) * PVS_CREDITS_PER_SECOND;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export interface PvsFit {
  words: number;
  target: number;
  min: number;
  max: number;
  state: "empty" | "ok" | "long" | "short";
  /** Roughly how long the greeting takes to speak. */
  spokenSeconds: number;
}

/** How the written greeting relates to the chosen video length. */
export function greetingFit(text: string, seconds: number): PvsFit {
  const duration = clampDuration(seconds);
  const target = Math.round(duration * PVS_WORDS_PER_SECOND);
  const min = Math.max(3, Math.round(target * 0.8));
  const max = Math.round(target * 1.1);
  const words = countWords(text);
  const spokenSeconds = Math.round((words / PVS_WORDS_PER_SECOND) * 10) / 10;
  const state = words === 0 ? "empty" : words > max ? "long" : words < min ? "short" : "ok";
  return { words, target, min, max, state, spokenSeconds };
}

export interface PvsCostSummary {
  alreadySpent: number;
  video: number;
  voice: number;
  total: number;
  remaining: number;
}

/** Live order cost — nothing is ever deducted while the page is open. */
export function costSummary(
  alreadySpent: number,
  seconds: number,
  balance: number,
): PvsCostSummary {
  const video = videoCredits(seconds);
  const voice = 0;
  const total = video + voice;
  return { alreadySpent, video, voice, total, remaining: Math.max(0, balance - total) };
}

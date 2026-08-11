// Client-safe rules of the second page of the Personal Video Greeting:
// how long a video may be, what it costs and how well a greeting fits.

export const PVS_MIN_SECONDS = 5;
export const PVS_MAX_SECONDS = 15;
export const PVS_STEP_SECONDS = 1;
export const PVS_DEFAULT_SECONDS = 10;

/** One second of finished video costs one credit. */
export const PVS_CREDITS_PER_SECOND = 1;

/**
 * Scene sounds are paused while a separate, controlled scene-sound solution is
 * being prepared. Nothing is generated, so nothing is ever charged for them.
 */
export const PVS_SCENE_SOUNDS_ENABLED = false;

/**
 * Scene sounds are the quiet life of the picture — wind, waves, a room, a
 * street. They are optional and priced in three simple steps.
 */
export function sceneSoundCredits(seconds: number): number {
  if (!PVS_SCENE_SOUNDS_ENABLED) return 0;
  const duration = clampDuration(seconds);
  if (duration <= 5) return 2;
  if (duration <= 10) return 4;
  return 6;
}

/** Silence reserved at the very start and the very end of every video. */
export const PVS_LEAD_IN_SECONDS = 0.5;
export const PVS_TAIL_OUT_SECONDS = 0.5;

/**
 * The one safe word limit Project Joy uses everywhere: writing a greeting,
 * recommending a length, checking the parts and generating the speech.
 * A five second video carries seven words, and every further second of video
 * carries one more word.
 */
export function safeWordLimit(videoSeconds: number): number {
  return clampDuration(videoSeconds) + 2;
}

/** The same limit seen from the time left for speech inside the video. */
export function safeWordLimitForSpeech(speechSeconds: number): number {
  const speech = Number(speechSeconds);
  if (!Number.isFinite(speech) || speech <= 0) return safeWordLimit(PVS_MIN_SECONDS);
  return safeWordLimit(speech + PVS_LEAD_IN_SECONDS + PVS_TAIL_OUT_SECONDS);
}

/** Time the speech itself may take inside a video of this length. */
export function speechSeconds(videoSeconds: number): number {
  return Math.max(1, clampDuration(videoSeconds) - PVS_LEAD_IN_SECONDS - PVS_TAIL_OUT_SECONDS);
}

/** The pace that follows from the safe limit, in words per second of speech. */
export function wordsPerSecond(videoSeconds: number): number {
  return safeWordLimit(videoSeconds) / speechSeconds(videoSeconds);
}

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
  const max = safeWordLimit(duration);
  const target = max;
  // A greeting that already fits is finished: only a nearly empty one is short.
  const min = Math.min(3, max);
  const words = countWords(text);
  const spokenSeconds = Math.round((words / wordsPerSecond(duration)) * 10) / 10;
  const state = words === 0 ? "empty" : words > max ? "long" : words < min ? "short" : "ok";
  return { words, target, min, max, state, spokenSeconds };
}

export interface PvsCostSummary {
  alreadySpent: number;
  video: number;
  voice: number;
  sceneSounds: number;
  total: number;
  remaining: number;
}

/** Live order cost — nothing is ever deducted while the page is open. */
export function costSummary(
  alreadySpent: number,
  seconds: number,
  balance: number,
  sceneSoundsEnabled = false,
): PvsCostSummary {
  const video = videoCredits(seconds);
  const voice = 0;
  const sceneSounds = sceneSoundsEnabled ? sceneSoundCredits(seconds) : 0;
  const total = video + voice + sceneSounds;
  return {
    alreadySpent,
    video,
    voice,
    sceneSounds,
    total,
    remaining: Math.max(0, balance - total),
  };
}

// Client-safe types shared by the Live Greeting Cards section.

import { MUSIC_VOLUME_GAIN, type MusicVolume } from "@/lib/music/types";

/**
 * The optional background music of one live greeting card. Live cards never
 * speak, so only the music itself and its level are kept here.
 */
export interface LiveCardMusic {
  mode: "none" | "library";
  trackId: string | null;
  trackTitle: string;
  trackBucket: string | null;
  trackPath: string | null;
  volume: MusicVolume;
  /** 0…1 level used when the music is written into the finished file. */
  gain: number;
}

export const DEFAULT_LIVE_CARD_MUSIC: LiveCardMusic = {
  mode: "none",
  trackId: null,
  trackTitle: "",
  trackBucket: null,
  trackPath: null,
  volume: "medium",
  gain: MUSIC_VOLUME_GAIN.medium,
};

/** Reads whatever is stored with a card back into complete music settings. */
export function normalizeLiveCardMusic(value: unknown): LiveCardMusic {
  const raw = (value ?? {}) as Partial<LiveCardMusic>;
  const volume: MusicVolume =
    raw.volume === "quiet" || raw.volume === "louder" || raw.volume === "medium"
      ? raw.volume
      : "medium";
  const mode = raw.mode === "library" && raw.trackBucket && raw.trackPath ? "library" : "none";
  const gain = Number(raw.gain);
  return {
    mode,
    trackId: typeof raw.trackId === "string" ? raw.trackId : null,
    trackTitle: typeof raw.trackTitle === "string" ? raw.trackTitle : "",
    trackBucket: typeof raw.trackBucket === "string" ? raw.trackBucket : null,
    trackPath: typeof raw.trackPath === "string" ? raw.trackPath : null,
    volume,
    gain: Number.isFinite(gain) && gain > 0 && gain <= 1 ? gain : MUSIC_VOLUME_GAIN[volume],
  };
}

export type LiveCardSource = "generated" | "upload";

export interface LiveCardAsset {
  id: string;
  status: string;
  prompt: string;
  /** English wording actually sent to the engine — never shown to the person. */
  promptEnglish: string | null;
  /** Groups every version created in one live greeting card session. */
  sessionId: string | null;
  aspectRatio: string | null;
  generatorKey: string | null;
  /** True when this is the chosen source picture for the animation step. */
  selected: boolean;
  source: LiveCardSource;
  createdAt: string;
  /** Signed, renderable URL resolved at read time. */
  imageUrl: string | null;
  /** Reserved for the animation phase. */
  durationSeconds: number | null;
  priceCredits: number | null;
  videoUrl: string | null;
  videoStatus: string | null;
}

export type LiveCardResult =
  | { ok: true; card: LiveCardAsset }
  | { ok: false; errorCode: string; errorMessage: string };

/** Aspect ratios offered by the Live Greeting Cards composer. */
export const LIVE_CARD_RATIOS = ["1:1", "4:5", "9:16", "16:9"] as const;
export type LiveCardRatio = (typeof LIVE_CARD_RATIOS)[number];

/** Fallback only — the real list always comes from the generator configuration. */
export const PLANNED_VIDEO_DURATIONS = [3, 4, 5, 6, 7] as const;

/** Lifecycle of one animation, mirrored in the interface as plain progress. */
export type AnimationStatus =
  | "preparing"
  | "queued"
  | "processing"
  | "storing"
  | "ready"
  | "failed";

export interface LiveCardAnimation {
  id: string;
  status: AnimationStatus;
  sourceCardId: string | null;
  sourceImageUrl: string | null;
  /** Exactly what the person wrote, in their own language. */
  prompt: string;
  /** English wording sent to the engine — never shown to the person. */
  promptEnglish: string | null;
  durationSeconds: number;
  aspectRatio: string | null;
  videoUrl: string | null;
  errorCode: string | null;
  createdAt: string;
}

export type AnimationResult =
  | { ok: true; animation: LiveCardAnimation }
  | { ok: false; errorCode: string; errorMessage: string };

/**
 * One finished live greeting card as it is kept in the personal account and in
 * the administration. Fields that belong to later phases (sending, publishing,
 * scheduled delivery, credits, sound and music) are already part of the shape
 * so those features can be added without touching the workflow.
 */
export interface LiveGreetingRecord {
  id: string;
  status: string;
  title: string | null;
  /** Description used to create the source picture. */
  imagePrompt: string | null;
  motionPrompt: string;
  motionPromptEnglish: string | null;
  durationSeconds: number;
  aspectRatio: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  /**
   * The plain animation without any greeting burned in. Final rendering always
   * starts from this file, so a card can be re-rendered without stacking a
   * second text layer on top of an already finished video.
   */
  sourceVideoUrl: string | null;
  /** Editable draft greeting metadata; finished viewers never overlay it. */
  greetingText: string;
  greetingMode: "manual" | "keywords";
  greetingKeywords: string[];
  textDesign: import("@/lib/greeting-card/types").CardTextDesign;
  /** True once the final file with the greeting burned in has been rendered. */
  isFinalized: boolean;
  /** True when the finished file already carries the greeting in its frames. */
  hasBurnedText: boolean;
  soundEnabled: boolean;
  /** Optional background music chosen for this card. */
  music: LiveCardMusic;
  isShared: boolean;
  shareSlug: string | null;
  scheduledSendAt: string | null;
  priceCredits: number | null;
  /** Reason of a failed generation, if any. */
  errorCode?: string | null;
  /**
   * Which stage of one live greeting project this entry represents:
   * "image" — start pictures only, the animation has not been ordered yet;
   * "animation" — the animation of that same project.
   * One project always produces exactly one entry.
   */
  kind?: "image" | "animation";
  /** The creation session the project belongs to. */
  sessionId?: string | null;
  /** How many start-image variants the project currently keeps. */
  variantCount?: number;
  createdAt: string;
}


/** Optional motion presets. The label text itself is localised in the UI. */
export const MOTION_PRESET_KEYS = [
  "camera",
  "natural",
  "nature",
  "water",
  "cinematic",
] as const;
export type MotionPresetKey = (typeof MOTION_PRESET_KEYS)[number];
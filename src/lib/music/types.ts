// Background music of a Personal Video Greeting: the Project Joy library,
// the music a customer brings and the settings kept for the final mixing.

export const MUSIC_LIBRARY_BUCKET = "music-library";
export const MUSIC_UPLOAD_BUCKET = "pvg-music";

/** Categories an administrator may give a track. More can be added later. */
export const MUSIC_CATEGORIES = [
  "festive",
  "happy",
  "calm",
  "romantic",
  "family",
  "ceremonial",
  "background",
] as const;

export type MusicCategory = (typeof MUSIC_CATEGORIES)[number] | string;

export interface MusicTrack {
  id: string;
  title: string;
  category: MusicCategory;
  storageBucket: string;
  storagePath: string;
  durationSeconds: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  /** Playable link, prepared when the track is read. */
  audioUrl?: string | null;
}

export type MusicMode = "none" | "library" | "upload";
export type MusicVolume = "quiet" | "medium" | "louder";

/** How loud the music sits under the voice, as a share of full volume. */
export const MUSIC_VOLUME_GAIN: Record<MusicVolume, number> = {
  quiet: 0.12,
  medium: 0.22,
  louder: 0.35,
};

/** Short, natural fades at both ends of the music. */
export const MUSIC_FADE_IN_SECONDS = 1;
export const MUSIC_FADE_OUT_SECONDS = 1.5;

/** Background music never costs a credit. */
export const MUSIC_CREDITS = 0;

export interface PvgMusicSettings {
  mode: MusicMode;
  /** Library choice, kept with a copy of its details so it survives removal. */
  trackId: string | null;
  trackTitle: string;
  trackCategory: string;
  trackBucket: string | null;
  trackPath: string | null;
  /** Music the customer brought for this project only. */
  uploadBucket: string | null;
  uploadPath: string | null;
  uploadName: string;
  uploadDurationSeconds: number;
  volume: MusicVolume;
  /** Playback balance the person approved, kept for the final mixing. 0…1 */
  voiceVolume: number;
  musicVolume: number;
  /** Prepared for the final mixing: the voice always stays the main sound. */
  ducking: { enabled: boolean; duckedGain: number; releaseSeconds: number };
  fadeInSeconds: number;
  fadeOutSeconds: number;
  /** A track shorter than the video may be looped when it sounds natural. */
  loopWhenShorter: boolean;
}

export const DEFAULT_MUSIC_SETTINGS: PvgMusicSettings = {
  mode: "none",
  trackId: null,
  trackTitle: "",
  trackCategory: "",
  trackBucket: null,
  trackPath: null,
  uploadBucket: null,
  uploadPath: null,
  uploadName: "",
  uploadDurationSeconds: 0,
  volume: "quiet",
  voiceVolume: 0.9,
  musicVolume: 0.22,
  ducking: { enabled: true, duckedGain: 0.35, releaseSeconds: 0.6 },
  fadeInSeconds: MUSIC_FADE_IN_SECONDS,
  fadeOutSeconds: MUSIC_FADE_OUT_SECONDS,
  loopWhenShorter: true,
};

function volume(value: unknown): MusicVolume {
  return value === "medium" || value === "louder" ? value : "quiet";
}

function gain(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/** Reads whatever is stored with a project back into complete settings. */
export function normalizeMusicSettings(value: unknown): PvgMusicSettings {
  const raw = (value ?? {}) as Partial<PvgMusicSettings> & Record<string, unknown>;
  const mode: MusicMode = raw.mode === "library" || raw.mode === "upload" ? raw.mode : "none";
  const duck = (raw.ducking ?? {}) as Partial<PvgMusicSettings["ducking"]>;
  return {
    mode,
    trackId: typeof raw.trackId === "string" ? raw.trackId : null,
    trackTitle: typeof raw.trackTitle === "string" ? raw.trackTitle : "",
    trackCategory: typeof raw.trackCategory === "string" ? raw.trackCategory : "",
    trackBucket: typeof raw.trackBucket === "string" ? raw.trackBucket : null,
    trackPath: typeof raw.trackPath === "string" ? raw.trackPath : null,
    uploadBucket: typeof raw.uploadBucket === "string" ? raw.uploadBucket : null,
    uploadPath: typeof raw.uploadPath === "string" ? raw.uploadPath : null,
    uploadName: typeof raw.uploadName === "string" ? raw.uploadName : "",
    uploadDurationSeconds: Number(raw.uploadDurationSeconds ?? 0) || 0,
    volume: volume(raw.volume),
    voiceVolume: gain(raw.voiceVolume, DEFAULT_MUSIC_SETTINGS.voiceVolume),
    musicVolume: gain(
      raw.musicVolume,
      MUSIC_VOLUME_GAIN[volume(raw.volume)] ?? DEFAULT_MUSIC_SETTINGS.musicVolume,
    ),
    ducking: {
      enabled: duck.enabled !== false,
      duckedGain: Number(duck.duckedGain ?? DEFAULT_MUSIC_SETTINGS.ducking.duckedGain) || 0.35,
      releaseSeconds:
        Number(duck.releaseSeconds ?? DEFAULT_MUSIC_SETTINGS.ducking.releaseSeconds) || 0.6,
    },
    fadeInSeconds: Number(raw.fadeInSeconds ?? MUSIC_FADE_IN_SECONDS) || MUSIC_FADE_IN_SECONDS,
    fadeOutSeconds: Number(raw.fadeOutSeconds ?? MUSIC_FADE_OUT_SECONDS) || MUSIC_FADE_OUT_SECONDS,
    loopWhenShorter: raw.loopWhenShorter !== false,
  };
}

/**
 * How the chosen music is used inside a video of this length. The music is
 * never sped up or slowed down: it is simply cut, faded or gently looped.
 */
export interface MusicPlan {
  neededSeconds: number;
  usedSeconds: number;
  loops: number;
  trimmed: boolean;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  gain: number;
}

export function musicPlan(
  settings: PvgMusicSettings,
  videoSeconds: number,
  trackSeconds: number,
): MusicPlan | null {
  if (settings.mode === "none") return null;
  const needed = Math.max(1, Math.round(videoSeconds));
  const source = trackSeconds > 0 ? trackSeconds : needed;
  const loops = source >= needed || !settings.loopWhenShorter ? 1 : Math.ceil(needed / source);
  const used = Math.min(needed, source * loops);
  return {
    neededSeconds: needed,
    usedSeconds: Math.round(used * 10) / 10,
    loops,
    trimmed: source * loops > needed,
    fadeInSeconds: Math.min(settings.fadeInSeconds, needed / 4),
    fadeOutSeconds: Math.min(settings.fadeOutSeconds, needed / 3),
    gain: settings.musicVolume,
  };
}

// Client-safe description of "My Voices": the personal voice PROFILES of one
// person. A profile is a reusable, cloned voice — never a finished recording —
// so it can speak any future greeting text through the studio's own engine.

/** Where a saved voice profile lives. */
export type PersonalVoiceScope = "library" | "project";

/** How far Project Joy has come with preparing one personal voice profile. */
export type PersonalVoiceStatus = "pending" | "processing" | "ready" | "failed";

/** Everything Project Joy keeps about one personal voice profile. */
export interface PersonalVoice {
  id: string;
  displayName: string;
  scope: PersonalVoiceScope;
  projectId: string | null;
  language: string;
  durationSeconds: number;
  sourceUrl: string | null;
  processedUrl: string | null;
  /** The cloned voice at the connected studio, once one exists. */
  providerVoiceId: string | null;
  /** How many enrollment samples this profile was cloned from (1 or 2). */
  sampleCount: number;
  /** A short test phrase spoken by the profile — never the raw sample. */
  previewUrl: string | null;
  processingStatus: PersonalVoiceStatus;
  processingError: string | null;
  consentConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * The enrollment recording kept for reference only. It is never sent to the
 * studio again once the profile is cloned, and it is never used as greeting
 * audio: every greeting is spoken fresh by the cloned profile.
 */
export function personalVoiceAudio(voice: PersonalVoice): string | null {
  return voice.processedUrl ?? voice.sourceUrl;
}

/** The reference stored on a participant when a personal profile is chosen. */
export function personalVoiceRef(id: string): string {
  return `personal:${id}`;
}

/** True when a voice reference points at a personal voice profile. */
export function isPersonalVoiceRef(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("personal:") && value.length > 9;
}

/** The profile id inside a `personal:<uuid>` reference, or null otherwise. */
export function personalVoiceIdOf(ref: string): string | null {
  if (!isPersonalVoiceRef(ref)) return null;
  const id = ref.slice("personal:".length).trim();
  return id.length > 0 ? id : null;
}

/**
 * The way a saved voice delivers the greeting. A style belongs to one greeting
 * only — it never creates a second copy of the voice.
 */
export type PersonalVoiceStyle =
  | "natural"
  | "warm"
  | "joyful"
  | "ceremonial"
  | "calm"
  | "energetic"
  | "gentle"
  | "humorous";

export const PERSONAL_VOICE_STYLES: PersonalVoiceStyle[] = [
  "natural",
  "warm",
  "joyful",
  "ceremonial",
  "calm",
  "energetic",
  "gentle",
  "humorous",
];

export const PERSONAL_VOICE_STYLE_KEY: Record<PersonalVoiceStyle, string> = {
  natural: "mv_style_natural",
  warm: "mv_style_warm",
  joyful: "mv_style_joyful",
  ceremonial: "mv_style_ceremonial",
  calm: "mv_style_calm",
  energetic: "mv_style_energetic",
  gentle: "mv_style_gentle",
  humorous: "mv_style_humorous",
};

export function personalVoiceStyleOf(value: string | null | undefined): PersonalVoiceStyle {
  return PERSONAL_VOICE_STYLES.includes(value as PersonalVoiceStyle)
    ? (value as PersonalVoiceStyle)
    : "natural";
}

/** A clear name is always required, so nobody ever sees a file name. */
export function isValidVoiceName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 60;
}

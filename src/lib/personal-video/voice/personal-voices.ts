// Client-safe description of "My Voices": the personal voice library of one
// person. A voice is either kept permanently in the dashboard library or only
// inside the project it was recorded for.

/** Where a saved voice lives. */
export type PersonalVoiceScope = "library" | "project";

/** How far Project Joy has come with preparing one personal voice. */
export type PersonalVoiceStatus = "pending" | "processing" | "ready" | "failed";

/** Everything Project Joy keeps about one personal voice. */
export interface PersonalVoice {
  id: string;
  displayName: string;
  scope: PersonalVoiceScope;
  projectId: string | null;
  language: string;
  durationSeconds: number;
  sourceUrl: string | null;
  processedUrl: string | null;
  /** The voice profile of the connected studio, once one exists. */
  providerVoiceId: string | null;
  processingStatus: PersonalVoiceStatus;
  processingError: string | null;
  consentConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The recording that is actually used when the greeting is created. */
export function personalVoiceAudio(voice: PersonalVoice): string | null {
  return voice.processedUrl ?? voice.sourceUrl;
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
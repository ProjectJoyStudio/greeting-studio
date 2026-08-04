// Client-safe description of the Project Joy voice library. Voices are
// imported from the connected voice studio and stored inside Project Joy,
// together with one permanently saved preview recording per language.

import { LANGS, type Lang } from "@/lib/i18n/types";

/** Every language a preview is prepared for. */
export const PREVIEW_LANGUAGES: Lang[] = LANGS.map((l) => l.code);

export const VOICE_PREVIEW_BUCKET = "voice-previews";

export interface VoicePreview {
  language: string;
  audioUrl: string | null;
  durationSeconds: number;
  characterCount: number;
  generatedAt: string;
}

export interface LibraryVoice {
  id: string;
  provider: string;
  externalVoiceId: string;
  name: string;
  displayName: string;
  description: string;
  gender: string;
  language: string;
  category: string;
  modelCompatibility: string[];
  isActive: boolean;
  sortOrder: number;
  importedAt: string;
  previews: VoicePreview[];
}

export function voiceLabel(voice: LibraryVoice): string {
  return voice.displayName || voice.name;
}

/** The three groups a person chooses from: female, male or children. */
export type VoiceCategory = "female" | "male" | "children";

export function voiceCategory(voice: LibraryVoice): VoiceCategory {
  const hay = `${voice.gender} ${voice.category} ${voice.description}`.toLowerCase();
  if (hay.includes("child") || hay.includes("kid")) return "children";
  if (voice.gender.toLowerCase().includes("female")) return "female";
  if (voice.gender.toLowerCase().includes("male")) return "male";
  return "female";
}

/** The saved preview for one language, falling back to English then any. */
export function previewFor(voice: LibraryVoice, language: string): VoicePreview | null {
  const code = language.slice(0, 2).toLowerCase();
  return (
    voice.previews.find((p) => p.language === code && p.audioUrl) ??
    voice.previews.find((p) => p.language === "en" && p.audioUrl) ??
    voice.previews.find((p) => p.audioUrl) ??
    null
  );
}
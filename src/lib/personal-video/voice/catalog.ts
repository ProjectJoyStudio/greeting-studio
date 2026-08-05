// Client-safe description of the Project Joy voice library. The application
// never speaks about the studio that produces the sound: a voice is simply a
// named Project Joy voice, and new voice studios can be added later without
// touching any page.

export type VoiceProviderId = "elevenlabs";

export type VoiceGender = "female" | "male";

/** Human-facing name of the voice studio, shown in the test information. */
export const VOICE_PROVIDER_LABELS: Record<string, string> = {
  elevenlabs: "ElevenLabs",
};

export interface PvgVoiceOption {
  /** Stable identifier stored inside the order. */
  id: string;
  provider: VoiceProviderId;
  name: string;
  description: string;
  gender: VoiceGender;
}

/** The voices a person can choose from today. */
export const PVG_VOICES: PvgVoiceOption[] = [
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    provider: "elevenlabs",
    name: "Sarah",
    description: "warm_female",
    gender: "female",
  },
  {
    id: "FGY2WhTYpPnrIDTdsKH5",
    provider: "elevenlabs",
    name: "Laura",
    description: "bright_female",
    gender: "female",
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    provider: "elevenlabs",
    name: "Matilda",
    description: "gentle_female",
    gender: "female",
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    provider: "elevenlabs",
    name: "George",
    description: "warm_male",
    gender: "male",
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    provider: "elevenlabs",
    name: "Daniel",
    description: "calm_male",
    gender: "male",
  },
  {
    id: "N2lVS1w4EtoT3dr4eOWO",
    provider: "elevenlabs",
    name: "Callum",
    description: "deep_male",
    gender: "male",
  },
];

export const PVG_DEFAULT_VOICE_ID = PVG_VOICES[0]!.id;

/** The known voice with this exact id, or nothing — never another voice. */
export function lookupVoice(voiceId: string | null | undefined): PvgVoiceOption | null {
  return PVG_VOICES.find((v) => v.id === voiceId) ?? null;
}

/**
 * The chosen voice. A voice Project Joy does not know is an error: the
 * greeting is never quietly spoken by somebody else.
 */
export function findVoice(voiceId: string | null | undefined): PvgVoiceOption {
  const found = lookupVoice(voiceId);
  if (!found) throw new Error("voice_not_available");
  return found;
}

export interface PvgVoiceover {
  voiceId: string;
  voiceName: string;
  provider: string;
  language: string;
  durationSeconds: number;
  characterCount: number;
  generatedAt: string;
  /** The exact model this recording was spoken with, kept forever. */
  modelId?: string;
  modelLabel?: string;
  creditsUsed?: number;
  audioUrl: string | null;
  /** The exact greeting the audio was spoken from, used to spot outdated audio. */
  greetingText: string;
  /** How the greeting was spoken: one voice, separate parts or all together. */
  speechMode?: string;
  syncMode?: string | null;
  /** Plain description of every track the finished recording was made from. */
  trackSummary?: { label: string; durationSeconds: number; source: string }[];
}

/** Short sample sentences used by the voice preview, never stored in an order. */
export const PVG_VOICE_SAMPLES: Record<string, string> = {
  en: "Hello! This is how your greeting will sound — warm, clear and truly personal.",
  ru: "Здравствуйте! Так будет звучать ваше поздравление — тепло, ясно и по-настоящему лично.",
  de: "Hallo! So wird Ihr Gruß klingen — warm, klar und wirklich persönlich.",
  uk: "Вітаємо! Саме так звучатиме ваше привітання — тепло, ясно й по-справжньому особисто.",
  fr: "Bonjour ! Voici comment votre message sonnera — chaleureux, clair et vraiment personnel.",
  pl: "Dzień dobry! Tak zabrzmią Twoje życzenia — ciepło, wyraźnie i naprawdę osobiście.",
};

export function voiceSample(language: string): string {
  return PVG_VOICE_SAMPLES[language.slice(0, 2).toLowerCase()] ?? PVG_VOICE_SAMPLES["en"]!;
}

/** Longest greeting one request may carry, so a request never fails on size. */
export const PVG_VOICE_MAX_CHARS = 4500;

// Client-safe description of the Project Joy voice library. The application
// never speaks about the studio that produces the sound: a voice is simply a
// named Project Joy voice, and new voice studios can be added later without
// touching any page.

export type VoiceProviderId = "elevenlabs";

export interface PvgVoiceOption {
  /** Stable identifier stored inside the order. */
  id: string;
  provider: VoiceProviderId;
  name: string;
  description: string;
}

/** The voices a person can choose from today. */
export const PVG_VOICES: PvgVoiceOption[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", provider: "elevenlabs", name: "Sarah", description: "warm_female" },
  { id: "FGY2WhTYpPnrIDTdsKH5", provider: "elevenlabs", name: "Laura", description: "bright_female" },
  { id: "XrExE9yKIg1WjnnlVkGX", provider: "elevenlabs", name: "Matilda", description: "gentle_female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", provider: "elevenlabs", name: "George", description: "warm_male" },
  { id: "onwK4e9ZLuTAKqWW03F9", provider: "elevenlabs", name: "Daniel", description: "calm_male" },
  { id: "N2lVS1w4EtoT3dr4eOWO", provider: "elevenlabs", name: "Callum", description: "deep_male" },
];

export const PVG_DEFAULT_VOICE_ID = PVG_VOICES[0]!.id;

export function findVoice(voiceId: string | null | undefined): PvgVoiceOption {
  return PVG_VOICES.find((v) => v.id === voiceId) ?? PVG_VOICES[0]!;
}

export interface PvgVoiceover {
  voiceId: string;
  voiceName: string;
  provider: string;
  language: string;
  durationSeconds: number;
  characterCount: number;
  generatedAt: string;
  audioUrl: string | null;
}

/** Longest greeting one request may carry, so a request never fails on size. */
export const PVG_VOICE_MAX_CHARS = 4500;
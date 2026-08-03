// Client-safe description of the voice studios and models the platform can
// use. Adding a new studio later only means adding a line here plus a server
// engine — no page needs to change.

export type VoiceModelStatus = "production" | "testing" | "disabled";

export interface VoiceProviderInfo {
  id: string;
  label: string;
  /** A provider is available once its engine is implemented on the server. */
  available: boolean;
}

export const VOICE_PROVIDERS: VoiceProviderInfo[] = [
  { id: "elevenlabs", label: "ElevenLabs", available: true },
  { id: "openai", label: "OpenAI", available: false },
  { id: "google", label: "Google", available: false },
  { id: "azure", label: "Azure", available: false },
  { id: "cartesia", label: "Cartesia", available: false },
  { id: "minimax", label: "MiniMax", available: false },
];

export function providerLabel(id: string): string {
  return VOICE_PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

export interface VoiceModelRow {
  id: string;
  provider: string;
  model_key: string;
  label: string;
  description: string | null;
  status: VoiceModelStatus;
  sort_order: number;
}

export interface VoiceTestRow {
  id: string;
  provider: string;
  model_key: string;
  model_label: string | null;
  voice_id: string;
  voice_name: string | null;
  language: string;
  text_content: string;
  character_count: number;
  duration_seconds: number;
  generation_ms: number;
  storage_bucket: string | null;
  storage_path: string | null;
  status: "success" | "error";
  error_message: string | null;
  notes: string | null;
  rating: number | null;
  is_favorite: boolean;
  credits_used?: number | null;
  created_at: string;
}

export interface VoiceModelStat {
  provider: string;
  model_key: string;
  total: number;
  succeeded: number;
  failed: number;
  avg_generation_ms: number | null;
  total_characters: number;
  avg_duration_seconds: number | null;
  avg_characters?: number | null;
  avg_credits?: number | null;
  total_credits?: number | null;
  avg_cost_usd?: number | null;
}

/** Testing audio lives apart from every customer recording. */
export const VOICE_TEST_BUCKET = "voice-samples";
export const VOICE_TEST_PREFIX = "admin-model-tests";
/** Test recordings are cleaned up automatically after this many days. */
export const VOICE_TEST_RETENTION_DAYS = 7;
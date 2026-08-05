// Client-safe reading of a voice failure. The application never names the
// studio behind the sound: every failure becomes one calm Project Joy message.

export type VoiceFailure =
  | "voice_quota_exhausted"
  | "voice_key_invalid"
  | "voice_not_found"
  | "voice_unavailable"
  | "voice_failed";

/** Turns any raw failure into the Project Joy reason behind it. */
export function voiceFailureOf(error: unknown): VoiceFailure {
  const raw = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (!raw) return "voice_failed";
  if (raw.includes("quota") || raw.includes("credits remaining")) return "voice_quota_exhausted";
  if (raw.includes("voice_key_invalid") || raw.includes("missing the permission"))
    return "voice_key_invalid";
  if (
    raw.includes("voice_not_found") ||
    raw.includes("voice_does_not_exist") ||
    raw.includes("voice_not_available")
  )
    return "voice_not_found";
  if (raw.includes("voice_service_unavailable") || raw.includes("voice_empty_response"))
    return "voice_unavailable";
  return "voice_failed";
}

const KEYS: Record<VoiceFailure, string> = {
  voice_quota_exhausted: "pvv_err_quota",
  voice_key_invalid: "pvv_err_key",
  voice_not_found: "pvv_err_voice",
  voice_unavailable: "pvv_err_unavailable",
  voice_failed: "pvv_failed",
};

/** The translation key that explains a voice failure to the person. */
export function voiceFailureKey(error: unknown): string {
  return KEYS[voiceFailureOf(error)];
}

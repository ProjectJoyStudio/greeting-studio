// Server-only voice engines. Every engine keeps the same shape, so another
// voice studio can be registered here later and the pages stay unchanged.

import { PVG_VOICE_MAX_CHARS } from "./catalog";

export interface SynthesisRequest {
  text: string;
  voiceId: string;
  /** Two-letter language of the greeting, used only for logging today. */
  language: string;
  /** Voice model chosen by the administrator; each engine has its own default. */
  modelId?: string;
}

export interface SynthesisResult {
  audio: Uint8Array;
  mimeType: string;
  extension: string;
  durationSeconds: number;
  modelId: string;
  /** Voice credits the studio reported for this request, when it reports them. */
  creditsUsed: number | null;
}

export interface VoiceEngine {
  id: string;
  isReady(): boolean;
  synthesize(request: SynthesisRequest): Promise<SynthesisResult>;
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

const elevenLabs: VoiceEngine = {
  id: "elevenlabs",
  isReady: () => Boolean(process.env["ELEVENLABS_API_KEY"]),
  async synthesize({ text, voiceId, modelId }) {
    const apiKey = process.env["ELEVENLABS_API_KEY"];
    if (!apiKey) throw new Error("voice_service_unavailable");
    const model = modelId || "eleven_multilingual_v2";

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, PVG_VOICE_MAX_CHARS),
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`voice_request_failed:${res.status}:${detail.slice(0, 300)}`);
    }

    const reported = Number(
      res.headers.get("character-cost") ?? res.headers.get("x-character-cost") ?? "",
    );

    const json = (await res.json()) as {
      audio_base64?: string;
      alignment?: { character_end_times_seconds?: number[] } | null;
    };
    if (!json.audio_base64) throw new Error("voice_empty_response");

    const ends = json.alignment?.character_end_times_seconds ?? [];
    const durationSeconds = ends.length > 0 ? Number(ends[ends.length - 1]) : 0;

    return {
      audio: decodeBase64(json.audio_base64),
      mimeType: "audio/mpeg",
      extension: "mp3",
      durationSeconds: Math.round(durationSeconds * 100) / 100,
      modelId: model,
      creditsUsed: Number.isFinite(reported) && reported > 0 ? reported : null,
    };
  },
};

const ENGINES: Record<string, VoiceEngine> = { [elevenLabs.id]: elevenLabs };

export const DEFAULT_VOICE_PROVIDER = elevenLabs.id;

export function getVoiceEngine(provider: string = DEFAULT_VOICE_PROVIDER): VoiceEngine {
  const engine = ENGINES[provider] ?? ENGINES[DEFAULT_VOICE_PROVIDER];
  if (!engine) throw new Error("voice_service_unavailable");
  return engine;
}

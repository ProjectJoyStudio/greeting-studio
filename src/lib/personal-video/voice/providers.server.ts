// Server-only voice engines. Every engine keeps the same shape, so another
// voice studio can be registered here later and the pages stay unchanged.

import { PVG_VOICE_MAX_CHARS } from "./catalog";
import type { PersonalVoiceStyle } from "./personal-voices";

export interface SynthesisRequest {
  text: string;
  voiceId: string;
  /** Two-letter language of the greeting, used only for logging today. */
  language: string;
  /** Voice model chosen by the administrator; each engine has its own default. */
  modelId?: string;
  /** Speaking pace, 1 = natural. Used to fit a greeting into the video. */
  speed?: number;
  /** How the greeting is delivered; only meaningful for cloned personal voices. */
  style?: string;
  /**
   * Authorized recording of the chosen voice, with its transcript. Studios that
   * reproduce a voice from a recording need it; the others ignore it.
   */
  reference?: { audio: string; text: string } | null;
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

/** One enrollment recording sent to the studio to clone a voice profile. */
export interface VoiceCloneSample {
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
}

export interface VoiceEngine {
  id: string;
  isReady(): boolean;
  synthesize(request: SynthesisRequest): Promise<SynthesisResult>;
  /** Clones a reusable voice profile from one or two short samples. */
  cloneVoice?(args: {
    name: string;
    description?: string;
    language?: string;
    samples: VoiceCloneSample[];
  }): Promise<{ providerVoiceId: string }>;
  /** Removes a cloned voice profile from the studio for good. */
  deleteClonedVoice?(providerVoiceId: string): Promise<void>;
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

/**
 * Turns a speaking style into the stability/expressiveness values ElevenLabs
 * uses. Lower stability and higher style read as more expressive delivery.
 */
function voiceSettingsForStyle(style: string | undefined): { stability: number; style: number } {
  const known: Record<PersonalVoiceStyle, { stability: number; style: number }> = {
    natural: { stability: 0.5, style: 0.35 },
    warm: { stability: 0.55, style: 0.4 },
    calm: { stability: 0.7, style: 0.2 },
    ceremonial: { stability: 0.65, style: 0.3 },
    joyful: { stability: 0.35, style: 0.6 },
    energetic: { stability: 0.3, style: 0.7 },
    gentle: { stability: 0.65, style: 0.25 },
    humorous: { stability: 0.35, style: 0.55 },
  };
  return known[style as PersonalVoiceStyle] ?? known.natural;
}

const elevenLabs: VoiceEngine = {
  id: "elevenlabs",
  isReady: () => Boolean(process.env["ELEVENLABS_API_KEY"]),
  async synthesize({ text, voiceId, modelId, speed, style }) {
    const apiKey = process.env["ELEVENLABS_API_KEY"];
    if (!apiKey) throw new Error("voice_service_unavailable");
    const model = modelId || "eleven_multilingual_v2";
    const pace = Number(speed);
    const { stability, style: styleValue } = voiceSettingsForStyle(style);
    const settings: Record<string, unknown> = {
      stability,
      similarity_boost: 0.75,
      style: styleValue,
      use_speaker_boost: true,
    };
    if (Number.isFinite(pace) && pace > 1.001) settings["speed"] = Math.min(1.2, pace);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, PVG_VOICE_MAX_CHARS),
          model_id: model,
          voice_settings: settings,
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const body = detail.toLowerCase();
      // The reason is named plainly, so every page can explain what happened.
      if (body.includes("quota") || body.includes("credits remaining")) {
        throw new Error(`voice_quota_exhausted:${detail.slice(0, 300)}`);
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error(`voice_key_invalid:${detail.slice(0, 300)}`);
      }
      if (res.status === 404 || body.includes("voice_does_not_exist")) {
        throw new Error(`voice_not_found:${detail.slice(0, 300)}`);
      }
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
  async cloneVoice({ name, description, samples }) {
    const apiKey = process.env["ELEVENLABS_API_KEY"];
    if (!apiKey) throw new Error("voice_service_unavailable");
    if (samples.length === 0) throw new Error("voice_clone_samples_required");

    const form = new FormData();
    form.set("name", name);
    if (description) form.set("description", description);
    samples.forEach((sample, index) => {
      form.append(
        "files",
        new Blob([sample.bytes.slice().buffer], { type: sample.mimeType }),
        sample.filename || `sample-${index}.webm`,
      );
    });

    const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const body = detail.toLowerCase();
      if (body.includes("quota") || body.includes("credits remaining")) {
        throw new Error(`voice_quota_exhausted:${detail.slice(0, 300)}`);
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("voice_key_invalid");
      }
      throw new Error(`voice_clone_failed:${res.status}:${detail.slice(0, 300)}`);
    }

    const json = (await res.json()) as { voice_id?: string };
    if (!json.voice_id) throw new Error("voice_clone_failed:200:missing_voice_id");
    return { providerVoiceId: json.voice_id };
  },
  async deleteClonedVoice(providerVoiceId) {
    const apiKey = process.env["ELEVENLABS_API_KEY"];
    if (!apiKey) return;
    await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(providerVoiceId)}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey },
    }).catch(() => undefined);
  },
};

/**
 * Fish Audio reproduces a voice from an authorized reference recording, so the
 * chosen voice is really the voice that is heard. Without a recording Project
 * Joy stops instead of speaking with somebody else's voice.
 */
const runwareFishTts: VoiceEngine = {
  id: "rw_fish_s21_pro",
  isReady: () => Boolean(process.env["RUNWARE_API_KEY"]),
  async synthesize({ text, speed, reference }) {
    if (!reference?.audio || !reference.text) throw new Error("voice_reference_unavailable");
    const { runwareSynthesizeSpeech } = await import("@/lib/runware/runware.server");
    const { mp3DurationSeconds } = await import("./mp3-duration");
    const result = await runwareSynthesizeSpeech({
      generatorKey: "rw_fish_s21_pro",
      text: text.slice(0, PVG_VOICE_MAX_CHARS),
      speed,
      referenceVoice: { audio: reference.audio, text: reference.text },
    });
    const { RUNWARE_SPEECH_MODELS } = await import("@/lib/runware/catalog");
    return {
      audio: result.audio,
      mimeType: result.mimeType,
      extension: result.extension,
      durationSeconds: mp3DurationSeconds(result.audio),
      modelId: RUNWARE_SPEECH_MODELS["rw_fish_s21_pro"]?.air ?? "rw_fish_s21_pro",
      creditsUsed: null,
    };
  },
};

const ENGINES: Record<string, VoiceEngine> = {
  [elevenLabs.id]: elevenLabs,
  [runwareFishTts.id]: runwareFishTts,
};

export const DEFAULT_VOICE_PROVIDER = elevenLabs.id;

export function getVoiceEngine(provider: string = DEFAULT_VOICE_PROVIDER): VoiceEngine {
  const engine = ENGINES[provider] ?? ENGINES[DEFAULT_VOICE_PROVIDER];
  if (!engine) throw new Error("voice_service_unavailable");
  return engine;
}


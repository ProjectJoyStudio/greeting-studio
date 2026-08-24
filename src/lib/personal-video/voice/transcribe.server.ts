// Server-only helper that listens to a short enrollment sample and writes down
// what was said. It is used for one purpose: to be sure the person really read
// the whole prepared sentence.

import { generatorOrder, withGeneratorSlot } from "@/lib/admin/generators/runtime.server";
import { findGenerator } from "@/lib/admin/generators/registry";

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";

const CANDIDATES = [
  "gpt_4o_transcribe",
  "replicate_gpt_4o_transcribe",
  "rw_gemini_3_flash_stt",
];

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
};

function bytesOf(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

interface Sample {
  base64: string;
  mimeType: string;
  language?: string | null;
}

async function viaLovable(model: string, input: Sample): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("No listening credential configured.");

  const type = (input.mimeType || "audio/webm").split(";")[0]!.toLowerCase();
  const extension = EXTENSIONS[type] ?? "webm";
  const form = new FormData();
  form.append("model", model);
  form.append("file", new Blob([bytesOf(input.base64)], { type }), `sample.${extension}`);
  if (input.language && /^[a-z]{2}$/.test(input.language)) {
    form.append("language", input.language);
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(
      `Sample transcription failed [${response.status}]: ${(await response.text()).slice(0, 300)}`,
    );
  }
  const data = (await response.json()) as { text?: string };
  return typeof data.text === "string" ? data.text : null;
}

/** Same interface, served by Replicate. The token stays on the server. */
async function viaReplicate(model: string, input: Sample): Promise<string | null> {
  const { runReplicate, joinOutput } = await import("@/lib/replicate/run.server");
  const type = (input.mimeType || "audio/webm").split(";")[0]!.toLowerCase();
  const payload: Record<string, unknown> = {
    audio_file: `data:${type};base64,${input.base64}`,
    temperature: 0,
  };
  if (input.language && /^[a-z]{2}$/.test(input.language)) payload["language"] = input.language;
  const text = joinOutput(await runReplicate(model, payload)).trim();
  return text || null;
}

/** The words heard in a short sample, or null when listening was not possible. */
export async function transcribeSample(input: Sample): Promise<string | null> {
  const order = await generatorOrder("personal_video.transcription", CANDIDATES);
  for (const key of order) {
    const generator = findGenerator(key);
    if (!generator) continue;
    try {
      return await withGeneratorSlot(key, () =>
        generator.provider === "Replicate"
          ? viaReplicate(generator.model, input)
          : viaLovable(generator.model, input),
      );
    } catch (err) {
      console.error(`Listening engine "${key}" failed:`, err);
    }
  }
  return null;
}

// Server-only helper that listens to a short enrollment sample and writes down
// what was said. It is used for one purpose: to be sure the person really read
// the whole prepared sentence.

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";

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

function bytesOf(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The words heard in a short sample, or null when listening was not possible. */
export async function transcribeSample(input: {
  base64: string;
  mimeType: string;
  language?: string | null;
}): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;

  const type = (input.mimeType || "audio/webm").split(";")[0]!.toLowerCase();
  const extension = EXTENSIONS[type] ?? "webm";
  const form = new FormData();
  form.append("model", "openai/gpt-4o-transcribe");
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
    console.error(`Sample transcription failed [${response.status}]:`, await response.text());
    return null;
  }
  const data = (await response.json()) as { text?: string };
  return typeof data.text === "string" ? data.text : null;
}

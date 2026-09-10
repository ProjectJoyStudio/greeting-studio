// Server-only music creation for the Memory Book.
//
// Uses the existing Project Joy ElevenLabs account. Nothing else of the voice
// integration is touched here: this module only asks Eleven Music v2 for one
// finished composition and hands the bytes back.

import { MEMORY_BOOK_MUSIC_MS } from "./music";

export interface CreatedMusic {
  bytes: Uint8Array;
  contentType: string;
  fileExtension: string;
  durationSeconds: number;
}

/** Eleven Music v2. */
const MUSIC_MODEL_ID = "music_v2";

/**
 * Creates ONE two-minute composition from a free description written in any of
 * the six supported languages. A technical problem always throws, so the
 * caller can give the attempt or the credits back.
 */
export async function createMusicComposition(prompt: string): Promise<CreatedMusic> {
  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) throw new Error("music_service_unavailable");

  const res = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      prompt: prompt.trim().slice(0, 1500),
      music_length_ms: MEMORY_BOOK_MUSIC_MS,
      model_id: MUSIC_MODEL_ID,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`music_request_failed:${res.status}:${detail.slice(0, 300)}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  // Anything suspiciously small is not a usable two-minute composition.
  if (bytes.byteLength < 20_000) throw new Error("music_empty_result");

  const contentType = res.headers.get("content-type") ?? "audio/mpeg";
  const fileExtension = contentType.includes("wav") ? "wav" : "mp3";
  return {
    bytes,
    contentType: contentType.includes("wav") ? "audio/wav" : "audio/mpeg",
    fileExtension,
    durationSeconds: MEMORY_BOOK_MUSIC_MS / 1000,
  };
}

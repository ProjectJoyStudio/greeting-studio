// ---------------------------------------------------------------------------
// The quiet tail of a greeting.
//
// The length a person chooses with the slider is the length of the finished
// film. The greeting itself is never stretched, slowed, repeated or padded
// from the inside: it stays exactly as it was spoken. Only silence is added
// AFTER the last word, so the engine — which always makes a film as long as
// the sound it receives — keeps the scene alive until the chosen second.
// ---------------------------------------------------------------------------

/** One frame of digital silence: MPEG-1 Layer III, 44.1 kHz, 128 kbit/s. */
const MP3_SILENT_FRAME = new Uint8Array([0xff, 0xfb, 0x90, 0x64, ...new Array(413).fill(0)]);
const MP3_FRAME_SECONDS = 1152 / 44100;

export interface PaddedAudio {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  durationSeconds: number;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.byteLength;
  }
  return out;
}

function padMp3(bytes: Uint8Array, extraSeconds: number): PaddedAudio | null {
  const frames = Math.round(extraSeconds / MP3_FRAME_SECONDS);
  if (frames <= 0) return null;
  const tail = new Uint8Array(frames * MP3_SILENT_FRAME.byteLength);
  for (let i = 0; i < frames; i += 1) tail.set(MP3_SILENT_FRAME, i * MP3_SILENT_FRAME.byteLength);
  return {
    bytes: concat([bytes, tail]),
    mimeType: "audio/mpeg",
    extension: "mp3",
    durationSeconds: 0,
  };
}

/** Adds silent samples to the end of a RIFF/WAVE file. */
function padWav(bytes: Uint8Array, extraSeconds: number): PaddedAudio | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF") return null;
  let offset = 12;
  let fmtAt = -1;
  let dataAt = -1;
  let dataSize = 0;
  while (offset + 8 <= bytes.byteLength) {
    const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") fmtAt = offset + 8;
    if (id === "data") {
      dataAt = offset + 8;
      dataSize = Math.min(size, bytes.byteLength - dataAt);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (fmtAt < 0 || dataAt < 0) return null;
  const channels = view.getUint16(fmtAt + 2, true);
  const sampleRate = view.getUint32(fmtAt + 4, true);
  const bits = view.getUint16(fmtAt + 14, true) || 16;
  const bytesPerFrame = Math.max(1, (channels || 1) * (bits / 8));
  const extraBytes = Math.round(extraSeconds * sampleRate) * bytesPerFrame;
  if (extraBytes <= 0) return null;

  const head = bytes.subarray(0, dataAt);
  const body = bytes.subarray(dataAt, dataAt + dataSize);
  const tail = new Uint8Array(extraBytes); // 16-bit PCM silence is all zeroes
  const out = concat([head, body, tail]);
  const outView = new DataView(out.buffer);
  outView.setUint32(4, out.byteLength - 8, true);
  outView.setUint32(dataAt - 4, dataSize + extraBytes, true);
  return { bytes: out, mimeType: "audio/wav", extension: "wav", durationSeconds: 0 };
}

/**
 * The greeting followed by silence, so the sound handed to the engine lasts
 * exactly as long as the film the customer ordered. Returns null when nothing
 * has to be added, or when the file cannot be extended safely.
 */
export async function padAudioToDuration(
  audioUrl: string,
  spokenSeconds: number,
  targetSeconds: number,
): Promise<PaddedAudio | null> {
  const extra = Math.round((targetSeconds - spokenSeconds) * 100) / 100;
  if (!(extra > 0.25)) return null;
  const res = await fetch(audioUrl);
  if (!res.ok) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  const looksWav = type.includes("wav") || String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF";
  const padded = looksWav ? padWav(bytes, extra) : padMp3(bytes, extra);
  if (!padded) return null;
  return { ...padded, durationSeconds: Math.round(targetSeconds * 100) / 100 };
}

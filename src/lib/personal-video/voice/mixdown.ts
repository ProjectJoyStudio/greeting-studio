// Browser-only sound workshop of Project Joy. Several spoken tracks become one
// calm, even recording: their loudness is levelled, their timing is arranged
// and the result is written as a single audio file. A person never adjusts
// volume, timing or synchronisation themselves.

import {
  PVG_CHORUS_DELAY_SECONDS,
  PVG_MIN_PART_GAP_SECONDS,
  PVG_PART_GAP_SECONDS,
  type PvgSyncMode,
} from "./speech";

const SAMPLE_RATE = 44100;
/** Comfortable loudness of the finished recording. */
const TARGET_PEAK = 0.92;
const TARGET_RMS = 0.12;

export interface MixSource {
  /** Ready sound, either a link Project Joy stored or freshly spoken audio. */
  url?: string | null;
  base64?: string | null;
  mimeType?: string | null;
}

export interface MixResult {
  base64: string;
  mimeType: "audio/wav";
  durationSeconds: number;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function bytesOf(source: MixSource): Promise<ArrayBuffer> {
  if (source.base64) {
    const bytes = base64ToBytes(source.base64);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
  if (!source.url) throw new Error("track_missing");
  const res = await fetch(source.url);
  if (!res.ok) throw new Error("track_unreadable");
  return res.arrayBuffer();
}

/** Reads one sound of any common format into plain samples. */
async function decode(source: MixSource): Promise<AudioBuffer> {
  const Ctor: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  try {
    return await ctx.decodeAudioData(await bytesOf(source));
  } finally {
    void ctx.close();
  }
}

/** One channel of samples with an even, comfortable loudness. */
function levelled(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const out = new Float32Array(length);
  const channels = buffer.numberOfChannels;
  for (let c = 0; c < channels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) out[i] = (out[i] ?? 0) + data[i]! / channels;
  }
  let sum = 0;
  for (let i = 0; i < length; i += 1) sum += out[i]! * out[i]!;
  const rms = Math.sqrt(sum / Math.max(1, length));
  const gain = rms > 0.0001 ? Math.min(4, TARGET_RMS / rms) : 1;
  for (let i = 0; i < length; i += 1) out[i] = out[i]! * gain;
  return out;
}

function resample(samples: Float32Array, from: number): Float32Array {
  if (from === SAMPLE_RATE) return samples;
  const ratio = SAMPLE_RATE / from;
  const length = Math.round(samples.length * ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i / ratio;
    const left = Math.floor(position);
    const right = Math.min(samples.length - 1, left + 1);
    const weight = position - left;
    out[i] = samples[left]! * (1 - weight) + samples[right]! * weight;
  }
  return out;
}

function encodeWav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, Math.round(value * 32767), true);
  }
  return bytes;
}

export interface MixOptions {
  /** Longest the finished recording may ever be, in seconds. 0 = no limit. */
  maxSeconds?: number;
}

/**
 * Puts the spoken parts of the participants one after the other, with a short,
 * natural pause between them. When a longest length is given, the pauses are
 * tightened and, if that is still not enough, the speech is gently quickened
 * until the recording fits inside the time available.
 */
export async function mergeInOrder(
  sources: MixSource[],
  options: MixOptions = {},
): Promise<MixResult> {
  const tracks = await Promise.all(sources.map(prepare));
  const limit = options.maxSeconds && options.maxSeconds > 0 ? options.maxSeconds : 0;
  const spoken = tracks.reduce((sum, t) => sum + t.length, 0);

  let gapSeconds = PVG_PART_GAP_SECONDS;
  if (limit && tracks.length > 1) {
    const room = limit * SAMPLE_RATE - spoken;
    const perGap = room / (tracks.length - 1) / SAMPLE_RATE;
    gapSeconds = Math.max(PVG_MIN_PART_GAP_SECONDS, Math.min(PVG_PART_GAP_SECONDS, perGap));
  }

  const gap = Math.round(gapSeconds * SAMPLE_RATE);
  const total = tracks.reduce((sum, t) => sum + t.length + gap, 0) - gap;
  let out = new Float32Array(Math.max(1, total));
  let offset = 0;
  for (const track of tracks) {
    out.set(track, offset);
    offset += track.length + gap;
  }
  if (limit) out = fitWithin(out, limit);
  return finish(out);
}

/**
 * Lets every chosen voice speak the whole greeting together. The tracks are
 * levelled, arranged in time and blended into one recording.
 */
export async function mergeTogether(
  sources: MixSource[],
  sync: PvgSyncMode,
  options: MixOptions = {},
): Promise<MixResult> {
  const tracks = await Promise.all(sources.map(prepare));
  const step = sync === "delayed" ? Math.round(PVG_CHORUS_DELAY_SECONDS * SAMPLE_RATE) : 0;
  const total = Math.max(...tracks.map((t, i) => t.length + i * step), 1);
  let out = new Float32Array(total);
  const share = 1 / Math.sqrt(Math.max(1, tracks.length));
  tracks.forEach((track, index) => {
    const start = index * step;
    for (let i = 0; i < track.length; i += 1) {
      const at = start + i;
      out[at] = (out[at] ?? 0) + track[i]! * share;
    }
  });
  const limit = options.maxSeconds && options.maxSeconds > 0 ? options.maxSeconds : 0;
  if (limit) out = fitWithin(out, limit);
  return finish(out);
}

/**
 * The last, dependable step: a recording that is still a little too long is
 * quickened just enough to end inside the time the video allows.
 */
function fitWithin(
  samples: Float32Array<ArrayBuffer>,
  maxSeconds: number,
): Float32Array<ArrayBuffer> {
  const allowed = Math.floor(maxSeconds * SAMPLE_RATE);
  if (allowed <= 0 || samples.length <= allowed) return samples;
  const out = new Float32Array(allowed);
  const ratio = samples.length / allowed;
  for (let i = 0; i < allowed; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(samples.length - 1, left + 1);
    const weight = position - left;
    out[i] = samples[left]! * (1 - weight) + samples[right]! * weight;
  }
  return out;
}

async function prepare(source: MixSource): Promise<Float32Array> {
  const buffer = await decode(source);
  return resample(levelled(buffer), buffer.sampleRate);
}

function finish(samples: Float32Array): MixResult {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]!));
  if (peak > 0.0001) {
    const gain = TARGET_PEAK / peak;
    if (gain < 1 || peak < TARGET_PEAK * 0.6) {
      for (let i = 0; i < samples.length; i += 1) samples[i] = samples[i]! * gain;
    }
  }
  // A soft opening and ending, so no merge ever starts or stops abruptly.
  const fade = Math.min(Math.round(0.02 * SAMPLE_RATE), Math.floor(samples.length / 2));
  for (let i = 0; i < fade; i += 1) {
    const factor = i / fade;
    samples[i] = samples[i]! * factor;
    samples[samples.length - 1 - i] = samples[samples.length - 1 - i]! * factor;
  }
  return {
    base64: bytesToBase64(encodeWav(samples)),
    mimeType: "audio/wav",
    durationSeconds: Math.round((samples.length / SAMPLE_RATE) * 100) / 100,
  };
}

/** Reads a file a person brings from their device into a stored recording. */
export async function fileToBase64(file: Blob): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  return bytesToBase64(buffer);
}

/** How long a recording lasts, without changing anything about it. */
export async function audioDuration(source: MixSource): Promise<number> {
  try {
    const buffer = await decode(source);
    return Math.round(buffer.duration * 100) / 100;
  } catch {
    return 0;
  }
}

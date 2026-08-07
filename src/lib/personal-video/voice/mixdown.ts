// Browser-only sound workshop of Project Joy. Several spoken tracks become one
// calm, even recording: their loudness is levelled, their timing is arranged
// and the result is written as a single audio file. A person never adjusts
// volume, timing or synchronisation themselves.

import {
  PVG_MIN_PART_GAP_SECONDS,
  PVG_PART_GAP_SECONDS,
  PVG_MAX_SPEECH_SPEED,
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
  /** True when the recording is still longer than the time allowed. */
  overflow?: boolean;
  /**
   * Set when one chosen voice cannot be brought in step with the others while
   * it still sounds natural. The number is the place of that voice in the list.
   */
  unsyncable?: number;
  /** Plain numbers describing why that one voice could not be brought in step. */
  unsyncableDetail?: {
    /** Natural length of that voice, in seconds. */
    spokenSeconds: number;
    /** Length all the other voices agreed on, in seconds. */
    targetSeconds: number;
    /** How much that voice would have to be hurried or held back. */
    factor: number;
  };
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
  /**
   * Whether a recording that is still too long may be quickened as a last
   * step. Turned off where the words of a person must never be altered.
   */
  compress?: boolean;
  /** Fixed pause between two parts, in seconds. */
  gapSeconds?: number;
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

  let gapSeconds = options.gapSeconds ?? PVG_PART_GAP_SECONDS;
  if (options.gapSeconds === undefined && limit && tracks.length > 1) {
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
  const tooLong = Boolean(limit) && out.length > Math.floor(limit * SAMPLE_RATE);
  if (limit && options.compress !== false) out = fitWithin(out, limit);
  const result = finish(out);
  return options.compress === false ? { ...result, overflow: tooLong } : result;
}

/** The most a voice may be quickened or calmed and still sound like itself. */
const SYNC_MAX_SPEED = PVG_MAX_SPEECH_SPEED;
const SYNC_MIN_SPEED = 1 / PVG_MAX_SPEECH_SPEED;

/**
 * Lets every chosen voice speak the whole greeting together, truly together:
 * every recording is levelled, its quiet edges removed, and then brought word
 * by word into step with the others, so the voices begin, speak and end as
 * one. Nobody's voice is ever exchanged for another and no word is ever
 * removed — only the pace of speaking is gently adjusted.
 */
export async function blendTogether(
  sources: MixSource[],
  options: MixOptions = {},
): Promise<MixResult> {
  const tracks = await Promise.all(sources.map(prepare));
  if (tracks.length === 0) return finish(new Float32Array(1));
  if (tracks.length === 1) return withinLimit(tracks[0]!, options);

  // Voices that are already the very same recording — the same voice chosen for
  // several participants — never need to be brought in step with themselves.
  const shapes = tracks.map(speechShape);
  const commonParts = Math.min(...shapes.map((s) => s.parts.length));
  if (commonParts < 1) {
    // Nothing recognisable as speech: the tracks are simply laid over one
    // another, starting together.
    return withinLimit(overlay(tracks), options);
  }

  // Every recording is described with the same number of spoken pieces, so the
  // words of all voices can be placed side by side.
  const grouped = shapes.map((shape) => regroup(shape.parts, commonParts));

  // The shared shape of the greeting: each spoken piece lasts what the voices
  // naturally agree on, so a slow voice is hurried a little and a quick voice
  // is held back a little, instead of one voice deciding for everybody.
  const pieceLengths: number[] = [];
  for (let p = 0; p < commonParts; p += 1) {
    pieceLengths.push(middleOf(grouped.map((g) => g[p]!.end - g[p]!.start)));
  }
  // Pauses are the first thing that gives way: the shortest natural pause any
  // voice leaves is the one everybody keeps.
  const gapLengths: number[] = [];
  for (let p = 1; p < commonParts; p += 1) {
    const shortest = Math.min(...grouped.map((g) => Math.max(0, g[p]!.start - g[p - 1]!.end)));
    gapLengths.push(Math.min(shortest, Math.round(MAX_INNER_PAUSE * SAMPLE_RATE)));
  }

  let natural =
    pieceLengths.reduce((a, b) => a + b, 0) + gapLengths.reduce((a, b) => a + b, 0);
  natural = Math.max(1, natural);

  // A greeting is never stretched to fill the video: the time available is a
  // limit, never a length that has to be reached.
  const limit = options.maxSeconds && options.maxSeconds > 0 ? options.maxSeconds : 0;
  const allowed = limit ? Math.floor(limit * SAMPLE_RATE) : 0;
  const squeeze = allowed && natural > allowed ? allowed / natural : 1;

  const targets: SpeechPart[] = [];
  let cursor = 0;
  for (let p = 0; p < commonParts; p += 1) {
    const length = Math.max(1, Math.round(pieceLengths[p]! * squeeze));
    targets.push({ start: cursor, end: cursor + length });
    cursor += length + Math.round((gapLengths[p] ?? 0) * squeeze);
  }
  const total = Math.max(1, targets[targets.length - 1]!.end);

  const aligned: Float32Array[] = [];
  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index]!;
    const parts = grouped[index]!;
    const out = new Float32Array(total);
    let worst = 1;
    for (let p = 0; p < commonParts; p += 1) {
      const from = parts[p]!;
      const to = targets[p]!;
      const piece = track.slice(from.start, from.end);
      const room = Math.max(1, to.end - to.start);
      const factor = piece.length / room;
      if (Math.abs(Math.log(factor)) > Math.abs(Math.log(worst))) worst = factor;
      const shaped = timeStretch(piece, room);
      for (let i = 0; i < shaped.length && to.start + i < out.length; i += 1) {
        out[to.start + i] = shaped[i]!;
      }
    }
    // Only a voice that would have to be hurried or held back beyond what still
    // sounds like a person is reported — and only after every gentler step above
    // has already been taken.
    if (worst > SYNC_MAX_SPEED || worst < SYNC_MIN_SPEED) {
      return {
        ...finish(new Float32Array(1)),
        unsyncable: index,
        unsyncableDetail: {
          spokenSeconds: Math.round((track.length / SAMPLE_RATE) * 100) / 100,
          targetSeconds: Math.round((total / SAMPLE_RATE) * 100) / 100,
          factor: Math.round(worst * 100) / 100,
        },
      };
    }
    aligned.push(out);
  }

  return withinLimit(overlay(aligned), options);
}

/** The longest pause Project Joy keeps inside a greeting spoken together. */
const MAX_INNER_PAUSE = 0.35;

/** Several recordings sounding at once, each clearly audible, none clipping. */
function overlay(tracks: Float32Array[]): Float32Array {
  const total = Math.max(...tracks.map((t) => t.length), 1);
  const mix = new Float32Array(total);
  const share = 1 / Math.sqrt(tracks.length);
  for (const track of tracks) {
    for (let i = 0; i < track.length; i += 1) mix[i] = mix[i]! + track[i]! * share;
  }
  return mix;
}

/** The middle value of a set of lengths — never the slowest, never the fastest. */
function middleOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

function speechShape(samples: Float32Array): { parts: SpeechPart[] } {
  const parts = speechSegments(samples);
  return { parts: parts.length ? parts : [{ start: 0, end: samples.length }] };
}

/**
 * Describes one recording with a chosen number of spoken pieces: neighbouring
 * words are joined until every voice can be compared piece by piece.
 */
function regroup(parts: SpeechPart[], count: number): SpeechPart[] {
  if (parts.length <= count) return parts.slice(0, count);
  const out: SpeechPart[] = [];
  const per = parts.length / count;
  for (let i = 0; i < count; i += 1) {
    const from = parts[Math.floor(i * per)]!;
    const last = parts[Math.min(parts.length - 1, Math.floor((i + 1) * per) - 1)]!;
    out.push({ start: from.start, end: Math.max(from.end, last.end) });
  }
  return out;
}

/**
 * The blended greeting is quickened, never cut, if the video leaves less time
 * than the voices need. Beyond the natural limit the greeting simply does not
 * fit and Project Joy says so.
 */
function withinLimit(samples: Float32Array, options: MixOptions): MixResult {
  const limit = options.maxSeconds && options.maxSeconds > 0 ? options.maxSeconds : 0;
  if (!limit) return finish(samples);
  const allowed = Math.floor(limit * SAMPLE_RATE);
  if (samples.length <= allowed) return finish(samples);
  const needed = samples.length / Math.max(1, allowed);
  if (needed > SYNC_MAX_SPEED) return { ...finish(samples), overflow: true };
  return finish(timeStretch(samples, allowed));
}

interface SpeechPart {
  start: number;
  end: number;
}

/**
 * The spoken pieces of one recording: the words, separated by the little
 * silences a person naturally leaves between them.
 */
function speechSegments(samples: Float32Array): SpeechPart[] {
  const win = Math.round(0.02 * SAMPLE_RATE);
  const loud: number[] = [];
  let peak = 0;
  for (let i = 0; i < samples.length; i += win) {
    let sum = 0;
    const end = Math.min(samples.length, i + win);
    for (let j = i; j < end; j += 1) sum += samples[j]! * samples[j]!;
    const rms = Math.sqrt(sum / Math.max(1, end - i));
    loud.push(rms);
    peak = Math.max(peak, rms);
  }
  const threshold = Math.max(0.008, peak * 0.15);
  const gap = Math.round(0.12 * SAMPLE_RATE);
  const shortest = Math.round(0.05 * SAMPLE_RATE);
  const parts: SpeechPart[] = [];
  let open: SpeechPart | null = null;
  loud.forEach((rms, index) => {
    const start = index * win;
    const end = Math.min(samples.length, start + win);
    if (rms >= threshold) {
      if (open && start - open.end <= gap) open.end = end;
      else {
        if (open) parts.push(open);
        open = { start, end };
      }
    }
  });
  if (open) parts.push(open);
  return parts.filter((p) => p.end - p.start >= shortest);
}

/** A Hann window, the gentle shape used when pieces of sound are joined. */
function hann(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i += 1) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  return w;
}

/**
 * Makes one recording last exactly as long as asked, without touching the
 * pitch or the timbre of the voice: small overlapping pieces of sound are
 * laid over one another, each placed where it fits the previous one best.
 */
function timeStretch(input: Float32Array, targetLength: number): Float32Array {
  const target = Math.max(1, Math.round(targetLength));
  if (input.length === 0) return new Float32Array(target);
  const ratio = target / input.length;
  if (Math.abs(ratio - 1) < 0.004 || input.length < 2048) {
    const same = new Float32Array(target);
    same.set(input.subarray(0, Math.min(input.length, target)));
    return same;
  }
  const frame = 1024;
  const synHop = frame >> 2;
  const anaHop = Math.max(1, Math.round(synHop / ratio));
  const search = Math.round(0.004 * SAMPLE_RATE);
  const window = hann(frame);
  const acc = new Float32Array(target + frame);
  const norm = new Float32Array(target + frame);
  let anaPos = 0;
  let synPos = 0;
  let tail: Float32Array | null = null;

  while (synPos < target) {
    let best = Math.min(anaPos, Math.max(0, input.length - frame));
    if (tail) {
      const lo = Math.max(0, best - search);
      const hi = Math.min(Math.max(0, input.length - frame), best + search);
      let bestScore = -Infinity;
      for (let cand = lo; cand <= hi; cand += 8) {
        let score = 0;
        for (let i = 0; i < tail.length; i += 4) score += tail[i]! * (input[cand + i] ?? 0);
        if (score > bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }
    for (let i = 0; i < frame; i += 1) {
      const value = (input[best + i] ?? 0) * window[i]!;
      acc[synPos + i] = acc[synPos + i]! + value;
      norm[synPos + i] = norm[synPos + i]! + window[i]!;
    }
    tail = input.slice(best + synHop, best + frame);
    anaPos = best + anaHop;
    synPos += synHop;
  }

  const out = new Float32Array(target);
  for (let i = 0; i < target; i += 1) {
    const weight = norm[i]!;
    out[i] = weight > 0.0001 ? acc[i]! / weight : acc[i]!;
  }
  return out;
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
  return trimSilence(resample(levelled(buffer), buffer.sampleRate));
}

/** Quiet moments at the very start and the very end are simply removed. */
function trimSilence(samples: Float32Array): Float32Array {
  const threshold = 0.012;
  const keep = Math.round(0.02 * SAMPLE_RATE);
  let start = 0;
  while (start < samples.length && Math.abs(samples[start]!) < threshold) start += 1;
  let end = samples.length - 1;
  while (end > start && Math.abs(samples[end]!) < threshold) end -= 1;
  if (start >= end) return samples;
  const from = Math.max(0, start - keep);
  const to = Math.min(samples.length, end + keep);
  return samples.slice(from, to);
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

// Browser-only sound workshop of Project Joy. Several spoken tracks become one
// calm, even recording: their loudness is levelled, their timing is arranged
// and the result is written as a single audio file. A person never adjusts
// volume, timing or synchronisation themselves.

import { PVG_MIN_PART_GAP_SECONDS, PVG_PART_GAP_SECONDS, PVG_MAX_SPEECH_SPEED } from "./speech";
import { PVG_SYNC_MAX_SPEEDUP, PVG_SYNC_MAX_STRETCH } from "./sync-limits";

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
  /** How long the greeting really needs when spoken naturally, in seconds. */
  neededSeconds?: number;
  /** How much time the chosen video length leaves for speech, in seconds. */
  allowedSeconds?: number;
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

/**
 * Aligns one real recording to one shared length, keeping the voice itself
 * untouched: the natural pauses inside the greeting give way first, only then
 * is the pace adjusted a little, and never beyond what still sounds like a
 * person. The result always begins at the very same moment as every other
 * voice and always lasts exactly the shared length.
 */
function alignTrack(track: Float32Array, target: number): Float32Array {
  const out = new Float32Array(Math.max(1, target));
  if (track.length === 0) return out;
  const parts = speechSegments(track);
  const pieces: SpeechPart[] = parts.length ? parts : [{ start: 0, end: track.length }];

  const spokenTotal = pieces.reduce((sum, part) => sum + (part.end - part.start), 0);
  const gaps: number[] = [];
  for (let i = 1; i < pieces.length; i += 1) {
    gaps.push(Math.max(0, pieces[i]!.start - pieces[i - 1]!.end));
  }
  const maxGap = Math.round(MAX_INNER_PAUSE * SAMPLE_RATE);
  const minGap = Math.round(MIN_INNER_PAUSE * SAMPLE_RATE);
  const kept = gaps.map((gap) => Math.min(gap, maxGap));
  const keptTotal = kept.reduce((a, b) => a + b, 0);

  let extra = target - (spokenTotal + keptTotal);
  const finalGaps = [...kept];

  if (extra < 0) {
    // Too long: the pauses are tightened before a single word is hurried.
    let owed = -extra;
    const room = finalGaps.reduce((sum, gap) => sum + Math.max(0, gap - minGap), 0);
    if (room > 0) {
      const share = Math.min(1, owed / room);
      for (let i = 0; i < finalGaps.length; i += 1) {
        const give = Math.round(Math.max(0, finalGaps[i]! - minGap) * share);
        finalGaps[i] = finalGaps[i]! - give;
        owed -= give;
      }
    }
    extra = -Math.max(0, owed);
  } else if (extra > 0) {
    // Too short: the pauses are widened before a single word is drawn out.
    const room = finalGaps.reduce((sum, gap) => sum + Math.max(0, maxGap - gap), 0);
    if (room > 0) {
      const use = Math.min(extra, room);
      const share = use / room;
      for (let i = 0; i < finalGaps.length; i += 1) {
        const add = Math.round(Math.max(0, maxGap - finalGaps[i]!) * share);
        finalGaps[i] = finalGaps[i]! + add;
        extra -= add;
      }
    }
  }

  // Whatever the pauses could not settle is left to a small, safe change of
  // pace — never more than a voice can carry naturally.
  const gapTotal = finalGaps.reduce((a, b) => a + b, 0);
  const speechRoom = Math.max(1, target - gapTotal);
  const wanted = Math.min(
    Math.round(spokenTotal * PVG_SYNC_MAX_STRETCH),
    Math.max(Math.round(spokenTotal / PVG_SYNC_MAX_SPEEDUP), speechRoom),
  );
  const factor = wanted / Math.max(1, spokenTotal);

  let cursor = 0;
  for (let i = 0; i < pieces.length; i += 1) {
    const piece = track.slice(pieces[i]!.start, pieces[i]!.end);
    const length = Math.max(1, Math.round(piece.length * factor));
    const shaped = timeStretch(piece, length);
    for (let j = 0; j < shaped.length && cursor + j < out.length; j += 1) {
      out[cursor + j] = shaped[j]!;
    }
    cursor += length + (finalGaps[i] ?? 0);
    if (cursor >= out.length) break;
  }
  return out;
}

/**
 * Lets every chosen voice speak the whole greeting together, truly together.
 * Project Joy first lets each voice speak normally, then measures the real
 * length of what was actually spoken, and only then brings the recordings into
 * step: the longest natural voice sets the length, the others keep their words
 * and simply breathe a little differently. No voice is ever refused because of
 * an estimate, and the same recordings always lead to the same result.
 */
export async function blendTogether(
  sources: MixSource[],
  options: MixOptions = {},
): Promise<MixResult> {
  const tracks = await Promise.all(sources.map(prepare));
  if (tracks.length === 0) return finish(new Float32Array(1));
  if (tracks.length === 1) return withinLimit(tracks[0]!, options);

  // The real, measured length of the longest voice is the reference everybody
  // meets at. Nothing here depends on guessed speaking rates.
  const longest = Math.max(...tracks.map((t) => t.length));
  const limit = options.maxSeconds && options.maxSeconds > 0 ? options.maxSeconds : 0;
  const allowed = limit ? Math.floor(limit * SAMPLE_RATE) : 0;

  let target = longest;
  let overflow = false;
  if (allowed && longest > allowed) {
    // The video simply leaves less time than the greeting needs. The voices
    // may be hurried a little, never past what still sounds natural.
    const quickest = Math.round(longest / PVG_SYNC_MAX_SPEEDUP);
    target = Math.max(allowed, quickest);
    overflow = quickest > allowed;
  }

  const aligned = tracks.map((track) => alignTrack(track, target));
  const mixed = finish(overlay(aligned));
  if (!overflow) return mixed;
  return {
    ...mixed,
    overflow: true,
    neededSeconds: Math.round((longest / SAMPLE_RATE) * 100) / 100,
    allowedSeconds: Math.round((allowed / SAMPLE_RATE) * 100) / 100,
  };
}

/** The longest pause Project Joy keeps inside a greeting spoken together. */
const MAX_INNER_PAUSE = 0.35;
/** The shortest pause left between words, so speech never runs together. */
const MIN_INNER_PAUSE = 0.06;



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
  const gap = Math.round(0.07 * SAMPLE_RATE);
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

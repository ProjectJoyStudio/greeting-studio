// Client-safe check of a freshly recorded voice enrollment sample, done with
// the Web Audio API before the sample is ever uploaded. It catches the most
// common recording mistakes so people can re-record on the spot.

/** One thing Project Joy noticed while listening to a sample. */
export type SampleIssue =
  | "too_quiet"
  | "too_loud"
  | "noisy"
  | "multiple_speakers"
  | "incomplete"
  | "tail_missing"
  | "clipped"
  | "long_silence"
  | "too_short"
  | "too_long";

/** The result of listening to one recorded enrollment sample. */
export interface SampleCheck {
  ok: boolean;
  issues: SampleIssue[];
  durationSeconds: number;
  speechDb: number;
  noiseDb: number;
  spokenWordsEstimate: number;
}

/** i18n keys for the issues a sample check can report. */
export const SAMPLE_ISSUE_KEY: Record<SampleIssue, string> = {
  too_quiet: "mv_issue_too_quiet",
  too_loud: "mv_issue_too_loud",
  noisy: "mv_issue_noisy",
  multiple_speakers: "mv_issue_multiple_speakers",
  incomplete: "mv_issue_incomplete",
  tail_missing: "mv_issue_tail_missing",
  clipped: "mv_issue_clipped",
  long_silence: "mv_issue_long_silence",
  too_short: "mv_issue_too_short",
  too_long: "mv_issue_too_long",
};

/**
 * The order in which problems are reported. Only the single most important
 * one is ever shown, so unrelated warnings are never mixed together.
 */
export const SAMPLE_ISSUE_ORDER: SampleIssue[] = [
  "too_short",
  "too_long",
  "too_quiet",
  "too_loud",
  "clipped",
  "noisy",
  "long_silence",
  "multiple_speakers",
  "incomplete",
  "tail_missing",
];

/** Keeps only the one problem that truly explains what went wrong. */
export function primaryIssue(issues: SampleIssue[]): SampleIssue | null {
  for (const issue of SAMPLE_ISSUE_ORDER) {
    if (issues.includes(issue)) return issue;
  }
  return null;
}

const FRAME_SECONDS = 0.02;
const CLIP_THRESHOLD = 0.99;
const VOICED_DB_MARGIN = 6;
const LONG_SILENCE_SECONDS = 3.5;

function rmsToDb(rms: number): number {
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Looks at a recorded sample and flags anything worth re-recording for. */
export async function checkVoiceSample(input: {
  base64: string;
  mimeType: string;
  expectedWords: number;
}): Promise<SampleCheck> {
  const AudioCtx = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
  const audioContext = new AudioCtx();
  let buffer: AudioBuffer;
  try {
    buffer = await audioContext.decodeAudioData(base64ToArrayBuffer(input.base64));
  } finally {
    if (typeof audioContext.close === "function") await audioContext.close();
  }

  const durationSeconds = buffer.duration;
  const sampleRate = buffer.sampleRate;
  const frameSize = Math.max(1, Math.round(FRAME_SECONDS * sampleRate));
  const channelCount = buffer.numberOfChannels;

  // Mix down to mono for level analysis.
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < channelCount; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / channelCount;
  }

  const frameCount = Math.ceil(mono.length / frameSize);
  const frameRms: number[] = [];
  let clippedSamples = 0;
  for (let f = 0; f < frameCount; f++) {
    const start = f * frameSize;
    const end = Math.min(mono.length, start + frameSize);
    let sumSquares = 0;
    for (let i = start; i < end; i++) {
      const sample = mono[i];
      sumSquares += sample * sample;
      if (Math.abs(sample) >= CLIP_THRESHOLD) clippedSamples++;
    }
    frameRms.push(Math.sqrt(sumSquares / Math.max(1, end - start)));
  }

  const sortedRms = [...frameRms].sort((a, b) => a - b);
  const noiseCount = Math.max(1, Math.round(sortedRms.length * 0.1));
  const speechCount = Math.max(1, Math.round(sortedRms.length * 0.25));
  const noiseRms = sortedRms.slice(0, noiseCount).reduce((sum, v) => sum + v, 0) / noiseCount;
  const speechRms = sortedRms.slice(-speechCount).reduce((sum, v) => sum + v, 0) / speechCount;

  const noiseDb = rmsToDb(noiseRms);
  const speechDb = rmsToDb(speechRms);
  const voicedThresholdDb = noiseDb + VOICED_DB_MARGIN;

  const voiced = frameRms.map((rms) => rmsToDb(rms) > voicedThresholdDb);

  // Longest silent stretch fully inside the speech (ignore leading/trailing).
  const firstVoiced = voiced.indexOf(true);
  const lastVoiced = voiced.lastIndexOf(true);
  let longestSilentFrames = 0;
  let currentSilentFrames = 0;
  for (let i = firstVoiced; i >= 0 && i <= lastVoiced; i++) {
    if (!voiced[i]) {
      currentSilentFrames++;
      longestSilentFrames = Math.max(longestSilentFrames, currentSilentFrames);
    } else {
      currentSilentFrames = 0;
    }
  }
  const longestSilenceSeconds = longestSilentFrames * FRAME_SECONDS;

  // Count voiced segments (runs of consecutive voiced frames) as a word estimate.
  let segments = 0;
  const segmentLevels: number[] = [];
  let inSegment = false;
  let segmentSum = 0;
  let segmentLen = 0;
  for (let i = 0; i < voiced.length; i++) {
    if (voiced[i]) {
      if (!inSegment) {
        inSegment = true;
        segments++;
        segmentSum = 0;
        segmentLen = 0;
      }
      segmentSum += frameRms[i];
      segmentLen++;
    } else if (inSegment) {
      segmentLevels.push(segmentSum / Math.max(1, segmentLen));
      inSegment = false;
    }
  }
  if (inSegment) segmentLevels.push(segmentSum / Math.max(1, segmentLen));

  const spokenWordsEstimate = segments;

  const issues: SampleIssue[] = [];

  // Every threshold below marks a real recording problem only. Normal, clear
  // speech in an ordinary quiet room always passes.
  if (durationSeconds < 1.5) issues.push("too_short");
  if (durationSeconds > 60) issues.push("too_long");
  if (!Number.isFinite(speechDb) || speechDb < -45) issues.push("too_quiet");
  if (speechDb > -2) issues.push("too_loud");
  // Background noise is only reported when the room is genuinely loud: the
  // voice must stand less than 8 dB above everything else.
  if (Number.isFinite(noiseDb) && Number.isFinite(speechDb) && speechDb - noiseDb < 8) {
    issues.push("noisy");
  }
  if (clippedSamples > mono.length * 0.02) issues.push("clipped");
  if (longestSilenceSeconds > LONG_SILENCE_SECONDS) issues.push("long_silence");
  // Whether the whole sentence was read is decided from the words Project Joy
  // actually hears, never from counting bursts of sound, and loudness alone
  // never suggests that a second person was in the room.

  return {
    ok: issues.length === 0,
    issues,
    durationSeconds,
    speechDb,
    noiseDb,
    spokenWordsEstimate,
  };
}

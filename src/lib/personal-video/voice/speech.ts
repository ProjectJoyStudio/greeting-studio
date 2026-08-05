// Client-safe rules of how a greeting is spoken: the three speech modes, the
// way a greeting is shared between participants, and the recordings a person
// may bring themselves.

/** The three ways a greeting can be spoken. */
export type PvgSpeechMode = "single" | "parts" | "chorus";

/** Internal timing of a greeting spoken by several voices at once. */
export type PvgSyncMode = "simultaneous" | "delayed";

/** Slightly delayed sounds like real people speaking together. */
export const PVG_DEFAULT_SYNC: PvgSyncMode = "delayed";

/** How a participant speaks: with a Project Joy voice or their own recording. */
export type PvgVoiceSource = "library" | "recording";

export const PVG_MIN_CHORUS_VOICES = 2;
export const PVG_MAX_CHORUS_VOICES = 5;

/** Sound files a person may bring from their own device. */
export const PVG_RECORDING_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "ogg"] as const;

export const PVG_RECORDING_ACCEPT =
  ".mp3,.wav,.m4a,.aac,.ogg,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/webm";

/** Largest recording one participant may bring, so uploads always succeed. */
export const PVG_RECORDING_MAX_BYTES = 15 * 1024 * 1024;

export function isAcceptedRecording(fileName: string, mime: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if ((PVG_RECORDING_EXTENSIONS as readonly string[]).includes(ext)) return true;
  return /^audio\//.test(mime);
}

/** Quiet pause between two participants speaking one after the other. */
export const PVG_PART_GAP_SECONDS = 0.12;

/** The shortest pause Project Joy ever leaves between two participants. */
export const PVG_MIN_PART_GAP_SECONDS = 0.05;

/** Silence reserved at the very start of the video, before anyone speaks. */
export const PVG_LEAD_IN_SECONDS = 0.5;

/** Silence reserved at the very end of the video, after the last word. */
export const PVG_TAIL_OUT_SECONDS = 0.5;

/**
 * How long the speech of a greeting may last inside a video of a given
 * length: the first and the last half second always stay quiet.
 */
export function speechBudgetSeconds(videoSeconds: number): number {
  const video = Number(videoSeconds);
  if (!Number.isFinite(video) || video <= 0) return 0;
  return Math.max(1, Math.round((video - PVG_LEAD_IN_SECONDS - PVG_TAIL_OUT_SECONDS) * 100) / 100);
}

/** How far apart voices start when they speak together, slightly delayed. */
export const PVG_CHORUS_DELAY_SECONDS = 0.09;

/** The fastest Project Joy ever speaks; the voice still sounds natural. */
export const PVG_MAX_SPEECH_SPEED = 1.2;

/**
 * How long one voice needs for a single word before anything is measured.
 * It follows the one safe word limit of Project Joy — seven words inside the
 * four speaking seconds of a five second video — so the length promised while
 * the greeting is written and the length after generation always agree.
 */
export const PVG_DEFAULT_SECONDS_PER_WORD = 4 / 7;

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** One participant as the estimate sees them. */
export interface PvgPartEstimate {
  /** Length of a recording the person brought, in seconds. */
  recordedSeconds?: number;
  /** Words this person speaks with a Project Joy voice. */
  words?: number;
  /** How long this exact voice needs per word, as measured before. */
  secondsPerWord?: number;
}

/**
 * How long the whole greeting will take: every participant with their own
 * voice speed, the shortest pause between them, and the quiet half second at
 * the start and the end of the video.
 */
export function estimateSpeechSeconds(parts: PvgPartEstimate[], speed = 1): number {
  const speaking = parts.reduce((sum, part) => {
    if (part.recordedSeconds) return sum + part.recordedSeconds;
    const rate = part.secondsPerWord ?? PVG_DEFAULT_SECONDS_PER_WORD;
    return sum + ((part.words ?? 0) * rate) / Math.max(0.5, speed);
  }, 0);
  const gaps = Math.max(0, parts.length - 1) * PVG_MIN_PART_GAP_SECONDS;
  return Math.round((speaking + gaps) * 100) / 100;
}

/** The same estimate seen as the length of the whole video. */
export function estimateVideoSeconds(parts: PvgPartEstimate[], speed = 1): number {
  return (
    Math.round(
      (estimateSpeechSeconds(parts, speed) + PVG_LEAD_IN_SECONDS + PVG_TAIL_OUT_SECONDS) * 100,
    ) / 100
  );
}

/**
 * Shares one greeting fairly between the participants, sentence by sentence,
 * so every person receives a whole thought instead of a broken line.
 */
export function splitGreeting(text: string, participants: number): string[] {
  const people = Math.max(1, participants);
  const clean = text.trim();
  if (!clean) return Array.from({ length: people }, () => "");
  if (people === 1) return [clean];

  const sentences = clean
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let pieces = sentences.length >= people ? sentences : splitWords(clean, people);
  // Every participant must receive words, so a sentence list that is still too
  // short for the group is shared word by word instead.
  if (pieces.length < people) pieces = splitWords(clean, people);

  const total = pieces.reduce((sum, s) => sum + s.length, 0);
  const target = total / people;
  const parts: string[] = Array.from({ length: people }, () => "");
  let index = 0;
  let filled = 0;

  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i]!;
    const remainingPieces = pieces.length - i;
    const slotsAfterThisOne = people - index - 1;
    // Move to the next person when this one has spoken enough, and always in
    // time for everybody still waiting to receive at least one thought.
    const mustMoveOn = remainingPieces <= slotsAfterThisOne;
    const shouldMoveOn = filled >= target && remainingPieces > slotsAfterThisOne;
    if (index < people - 1 && parts[index] && (mustMoveOn || shouldMoveOn)) {
      index += 1;
      filled = 0;
    }
    parts[index] = parts[index] ? `${parts[index]} ${piece}` : piece;
    filled += piece.length;
  }
  // Nobody is ever handed a silent part: a leftover empty slot repeats nothing
  // and is filled from the longest part instead.
  return parts.map((part) => part.trim() || clean);
}

function splitWords(text: string, people: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const size = Math.ceil(words.length / people);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(" "));
  return out;
}

/** A merged recording is described in plain words inside the order. */
export interface PvgTrackSummary {
  personId: string | null;
  label: string;
  voiceId: string | null;
  source: PvgVoiceSource;
  durationSeconds: number;
  characterCount: number;
}

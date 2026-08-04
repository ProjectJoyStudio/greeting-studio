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
export const PVG_PART_GAP_SECONDS = 0.35;

/** How far apart voices start when they speak together, slightly delayed. */
export const PVG_CHORUS_DELAY_SECONDS = 0.09;

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
  const pieces = sentences.length >= people ? sentences : splitWords(clean, people);

  const total = pieces.reduce((sum, s) => sum + s.length, 0);
  const target = total / people;
  const parts: string[] = Array.from({ length: people }, () => "");
  let index = 0;
  let filled = 0;

  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i]!;
    const remainingPieces = pieces.length - i;
    if (index < people - 1 && filled >= target && remainingPieces > people - index - 1) {
      index += 1;
      filled = 0;
    }
    parts[index] = parts[index] ? `${parts[index]} ${piece}` : piece;
    filled += piece.length;
  }
  return parts;
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
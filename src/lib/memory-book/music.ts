// Client-safe constants and shapes of the Memory Book Music stage.
// The Project Joy Music Library itself is not redefined here: this file only
// describes what ONE book remembers about its background music.

/** Private storage area holding the music created for one Memory Book. */
export const MEMORY_BOOK_MUSIC_BUCKET = "memory-book-music";

/** Successful music creations included in every Memory Book. */
export const MEMORY_BOOK_MUSIC_INCLUDED = 2;

/** Credits charged for one further successful music creation. */
export const MEMORY_BOOK_MUSIC_CREDITS = 2;

/** Every created composition is exactly two minutes long. */
export const MEMORY_BOOK_MUSIC_SECONDS = 120;
export const MEMORY_BOOK_MUSIC_MS = MEMORY_BOOK_MUSIC_SECONDS * 1000;

export type MemoryBookMusicSource = "none" | "library" | "created";

/** One successful composition created for this exact book. */
export interface MemoryBookMusicVariant {
  id: string;
  prompt: string;
  url: string | null;
  durationSeconds: number;
  createdAt: string;
}

export interface MemoryBookMusicState {
  bookId: string;
  source: MemoryBookMusicSource;
  /** Chosen Project Joy library track, when the source is the library. */
  trackId: string | null;
  trackTitle: string;
  /** Chosen own composition, when the source is created music. */
  variantId: string | null;
  variants: MemoryBookMusicVariant[];
  /** Playable link of the music currently chosen for the book. */
  selectedUrl: string | null;
  enabled: boolean;
  volume: number;
  includedUsed: number;
  includedTotal: number;
  remaining: number;
  priceCredits: number;
  creditsSpent: number;
}

/** Keeps a stored volume inside a sane range. */
export function musicVolumeOf(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.35;
  return Math.min(1, Math.max(0, n));
}

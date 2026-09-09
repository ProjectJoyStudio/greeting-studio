// Client-safe constants and types of the video preparation workspace of ONE
// purchased Memory Book. No prices and no credits live here — preparing a
// video never costs anything.

import { MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS } from "./pages";

export { MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS };

/** Shortest useful piece of a source video. */
export const MEMORY_BOOK_FRAGMENT_MIN_SECONDS = 0.5;

/** How long one picture and sound fade between two joined pieces lasts. */
export const MEMORY_BOOK_FADE_SECONDS = 0.6;

/** One manually chosen piece of the source video, with its own sound. */
export interface MemoryBookVideoFragment {
  id: string;
  start: number;
  end: number;
}

export const fragmentLength = (fragment: MemoryBookVideoFragment) =>
  Math.max(0, fragment.end - fragment.start);

export const fragmentsLength = (fragments: MemoryBookVideoFragment[]) =>
  fragments.reduce((sum, fragment) => sum + fragmentLength(fragment), 0);

/** 4:32 style display used by the live counter. */
export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Keeps one fragment inside the source video and in the right order. */
export function clampFragment(
  fragment: MemoryBookVideoFragment,
  sourceSeconds: number,
): MemoryBookVideoFragment {
  const limit = Math.max(0, Number.isFinite(sourceSeconds) ? sourceSeconds : 0);
  const start = Math.min(Math.max(0, Number(fragment.start) || 0), limit);
  const rawEnd = Math.min(Math.max(0, Number(fragment.end) || 0), limit);
  const end = Math.max(start + MEMORY_BOOK_FRAGMENT_MIN_SECONDS, rawEnd);
  return {
    id: fragment.id,
    start: Number(start.toFixed(2)),
    end: Number(Math.min(limit, end).toFixed(2)),
  };
}

// Client-safe constants and types of the Book Materials stage of one
// purchased Memory Book.

/** Private storage area holding the source photos and videos of a book. */
export const MEMORY_BOOK_MATERIALS_BUCKET = "memory-book-materials";

/** Longest single source video a customer may upload, in seconds (60 min). */
export const MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS = 60 * 60;

export type MemoryBookMaterialKind = "photo" | "video";

export interface MemoryBookMaterial {
  id: string;
  kind: MemoryBookMaterialKind;
  /** Temporary address the browser can display. */
  url: string;
  fileName: string;
  durationSeconds: number | null;
  sizeBytes: number | null;
  createdAt: string;
}

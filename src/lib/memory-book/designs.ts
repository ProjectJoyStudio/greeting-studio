// Client-safe constants and types of the Cover / Leaf design stage of one
// purchased Memory Book. No credentials and no provider names live here.

export type MemoryBookStage = "cover" | "leaf";

/** Successful design creations included in every purchased Memory Book. */
export const MEMORY_BOOK_INCLUDED_GENERATIONS = 3;

/** One extra pack adds exactly three more successful creations. */
export const MEMORY_BOOK_PACK_GENERATIONS = 3;

/** Credits charged for one extra pack. */
export const MEMORY_BOOK_PACK_CREDITS = 3;

/** Private storage area holding the pictures created for a Memory Book. */
export const MEMORY_BOOK_DESIGN_BUCKET = "memory-book-designs";

/** Private storage area holding the ready-made designs of the library. */
export const MEMORY_BOOK_LIBRARY_BUCKET = "memory-book-library";

export interface MemoryBookDesignVariant {
  id: string;
  stage: MemoryBookStage;
  source: "generated" | "library";
  /** Temporary address the browser can display. */
  url: string;
  createdAt: string;
}

export interface MemoryBookStageState {
  prompt: string;
  variants: MemoryBookDesignVariant[];
  selectedId: string | null;
  used: number;
  allowed: number;
  remaining: number;
}

export interface MemoryBookDesignState {
  bookId: string;
  stage: MemoryBookStage;
  cover: MemoryBookStageState;
  leaf: MemoryBookStageState;
  creditsSpent: number;
}

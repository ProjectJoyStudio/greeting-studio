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

/** The two faces of the physical cover of one book. */
export type MemoryBookCoverSide = "front" | "back";

/** Where the back cover stands: inherited from the front, or chosen alone. */
export interface MemoryBookBackCoverState {
  /** The design chosen for the back cover, when the customer overrode it. */
  designId: string | null;
  /** True once the customer picked a back background of their own. */
  overridden: boolean;
  /** The background actually shown on the back cover right now. */
  url: string | null;
}

export interface MemoryBookDesignState {
  bookId: string;
  stage: MemoryBookStage;
  cover: MemoryBookStageState;
  leaf: MemoryBookStageState;
  backCover: MemoryBookBackCoverState;
  creditsSpent: number;
}

// Client-safe types and constants of the Project Joy Decorations Library.
// Stage 1: browsing and administration only — no placement on the page yet.

/** Private storage holding every decoration file uploaded by an administrator. */
export const MEMORY_BOOK_DECORATIONS_BUCKET = "memory-book-decorations";

/** Categories offered in Stage 1. */
export const MEMORY_BOOK_DECORATION_CATEGORIES = [
  "hearts",
  "flowers",
  "celebration",
  "wedding",
  "children",
  "christmas",
  "nature",
] as const;

export type MemoryBookDecorationCategory =
  (typeof MEMORY_BOOK_DECORATION_CATEGORIES)[number];

/** Only scalable SVG and transparent PNG decorations are supported. */
export type MemoryBookDecorationFileType = "svg" | "png";

export interface MemoryBookDecoration {
  id: string;
  name: string;
  category: MemoryBookDecorationCategory;
  /** Ready-to-use address of the decoration file. */
  url: string | null;
  fileType: MemoryBookDecorationFileType;
  /** Prepared for the later colour-change feature; unused in Stage 1. */
  recolorable: boolean;
  enabled: boolean;
  sortOrder: number;
  path: string;
  createdAt: string;
}

export function toCategory(value: unknown): MemoryBookDecorationCategory {
  return MEMORY_BOOK_DECORATION_CATEGORIES.includes(
    value as MemoryBookDecorationCategory,
  )
    ? (value as MemoryBookDecorationCategory)
    : "hearts";
}

export function fileTypeOf(fileName: string): MemoryBookDecorationFileType | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".svg")) return "svg";
  if (lower.endsWith(".png")) return "png";
  return null;
}

/** Translation key of one category label. */
export const categoryLabelKey = (category: MemoryBookDecorationCategory) =>
  `mbdec_cat_${category}`;

// Client-safe constants and types of the Internal Page Editor of one
// purchased Memory Book. No prices and no provider names live here.

export type MemoryBookPageContent = "empty" | "photos" | "text" | "video";

/** A finished video placed on a book page may be at most 5 minutes long. */
export const MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS = 5 * 60;

/** Most photos one internal page may hold. */
export const MEMORY_BOOK_MAX_PHOTOS_PER_PAGE = 4;

export interface MemoryBookPhotoSlot {
  /** Source photo of this book, or null while the area is still empty. */
  materialId: string | null;
  /** Horizontal shift inside the area, in area widths (-1 … 1). */
  offsetX: number;
  /** Vertical shift inside the area, in area heights (-1 … 1). */
  offsetY: number;
  /** Zoom factor of the photo inside its area. */
  scale: number;
}

export interface MemoryBookPage {
  pageIndex: number;
  content: MemoryBookPageContent;
  layout: string | null;
  slots: MemoryBookPhotoSlot[];
  text: string;
  videoMaterialId: string | null;
}

export interface MemoryBookLayout {
  /** Stable identifier stored with the page. */
  id: string;
  /** How many photos this layout holds. */
  count: number;
  /** Areas as percentages of the page, in the order the photos are placed. */
  areas: { left: number; top: number; width: number; height: number }[];
}

/** Clean, non-overlapping photo areas. Percentages of the page box. */
export const MEMORY_BOOK_LAYOUTS: MemoryBookLayout[] = [
  { id: "one_full", count: 1, areas: [{ left: 6, top: 6, width: 88, height: 88 }] },
  {
    id: "two_rows",
    count: 2,
    areas: [
      { left: 6, top: 6, width: 88, height: 43 },
      { left: 6, top: 51, width: 88, height: 43 },
    ],
  },
  {
    id: "two_columns",
    count: 2,
    areas: [
      { left: 6, top: 6, width: 43, height: 88 },
      { left: 51, top: 6, width: 43, height: 88 },
    ],
  },
  {
    id: "three_rows",
    count: 3,
    areas: [
      { left: 6, top: 6, width: 88, height: 28 },
      { left: 6, top: 36, width: 88, height: 28 },
      { left: 6, top: 66, width: 88, height: 28 },
    ],
  },
  {
    id: "three_one_big",
    count: 3,
    areas: [
      { left: 6, top: 6, width: 88, height: 52 },
      { left: 6, top: 60, width: 43, height: 34 },
      { left: 51, top: 60, width: 43, height: 34 },
    ],
  },
  {
    id: "four_grid",
    count: 4,
    areas: [
      { left: 6, top: 6, width: 43, height: 43 },
      { left: 51, top: 6, width: 43, height: 43 },
      { left: 6, top: 51, width: 43, height: 43 },
      { left: 51, top: 51, width: 43, height: 43 },
    ],
  },
  {
    id: "four_rows",
    count: 4,
    areas: [
      { left: 6, top: 6, width: 88, height: 20.5 },
      { left: 6, top: 29, width: 88, height: 20.5 },
      { left: 6, top: 51.5, width: 88, height: 20.5 },
      { left: 6, top: 74, width: 88, height: 20.5 },
    ],
  },
];

export const findLayout = (id: string | null | undefined) =>
  MEMORY_BOOK_LAYOUTS.find((l) => l.id === id) ?? null;

export const layoutsForCount = (count: number) =>
  MEMORY_BOOK_LAYOUTS.filter((l) => l.count === count);

export const emptySlot = (): MemoryBookPhotoSlot => ({
  materialId: null,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
});

export const emptyPage = (pageIndex: number): MemoryBookPage => ({
  pageIndex,
  content: "empty",
  layout: null,
  slots: [],
  text: "",
  videoMaterialId: null,
});

/** Keeps a photo inside its own area whatever the customer drags. */
export function clampSlot(slot: MemoryBookPhotoSlot): MemoryBookPhotoSlot {
  const scale = Math.min(4, Math.max(1, Number(slot.scale) || 1));
  const limit = (scale - 1) / 2;
  const bound = (value: number) =>
    Math.min(limit, Math.max(-limit, Number.isFinite(value) ? value : 0));
  return {
    materialId: slot.materialId ?? null,
    offsetX: bound(slot.offsetX),
    offsetY: bound(slot.offsetY),
    scale,
  };
}

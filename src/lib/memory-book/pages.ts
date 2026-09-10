// Client-safe constants and types of the Internal Page Editor of one
// purchased Memory Book. No prices and no provider names live here.

import {
  DEFAULT_TEXT_DESIGN,
  normalizeTextDesign,
  type CardTextDesign,
} from "@/lib/greeting-card/types";

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

/**
 * Position and size of the WHOLE photo composition on the page. The photo
 * crop inside every frame is stored separately in the slots.
 */
export interface MemoryBookFrame {
  /** Horizontal shift of the composition, in percent of the page width. */
  x: number;
  /** Vertical shift of the composition, in percent of the page height. */
  y: number;
  /** Size of the composition, 1 = the full designed area. */
  scale: number;
}

/**
 * Place and size of the video window on the page. All four values are
 * percentages of the page, so the arrangement looks the same in every
 * preview size. The video inside always keeps its own proportions.
 */
export interface MemoryBookVideoFrame {
  /** Left edge, in percent of the page width. */
  x: number;
  /** Top edge, in percent of the page height. */
  y: number;
  /** Width, in percent of the page width. */
  width: number;
  /** Height, in percent of the page height. */
  height: number;
}

/**
 * One decoration placed on ONE page. It is an independent page object: the
 * library decoration itself is never changed by moving or recolouring it.
 */
export interface MemoryBookPlacedDecoration {
  /** Identifies this placed object on this page. */
  id: string;
  /** The library decoration this object shows. */
  decorationId: string;
  /** Centre of the decoration, in percent of the page width/height. */
  x: number;
  y: number;
  /** Width of the decoration, in percent of the page width; height follows. */
  size: number;
  /** Turn of the decoration, in degrees. */
  rotation: number;
  /** Colour chosen for THIS placed SVG only, or null for the original look. */
  color: string | null;
}

export interface MemoryBookPage {
  pageIndex: number;
  content: MemoryBookPageContent;
  layout: string | null;
  slots: MemoryBookPhotoSlot[];
  frame: MemoryBookFrame;
  text: string;
  /** Look and position of the page text — the shared Project Joy text design. */
  textDesign: CardTextDesign;
  videoMaterialId: string | null;
  /** Where the video window sits on the page and how big it is. */
  videoFrame: MemoryBookVideoFrame;
  /** Decorations placed on THIS page only. */
  decorations: MemoryBookPlacedDecoration[];
}

export const MEMORY_BOOK_DECORATION_MIN_SIZE = 4;
export const MEMORY_BOOK_DECORATION_MAX_SIZE = 100;
export const MEMORY_BOOK_MAX_DECORATIONS_PER_PAGE = 40;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Keeps one placed decoration inside the page and within sensible sizes. */
export function clampPlacedDecoration(
  value: Partial<MemoryBookPlacedDecoration> | null | undefined,
): MemoryBookPlacedDecoration {
  const num = (raw: unknown, fallback: number) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const size = Math.min(
    MEMORY_BOOK_DECORATION_MAX_SIZE,
    Math.max(MEMORY_BOOK_DECORATION_MIN_SIZE, num(value?.size, 25)),
  );
  const rotation = ((num(value?.rotation, 0) % 360) + 360) % 360;
  const color = typeof value?.color === "string" && HEX.test(value.color) ? value.color : null;
  return {
    id: String(value?.id ?? "").slice(0, 64),
    decorationId: String(value?.decorationId ?? "").slice(0, 64),
    x: Number(Math.min(100, Math.max(0, num(value?.x, 50))).toFixed(2)),
    y: Number(Math.min(100, Math.max(0, num(value?.y, 50))).toFixed(2)),
    size: Number(size.toFixed(2)),
    rotation: Number(rotation.toFixed(1)),
    color,
  };
}

/** Reads a stored decoration list, dropping anything unusable. */
export function readPlacedDecorations(value: unknown): MemoryBookPlacedDecoration[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MEMORY_BOOK_MAX_DECORATIONS_PER_PAGE)
    .map((raw) => clampPlacedDecoration(raw as Partial<MemoryBookPlacedDecoration>))
    .filter((d) => d.id && d.decorationId);
}

export const MEMORY_BOOK_VIDEO_MIN_SIZE = 15;

export const defaultVideoFrame = (): MemoryBookVideoFrame => ({
  x: 8,
  y: 20,
  width: 84,
  height: 55,
});

/** Keeps the video window fully inside the page, whatever the customer does. */
export function clampVideoFrame(
  value: Partial<MemoryBookVideoFrame> | null | undefined,
): MemoryBookVideoFrame {
  const num = (raw: unknown, fallback: number) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const base = defaultVideoFrame();
  const width = Math.min(100, Math.max(MEMORY_BOOK_VIDEO_MIN_SIZE, num(value?.width, base.width)));
  const height = Math.min(
    100,
    Math.max(MEMORY_BOOK_VIDEO_MIN_SIZE, num(value?.height, base.height)),
  );
  const x = Math.min(100 - width, Math.max(0, num(value?.x, base.x)));
  const y = Math.min(100 - height, Math.max(0, num(value?.y, base.y)));
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2)),
  };
}

/** Page text starts in the middle of the page, dark on a light leaf design. */
export const memoryBookDefaultTextDesign = (): CardTextDesign => ({
  ...DEFAULT_TEXT_DESIGN,
  color: "#2b2118",
  shadow: false,
  fontSize: 5,
  y: 50,
});

/** Keeps the text block inside the usable page area. */
export function clampTextDesign(value: unknown): CardTextDesign {
  const design = normalizeTextDesign({ ...memoryBookDefaultTextDesign(), ...(value as object ?? {}) });
  const bound = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  return {
    ...design,
    x: bound(Number(design.x), 5, 95),
    y: bound(Number(design.y), 5, 95),
    width: bound(Number(design.width), 20, 95),
    fontSize: bound(Number(design.fontSize), 2, 14),
  };
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

/** The composition fills the designed page area by default. */
export const MEMORY_BOOK_FRAME_MIN_SCALE = 0.35;
export const MEMORY_BOOK_FRAME_MAX_SCALE = 1;

export const defaultFrame = (): MemoryBookFrame => ({ x: 0, y: 0, scale: 1 });

/** Keeps the whole composition inside the usable page area. */
export function clampFrame(frame: Partial<MemoryBookFrame> | null | undefined): MemoryBookFrame {
  const raw = Number(frame?.scale);
  const scale = Math.min(
    MEMORY_BOOK_FRAME_MAX_SCALE,
    Math.max(MEMORY_BOOK_FRAME_MIN_SCALE, Number.isFinite(raw) && raw > 0 ? raw : 1),
  );
  const limit = 50 * (1 - scale);
  const bound = (value: unknown) => {
    const n = Number(value);
    return Math.min(limit, Math.max(-limit, Number.isFinite(n) ? n : 0));
  };
  return { x: bound(frame?.x), y: bound(frame?.y), scale };
}

export const emptyPage = (pageIndex: number): MemoryBookPage => ({
  pageIndex,
  content: "empty",
  layout: null,
  slots: [],
  frame: defaultFrame(),
  text: "",
  textDesign: memoryBookDefaultTextDesign(),
  videoMaterialId: null,
  videoFrame: defaultVideoFrame(),
  decorations: [],
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

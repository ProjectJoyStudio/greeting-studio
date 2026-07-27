// ---------------------------------------------------------------------------
// Project Joy — Automatic text-fitting engine.
//
// Deterministic, unit-agnostic layout of greeting text inside a card.
// Everything is computed in a fixed *reference space* (REF_WIDTH x refHeight),
// so the admin preview, the public catalog and the exported image all produce
// pixel-identical results once the layer is scaled to its container.
// ---------------------------------------------------------------------------

import type { TextDesign } from "@/lib/admin/catalog-mgmt/types";

/** Width of the layout reference space in px. */
export const REF_WIDTH = 1000;

/** Safe inner margin, as a fraction of each axis. Text never enters this band. */
export const SAFE_INSET = 0.06;

/** Smallest readable font size in reference px. */
export const MIN_FONT_SIZE = 20;

/** Below this the result is flagged as unreadable for publishing. */
export const READABLE_FONT_SIZE = 22;

/** Tightest line-height the engine is allowed to squeeze to. */
export const MIN_LINE_HEIGHT = 1.02;

export interface FitInput {
  text: string;
  design: TextDesign;
  /** Reference-space canvas height (REF_WIDTH / aspect ratio). */
  refHeight: number;
}

export interface FitResult {
  /** Final values in reference-space px. */
  fontSize: number;
  lineHeight: number;
  lines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  /** True when the text could not be made to fit even at the minimum size. */
  overflow: boolean;
  /** True when the fitted size is below the readability threshold. */
  tooSmall: boolean;
  /** True when the engine had to change the authored size/width/position. */
  adjusted: boolean;
}

export interface SafeArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function safeAreaFor(refHeight: number): SafeArea {
  const insetX = REF_WIDTH * SAFE_INSET;
  const insetY = refHeight * SAFE_INSET;
  return {
    x: insetX,
    y: insetY,
    width: REF_WIDTH - insetX * 2,
    height: refHeight - insetY * 2,
  };
}

export function refHeightFor(aspectRatio: string | undefined): number {
  const [w, h] = (aspectRatio ?? "4:5").split(/[:/]/).map((n) => Number(n.trim()));
  if (!w || !h) return REF_WIDTH * 1.25;
  return Math.round((REF_WIDTH * h) / w);
}

// --- measurement -----------------------------------------------------------

type Measure = (text: string, fontSize: number) => number;

let ctx: CanvasRenderingContext2D | null | undefined;
function context(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  try {
    if (typeof document === "undefined") {
      ctx = null;
    } else {
      ctx = document.createElement("canvas").getContext("2d");
    }
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * Per-font average advance factor, used when a real canvas is unavailable
 * (SSR, export workers). Deliberately conservative — it over-estimates width
 * slightly so the fallback never overflows.
 */
const FALLBACK_FACTOR: Record<string, number> = {
  Fraunces: 0.52,
  "Playfair Display": 0.5,
  Cormorant: 0.46,
  Georgia: 0.53,
  Inter: 0.55,
  "system-ui": 0.55,
};

function makeMeasure(design: TextDesign): Measure {
  const c = context();
  const family = `"${design.fontFamily}", serif`;
  if (c) {
    const cache = new Map<string, number>();
    return (text, fontSize) => {
      const key = `${fontSize}|${text}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      c.font = `${design.fontWeight} ${fontSize}px ${family}`;
      const w = c.measureText(text).width;
      cache.set(key, w);
      return w;
    };
  }
  const base = FALLBACK_FACTOR[design.fontFamily] ?? 0.55;
  const weightBoost = design.fontWeight >= 600 ? 1.04 : 1;
  return (text, fontSize) => text.length * fontSize * base * weightBoost;
}

// --- wrapping --------------------------------------------------------------

function breakLongWord(word: string, maxWidth: number, size: number, measure: Measure): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of word) {
    const next = cur + ch;
    if (cur && measure(next, size) > maxWidth) {
      out.push(cur);
      cur = ch;
    } else {
      cur = next;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Wrap `text` into lines no wider than `maxWidth`. Honours explicit newlines. */
export function wrapText(text: string, maxWidth: number, size: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let cur = "";
    for (const word of words) {
      const candidate = cur ? `${cur} ${word}` : word;
      if (cur && measure(candidate, size) > maxWidth) {
        lines.push(cur);
        cur = word;
      } else {
        cur = candidate;
      }
      if (measure(cur, size) > maxWidth) {
        const pieces = breakLongWord(cur, maxWidth, size, measure);
        cur = pieces.pop() ?? "";
        lines.push(...pieces);
      }
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [""];
}

function widest(lines: string[], size: number, measure: Measure): number {
  return lines.reduce((m, l) => Math.max(m, measure(l, size)), 0);
}

// --- fitting ---------------------------------------------------------------

interface Attempt {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  width: number;
  height: number;
}

function tryFit(
  text: string,
  boxWidth: number,
  maxLines: number,
  availHeight: number,
  fontSize: number,
  lineHeights: number[],
  measure: Measure,
): Attempt | null {
  const lines = wrapText(text, boxWidth, fontSize, measure);
  if (lines.length > maxLines) return null;
  if (widest(lines, fontSize, measure) > boxWidth + 0.5) return null;
  for (const lh of lineHeights) {
    const height = lines.length * fontSize * lh;
    if (height <= availHeight) {
      return { fontSize, lineHeight: lh, lines, width: boxWidth, height };
    }
  }
  return null;
}

/**
 * Fit `text` for one language inside the card, using the authored design as
 * the upper bound. Never returns a layout that leaves the safe area.
 */
export function fitText({ text, design, refHeight }: FitInput): FitResult {
  const safe = safeAreaFor(refHeight);
  const measure = makeMeasure(design);
  const clean = text.trim();

  const authoredWidth = Math.min(Math.max((design.width / 100) * REF_WIDTH, REF_WIDTH * 0.2), safe.width);
  const lineHeights: number[] = [];
  for (let lh = design.lineHeight; lh >= MIN_LINE_HEIGHT - 1e-6; lh -= 0.05) {
    lineHeights.push(Number(lh.toFixed(2)));
  }
  if (lineHeights.length === 0) lineHeights.push(design.lineHeight);

  if (!clean) {
    return {
      fontSize: design.fontSize,
      lineHeight: design.lineHeight,
      lines: [],
      x: clampX(design, authoredWidth, safe),
      y: clampY(design, 0, safe, refHeight),
      width: authoredWidth,
      height: 0,
      overflow: false,
      tooSmall: false,
      adjusted: false,
    };
  }

  const maxByHeight = Math.max(1, Math.floor(safe.height / (MIN_FONT_SIZE * MIN_LINE_HEIGHT)));
  const authoredMaxLines = Math.max(1, design.maxLines);

  // Progressive relaxation: keep the author's intent first, widen only if needed,
  // then allow more lines, and finally accept the minimum readable size.
  const passes: Array<{ width: number; maxLines: number }> = [
    { width: authoredWidth, maxLines: authoredMaxLines },
    { width: safe.width, maxLines: authoredMaxLines },
    { width: authoredWidth, maxLines: maxByHeight },
    { width: safe.width, maxLines: maxByHeight },
  ];

  let best: Attempt | null = null;
  let relaxed = false;
  for (let i = 0; i < passes.length; i += 1) {
    const pass = passes[i];
    // Largest size first — walk down from the authored size.
    let lo = MIN_FONT_SIZE;
    let hi = Math.max(MIN_FONT_SIZE, Math.round(design.fontSize));
    let found: Attempt | null = null;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const attempt = tryFit(clean, pass.width, pass.maxLines, safe.height, mid, lineHeights, measure);
      if (attempt) {
        found = attempt;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (found) {
      best = found;
      relaxed = i > 0;
      break;
    }
  }

  let overflow = false;
  if (!best) {
    // Nothing fits — lay out at the minimum size and report the overflow so
    // publishing is blocked. Lines are still wrapped, never clipped mid-word.
    const lines = wrapText(clean, safe.width, MIN_FONT_SIZE, measure);
    best = {
      fontSize: MIN_FONT_SIZE,
      lineHeight: MIN_LINE_HEIGHT,
      lines,
      width: safe.width,
      height: lines.length * MIN_FONT_SIZE * MIN_LINE_HEIGHT,
    };
    overflow = true;
    relaxed = true;
  }

  const x = clampX({ ...design, width: (best.width / REF_WIDTH) * 100 }, best.width, safe);
  const y = clampY(design, best.height, safe, refHeight);

  return {
    fontSize: best.fontSize,
    lineHeight: best.lineHeight,
    lines: best.lines,
    x,
    y,
    width: best.width,
    height: best.height,
    overflow,
    tooSmall: best.fontSize < READABLE_FONT_SIZE,
    adjusted:
      relaxed ||
      best.fontSize !== Math.round(design.fontSize) ||
      Math.abs(best.lineHeight - design.lineHeight) > 0.001,
  };
}

function clampX(design: TextDesign, width: number, safe: SafeArea): number {
  const wanted = (design.x / 100) * REF_WIDTH;
  return Math.min(Math.max(wanted, safe.x), safe.x + safe.width - width);
}

function clampY(design: TextDesign, height: number, safe: SafeArea, refHeight: number): number {
  const wanted = (design.y / 100) * refHeight;
  return Math.min(Math.max(wanted, safe.y), Math.max(safe.y, safe.y + safe.height - height));
}

/**
 * Convert a fit result back into an authorable TextDesign (percent based),
 * used when the administrator switches a language from auto to manual.
 */
export function fitToDesign(base: TextDesign, fit: FitResult, refHeight: number): TextDesign {
  return {
    ...base,
    x: Number(((fit.x / REF_WIDTH) * 100).toFixed(2)),
    y: Number(((fit.y / refHeight) * 100).toFixed(2)),
    width: Number(((fit.width / REF_WIDTH) * 100).toFixed(2)),
    fontSize: fit.fontSize,
    lineHeight: fit.lineHeight,
    maxLines: Math.max(base.maxLines, fit.lines.length),
  };
}

/**
 * Lay out text exactly as authored (manual mode) — nothing is resized or moved.
 * The result still reports whether the block leaves the safe area so that the
 * publish validation can flag it.
 */
export function layoutManual({ text, design, refHeight }: FitInput): FitResult {
  const safe = safeAreaFor(refHeight);
  const measure = makeMeasure(design);
  const clean = text.trim();
  const width = Math.max((design.width / 100) * REF_WIDTH, 1);
  const lines = clean ? wrapText(clean, width, design.fontSize, measure) : [];
  const visible = lines.slice(0, Math.max(1, design.maxLines));
  const height = visible.length * design.fontSize * design.lineHeight;
  const x = (design.x / 100) * REF_WIDTH;
  const y = (design.y / 100) * refHeight;
  const outside =
    x < safe.x - 0.5 ||
    y < safe.y - 0.5 ||
    x + width > safe.x + safe.width + 0.5 ||
    y + height > safe.y + safe.height + 0.5;
  return {
    fontSize: design.fontSize,
    lineHeight: design.lineHeight,
    lines: visible,
    x,
    y,
    width,
    height,
    overflow: outside || lines.length > visible.length,
    tooSmall: design.fontSize < READABLE_FONT_SIZE,
    adjusted: false,
  };
}

/** Layout entry point shared by the editor, the public catalog and export. */
export function layoutCardText(
  input: FitInput & { autoFit: boolean },
): FitResult {
  return input.autoFit ? fitText(input) : layoutManual(input);
}
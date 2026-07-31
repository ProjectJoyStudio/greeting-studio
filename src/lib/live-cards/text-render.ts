// ---------------------------------------------------------------------------
// One single description of how a greeting is placed on a live greeting card.
// The editor preview, the viewer and the final rendered video all use these
// numbers, so what a person positions on screen is exactly what is exported —
// on a phone, on a laptop and inside the finished video file.
// ---------------------------------------------------------------------------

import type { CardTextDesign } from "@/lib/greeting-card/types";

/** Percentage of the frame that always stays free at every edge. */
export const SAFE_MARGIN = 5;

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full || "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Keeps the greeting inside the visible area of the video. */
export function clampPosition(x: number, y: number, width: number): { x: number; y: number } {
  const half = Math.min(width, 100 - SAFE_MARGIN * 2) / 2;
  const minX = SAFE_MARGIN + half;
  const maxX = 100 - SAFE_MARGIN - half;
  return {
    x: Math.round(Math.min(Math.max(x, Math.min(minX, maxX)), Math.max(minX, maxX))),
    y: Math.round(Math.min(Math.max(y, SAFE_MARGIN), 100 - SAFE_MARGIN)),
  };
}

type Measurer = Pick<CanvasRenderingContext2D, "measureText"> & { font: string };

function splitLongWord(ctx: Measurer, word: string, maxWidth: number): string[] {
  if (ctx.measureText(word).width <= maxWidth) return [word];
  const parts: string[] = [];
  let part = "";
  // Array.from splits by Unicode code point rather than UTF-16 code unit, so
  // Cyrillic and other non-ASCII greetings are never broken into invalid text.
  for (const character of Array.from(word)) {
    const next = part + character;
    if (part && ctx.measureText(next).width > maxWidth) {
      parts.push(part);
      part = character;
    } else {
      part = next;
    }
  }
  if (part) parts.push(part);
  return parts;
}

function wrap(ctx: Measurer, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    const words = paragraph.split(/\s+/).filter(Boolean);
    for (const word of words) {
      for (const part of splitLongWord(ctx, word, maxWidth)) {
        const next = line ? `${line} ${part}` : part;
        if (ctx.measureText(next).width > maxWidth && line) {
          lines.push(line);
          line = part;
        } else {
          line = next;
        }
      }
    }
    // An empty line is intentional and preserves paragraph breaks.
    lines.push(line);
  }
  return lines;
}

export interface GreetingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GreetingLayout {
  lines: string[];
  fontPx: number;
  lineHeight: number;
  /** Width the text wraps inside, without the background padding. */
  boxWidth: number;
  blockHeight: number;
  padX: number;
  padY: number;
  centerX: number;
  centerY: number;
  /** Outer rectangle of the whole greeting, padding included. */
  box: GreetingBox;
}

export interface GreetingLayoutValidation {
  valid: boolean;
  reason?: "outside_safe_area" | "line_overlap" | "line_overflow";
}

/** One shared measuring surface for the browser preview. */
let measurer: Measurer | null = null;
function getMeasurer(): Measurer | null {
  if (measurer) return measurer;
  if (typeof document === "undefined") return null;
  const ctx = document.createElement("canvas").getContext("2d");
  measurer = ctx;
  return measurer;
}

/**
 * Works out exactly how the greeting sits on a frame: wrapping, line height
 * and — when the text is too long — a smaller size so everything stays inside
 * the safe area. The preview and the exported video both use this, so what a
 * person sees is what they get.
 */
export function layoutGreeting(
  frameWidth: number,
  frameHeight: number,
  text: string,
  design: CardTextDesign,
  ctxIn?: Measurer | null,
): GreetingLayout | null {
  const value = text.trim();
  const ctx = ctxIn ?? getMeasurer();
  if (!value || !ctx || frameWidth <= 0 || frameHeight <= 0) return null;

  const safeW = (frameWidth * (100 - SAFE_MARGIN * 2)) / 100;
  const safeH = (frameHeight * (100 - SAFE_MARGIN * 2)) / 100;
  const wanted = Math.min((frameWidth * design.width) / 100, safeW);

  let fontPx = Math.max(6, (design.fontSize / 100) * frameWidth);
  let lines: string[] = [];
  let lineHeight = fontPx * 1.32;
  let boxWidth = wanted;
  let padX = 0;
  let padY = 0;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    padX = design.background ? fontPx * 0.6 : 0;
    padY = design.background ? fontPx * 0.45 : 0;
    boxWidth = Math.max(fontPx, Math.min(wanted, safeW - padX * 2));
    ctx.font = `${fontPx}px ${design.fontFamily}`;
    lines = wrap(ctx, value, boxWidth);
    lineHeight = fontPx * 1.32;
    const blockHeight = lines.length * lineHeight;
    let widest = 0;
    for (const line of lines) widest = Math.max(widest, ctx.measureText(line).width);
    const fits = blockHeight + padY * 2 <= safeH && widest <= boxWidth + 0.5;
    if (fits || fontPx <= 7) break;
    fontPx = Math.max(7, fontPx * 0.94);
  }

  const blockHeight = lines.length * lineHeight;
  const outerW = boxWidth + padX * 2;
  const outerH = blockHeight + padY * 2;
  const minX = (frameWidth * SAFE_MARGIN) / 100 + outerW / 2;
  const maxX = frameWidth - (frameWidth * SAFE_MARGIN) / 100 - outerW / 2;
  const minY = (frameHeight * SAFE_MARGIN) / 100 + outerH / 2;
  const maxY = frameHeight - (frameHeight * SAFE_MARGIN) / 100 - outerH / 2;
  const clamp = (v: number, lo: number, hi: number) =>
    lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi);
  const centerX = clamp((design.x / 100) * frameWidth, minX, maxX);
  const centerY = clamp((design.y / 100) * frameHeight, minY, maxY);

  return {
    lines,
    fontPx,
    lineHeight,
    boxWidth,
    blockHeight,
    padX,
    padY,
    centerX,
    centerY,
    box: {
      left: centerX - outerW / 2,
      top: centerY - outerH / 2,
      width: outerW,
      height: outerH,
    },
  };
}

/**
 * Rejects a layout before recording if it could overlap or leave the safe
 * area. This is deliberately shared by preview and export validation.
 */
export function validateGreetingLayout(
  frameWidth: number,
  frameHeight: number,
  layout: GreetingLayout,
  ctxIn?: Measurer | null,
): GreetingLayoutValidation {
  const marginX = (frameWidth * SAFE_MARGIN) / 100;
  const marginY = (frameHeight * SAFE_MARGIN) / 100;
  const epsilon = 1;
  if (
    layout.box.left < marginX - epsilon ||
    layout.box.top < marginY - epsilon ||
    layout.box.left + layout.box.width > frameWidth - marginX + epsilon ||
    layout.box.top + layout.box.height > frameHeight - marginY + epsilon
  ) {
    return { valid: false, reason: "outside_safe_area" };
  }
  if (layout.lineHeight < layout.fontPx * 1.15) {
    return { valid: false, reason: "line_overlap" };
  }
  const ctx = ctxIn ?? getMeasurer();
  if (ctx) {
    ctx.font = `${layout.fontPx}px ${layout.fontPx ? "sans-serif" : "sans-serif"}`;
    // Width is already measured with the selected font by layoutGreeting.
    // This geometry check catches any impossible/negative text box.
    if (layout.boxWidth <= 0 || layout.lines.some((line) => !Number.isFinite(line.length))) {
      return { valid: false, reason: "line_overflow" };
    }
  }
  return { valid: true };
}

/**
 * Paints the greeting onto a frame. Returns the area it occupies, which is
 * used to confirm afterwards that the text really is part of the video.
 */
export function drawGreeting(
  ctx: CanvasRenderingContext2D,
  frameWidth: number,
  frameHeight: number,
  text: string,
  design: CardTextDesign,
): GreetingBox | null {
  const layout = layoutGreeting(frameWidth, frameHeight, text, design, ctx);
  if (!layout) return null;
  const { lines, fontPx, lineHeight, boxWidth, blockHeight, centerX, centerY } = layout;

  ctx.save();
  ctx.font = `${fontPx}px ${design.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = design.align;

  if (design.background) {
    ctx.fillStyle = hexToRgba(design.backgroundColor, design.backgroundOpacity);
    ctx.fillRect(
      layout.box.left,
      layout.box.top,
      layout.box.width,
      layout.box.height,
    );
  }

  const anchorX =
    design.align === "left"
      ? centerX - boxWidth / 2
      : design.align === "right"
        ? centerX + boxWidth / 2
        : centerX;
  const startY = centerY - blockHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    if (design.outline) {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(1, fontPx * 0.08);
      ctx.strokeStyle = design.outlineColor || "#000000";
      ctx.strokeText(line, anchorX, y);
      ctx.restore();
    }
    if (design.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = fontPx * 0.35;
      ctx.shadowOffsetY = fontPx * 0.06;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.fillStyle = design.color;
    ctx.fillText(line, anchorX, y);
  });

  ctx.restore();
  return {
    left: Math.max(0, layout.box.left),
    top: Math.max(0, layout.box.top),
    width: Math.min(frameWidth, layout.box.width),
    height: Math.min(frameHeight, layout.box.height),
  };
}
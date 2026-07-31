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

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
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
  const value = text.trim();
  if (!value) return null;

  const fontPx = (design.fontSize / 100) * frameWidth;
  ctx.save();
  ctx.font = `${fontPx}px ${design.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = design.align;

  const boxWidth = (design.width / 100) * frameWidth;
  const lines = wrap(ctx, value, boxWidth);
  const lineHeight = fontPx * 1.25;
  const blockHeight = lines.length * lineHeight;
  const centerX = (design.x / 100) * frameWidth;
  const centerY = (design.y / 100) * frameHeight;
  const padX = design.background ? fontPx * 0.8 : 0;
  const padY = design.background ? fontPx * 0.6 : 0;

  if (design.background) {
    ctx.fillStyle = hexToRgba(design.backgroundColor, design.backgroundOpacity);
    ctx.fillRect(
      centerX - boxWidth / 2 - padX,
      centerY - blockHeight / 2 - padY,
      boxWidth + padX * 2,
      blockHeight + padY * 2,
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
    left: Math.max(0, centerX - boxWidth / 2 - padX),
    top: Math.max(0, centerY - blockHeight / 2 - padY),
    width: Math.min(frameWidth, boxWidth + padX * 2),
    height: Math.min(frameHeight, blockHeight + padY * 2),
  };
}
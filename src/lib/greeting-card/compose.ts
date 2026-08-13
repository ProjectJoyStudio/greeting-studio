import type { CardTextDesign } from "./types";

/**
 * A web font that has not been used on screen yet is not available to the
 * canvas, which would silently fall back to a default face in the saved and
 * downloaded card. Loading it first keeps the editor and the final picture
 * identical, also for the handwritten fonts.
 */
async function ensureFontReady(fontFamily: string, fontPx: number): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.load) return;
  try {
    await fonts.load(`${fontPx}px ${fontFamily}`, "AaЯяĄąЇї");
    await fonts.ready;
  } catch {
    // The fallback in the font stack takes over; nothing else to do.
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full || "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
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

/** Merges artwork and greeting into one final card image (PNG blob URL). */
export async function composeFinalCard(
  imageUrl: string,
  text: string,
  design: CardTextDesign,
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image_load_failed"));
    el.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 1024;
  canvas.height = img.naturalHeight || 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (text.trim()) {
    const fontPx = (design.fontSize / 100) * canvas.width;
    await ensureFontReady(design.fontFamily, fontPx);
    ctx.font = `${fontPx}px ${design.fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = design.align;

    const boxWidth = (design.width / 100) * canvas.width;
    const lines = wrap(ctx, text.trim(), boxWidth);
    const lineHeight = fontPx * 1.25;
    const blockHeight = lines.length * lineHeight;
    const centerX = (design.x / 100) * canvas.width;
    const centerY = (design.y / 100) * canvas.height;

    if (design.background) {
      ctx.fillStyle = hexToRgba(design.backgroundColor, design.backgroundOpacity);
      const padX = fontPx * 0.8;
      const padY = fontPx * 0.6;
      ctx.fillRect(
        centerX - boxWidth / 2 - padX,
        centerY - blockHeight / 2 - padY,
        boxWidth + padX * 2,
        blockHeight + padY * 2,
      );
    }

    if (design.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = fontPx * 0.35;
      ctx.shadowOffsetY = fontPx * 0.06;
    }
    ctx.fillStyle = design.color;

    const startY = centerY - blockHeight / 2 + lineHeight / 2;
    const anchorX =
      design.align === "left"
        ? centerX - boxWidth / 2
        : design.align === "right"
          ? centerX + boxWidth / 2
          : centerX;
    lines.forEach((line, i) => ctx.fillText(line, anchorX, startY + i * lineHeight));
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/png"),
  );
}

export async function downloadFinalCard(
  imageUrl: string,
  text: string,
  design: CardTextDesign,
  fileName = "project-joy-card.png",
): Promise<void> {
  const blob = await composeFinalCard(imageUrl, text, design);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
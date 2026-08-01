// Browser-side photo handling for the Personal Video Greeting section:
// automatic optimisation before anything is sent onwards, and automatic
// face finding inside a group photo.

import type { PvgFaceQuality } from "./types";

export interface OptimizedPhoto {
  base64: string;
  contentType: string;
  width: number;
  height: number;
}

const MAX_EDGE = 1024;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  return toBase64(new Uint8Array(await blob.arrayBuffer()));
}

export async function readImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("image_unreadable"));
      image.src = url;
    });
    return image;
  } finally {
    // The object stays alive long enough for decoding above.
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/**
 * Trims unnecessary megapixels: only this lightweight copy is ever sent on,
 * which keeps creation affordable. The uploaded original is stored untouched.
 */
export async function optimizeImage(
  source: HTMLImageElement | HTMLCanvasElement,
  maxEdge = MAX_EDGE,
): Promise<OptimizedPhoto> {
  const sw = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const sh = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.86),
  );
  if (!blob) throw new Error("optimize_failed");
  return { base64: await blobToBase64(blob), contentType: "image/jpeg", width, height };
}

export async function fileToBase64(file: File): Promise<string> {
  return blobToBase64(file);
}

export interface DetectedFace {
  photo: OptimizedPhoto;
  quality: PvgFaceQuality;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type FaceDetectorLike = { detect: (image: HTMLImageElement) => Promise<{ boundingBox: FaceBox }[]> };

/**
 * Finds every face on a group photo and returns one cropped portrait per
 * person. Faces that are too small to work with are marked, so the page can
 * ask for a separate photo of that person.
 */
export async function detectFaces(file: File, limit: number): Promise<DetectedFace[] | null> {
  const ctor = (window as unknown as { FaceDetector?: new (o?: unknown) => FaceDetectorLike })
    .FaceDetector;
  if (!ctor) return null;
  const image = await readImage(file);
  let boxes: FaceBox[] = [];
  try {
    const detector = new ctor({ fastMode: false, maxDetectedFaces: limit });
    boxes = (await detector.detect(image)).map((f) => f.boundingBox);
  } catch {
    return null;
  }
  if (boxes.length === 0) return [];

  const results: DetectedFace[] = [];
  for (const box of boxes.slice(0, limit)) {
    const pad = Math.max(box.width, box.height) * 0.45;
    const x = Math.max(0, box.x - pad);
    const y = Math.max(0, box.y - pad);
    const w = Math.min(image.naturalWidth - x, box.width + pad * 2);
    const h = Math.min(image.naturalHeight - y, box.height + pad * 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
    results.push({
      photo: await optimizeImage(canvas, 768),
      quality: Math.min(box.width, box.height) < 96 ? "low" : "good",
    });
  }
  return results;
}
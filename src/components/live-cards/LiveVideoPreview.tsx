import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { CardTextDesign } from "@/lib/greeting-card/types";
import {
  SAFE_MARGIN,
  clampPosition,
  drawGreeting,
} from "@/lib/live-cards/text-render";

/**
 * Live preview of a finished live greeting card: the animation with the
 * greeting on top, rendered exactly like the greeting-card preview so both
 * modules look identical. The video is always muted — Project Joy never plays
 * the sound produced by the animation engine.
 */
export function LiveVideoPreview({
  videoUrl,
  text,
  design,
  onMove,
  className = "",
  ratioClass = "aspect-video",
  showSafeArea = false,
}: {
  videoUrl: string | null;
  text: string;
  design: CardTextDesign;
  /** Enables dragging the greeting directly on the preview. */
  onMove?: (position: { x: number; y: number }) => void;
  className?: string;
  ratioClass?: string;
  /** Dashed guides for the area that is always visible on every device. */
  showSafeArea?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // The preview measures itself so the greeting is laid out with exactly the
  // same rules as the exported video file.
  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const update = () =>
      setSize({ width: node.clientWidth, height: node.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Preview and export both call drawGreeting. There is no browser/CSS text
  // layer whose wrapping, stroke or line metrics could differ from the MP4.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(size.width * scale));
    canvas.height = Math.max(1, Math.round(size.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    drawGreeting(ctx, size.width, size.height, text, design);
  }, [size.width, size.height, text, design]);

  function apply(e: ReactPointerEvent<HTMLDivElement>) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !onMove) return;
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    onMove(clampPosition(x, y, design.width));
  }

  return (
    <div
      ref={boxRef}
      className={`relative w-full overflow-hidden rounded-2xl bg-black ${ratioClass} ${className}`}
      style={{ containerType: "inline-size" }}
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-contain"
        />
      ) : null}

      {showSafeArea ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl border border-dashed border-primary/50"
          style={{
            left: `${SAFE_MARGIN}%`,
            top: `${SAFE_MARGIN}%`,
            right: `${SAFE_MARGIN}%`,
            bottom: `${SAFE_MARGIN}%`,
          }}
        />
      ) : null}

      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div
        onPointerDown={(e) => {
          if (!onMove) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          apply(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) apply(e);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        className={`absolute inset-0 select-none touch-none ${onMove ? "cursor-move" : "pointer-events-none"}`}
      />
    </div>
  );
}

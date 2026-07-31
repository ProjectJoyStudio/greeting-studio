import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { CardTextDesign } from "@/lib/greeting-card/types";
import {
  SAFE_MARGIN,
  clampPosition,
  hexToRgba,
  layoutGreeting,
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

  const layout = useMemo(
    () => layoutGreeting(size.width, size.height, text, design),
    [size.width, size.height, text, design],
  );

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

      {layout ? (
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
          className={`absolute select-none touch-none ${onMove ? "cursor-move" : ""}`}
          style={{
            left: `${layout.box.left}px`,
            top: `${layout.box.top}px`,
            width: `${layout.box.width}px`,
            height: `${layout.box.height}px`,
            padding: `${layout.padY}px ${layout.padX}px`,
            textAlign: design.align,
            color: design.color,
            fontFamily: design.fontFamily,
            fontSize: `${layout.fontPx}px`,
            lineHeight: `${layout.lineHeight}px`,
            textShadow: design.shadow ? "0 2px 10px rgba(0,0,0,0.55)" : undefined,
            WebkitTextStrokeWidth: design.outline
              ? `${Math.max(1, layout.fontPx * 0.04)}px`
              : undefined,
            WebkitTextStrokeColor: design.outline ? design.outlineColor : undefined,
            background: design.background
              ? hexToRgba(design.backgroundColor, design.backgroundOpacity)
              : undefined,
            borderRadius: design.background ? "0.6em" : undefined,
          }}
        >
          {layout.lines.map((line, i) => (
            <div key={i} style={{ whiteSpace: "pre" }}>
              {line || "\u00a0"}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

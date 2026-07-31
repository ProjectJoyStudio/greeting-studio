import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { CardTextDesign } from "@/lib/greeting-card/types";
import { SAFE_MARGIN, clampPosition, hexToRgba } from "@/lib/live-cards/text-render";

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

      {text.trim() ? (
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
            left: `${design.x}%`,
            top: `${design.y}%`,
            width: `${design.width}%`,
            transform: "translate(-50%, -50%)",
            textAlign: design.align,
            color: design.color,
            fontFamily: design.fontFamily,
            fontSize: `${design.fontSize}cqw`,
            lineHeight: 1.25,
            whiteSpace: "pre-wrap",
            textShadow: design.shadow ? "0 2px 10px rgba(0,0,0,0.55)" : undefined,
            WebkitTextStrokeWidth: design.outline ? `${design.fontSize * 0.04}cqw` : undefined,
            WebkitTextStrokeColor: design.outline ? design.outlineColor : undefined,
            background: design.background
              ? hexToRgba(design.backgroundColor, design.backgroundOpacity)
              : undefined,
            padding: design.background ? "0.6em 0.8em" : undefined,
            borderRadius: design.background ? "0.6em" : undefined,
          }}
        >
          {text}
        </div>
      ) : null}
    </div>
  );
}

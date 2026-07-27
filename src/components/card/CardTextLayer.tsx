// ---------------------------------------------------------------------------
// Shared greeting-text renderer.
//
// The admin preview, the public catalog and the exported image all render
// through this component, so what an administrator approves is exactly what
// the recipient sees. Layout happens in reference space and is then uniformly
// scaled to the container, which keeps every size pixel-proportional.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { TextDesign } from "@/lib/admin/catalog-mgmt/types";
import { REF_WIDTH, layoutCardText, safeAreaFor, type FitResult } from "@/lib/text-fit/engine";

export function useCardTextLayout(
  text: string,
  design: TextDesign,
  refHeight: number,
  autoFit: boolean,
): FitResult {
  const compute = () => layoutCardText({ text, design, refHeight, autoFit });
  const [result, setResult] = useState<FitResult>(compute);

  useLayoutEffect(() => {
    setResult(compute());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, refHeight, autoFit, JSON.stringify(design)]);

  // Web fonts change advance widths — refit once they are ready.
  useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) setResult(compute());
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, refHeight, autoFit, JSON.stringify(design)]);

  return result;
}

export function CardTextLayer({
  text,
  design,
  refHeight,
  autoFit = true,
  showSafeArea = false,
  onLayout,
}: {
  text: string;
  design: TextDesign;
  refHeight: number;
  autoFit?: boolean;
  /** Editor-only guide. Never rendered in the public catalog or on export. */
  showSafeArea?: boolean;
  onLayout?: (fit: FitResult) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  const fit = useCardTextLayout(text, design, refHeight, autoFit);
  const safe = safeAreaFor(refHeight);

  useEffect(() => {
    onLayout?.(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit]);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / REF_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        style={{
          width: REF_WIDTH,
          height: refHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {showSafeArea && (
          <div
            data-safe-area="true"
            style={{
              position: "absolute",
              left: safe.x,
              top: safe.y,
              width: safe.width,
              height: safe.height,
              border: "2px dashed rgba(255,255,255,.75)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,.12) inset",
              borderRadius: 12,
            }}
          />
        )}
        {fit.lines.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: fit.x,
              top: fit.y,
              width: fit.width,
              height: fit.height,
              transform: `rotate(${design.rotation}deg)`,
              transformOrigin: "center center",
            }}
          >
            {design.backgroundOverlay > 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: -16,
                  borderRadius: 16,
                  background: `rgba(0,0,0,${design.backgroundOverlay / 100})`,
                }}
              />
            )}
            <div
              style={{
                position: "relative",
                color: design.textColor,
                fontFamily: `"${design.fontFamily}", serif`,
                fontSize: fit.fontSize,
                fontWeight: design.fontWeight,
                lineHeight: fit.lineHeight,
                textAlign: design.alignment,
                textShadow: design.textShadow ? "0 2px 12px rgba(0,0,0,.55)" : "none",
                whiteSpace: "pre",
              }}
            >
              {fit.lines.map((line, i) => (
                <div key={`${i}-${line}`}>{line || "\u00a0"}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
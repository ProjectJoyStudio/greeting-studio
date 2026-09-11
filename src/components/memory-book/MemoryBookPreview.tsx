import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hexToRgba } from "@/components/greeting-card/CardPreview";
import { useI18n } from "@/lib/i18n";
import { loadMemoryBookMusic, setMemoryBookMusicPlayback } from "@/lib/memory-book/music.functions";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MemoryBookMaterial } from "@/lib/memory-book/materials";
import { loadMemoryBookMaterials } from "@/lib/memory-book/materials.functions";
import type { MemoryBookDecoration } from "@/lib/memory-book/decorations";
import { listMemoryBookDecorations } from "@/lib/memory-book/decorations.functions";
import {
  clampFrame,
  clampTextDesign,
  clampVideoFrame,
  emptySlot,
  findLayout,
  type MemoryBookFrame,
  type MemoryBookPage,
  type MemoryBookPhotoSlot,
} from "@/lib/memory-book/pages";
import { loadMemoryBookPages } from "@/lib/memory-book/pages.functions";
import { loadMemoryBookDesigns } from "@/lib/memory-book/designs.functions";
import {
  loadMemoryBookLeafOrder,
  saveMemoryBookLeafOrder,
} from "@/lib/memory-book/leaf-order.functions";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

type Face =
  /** The front cover, with the composition the customer placed on it. */
  | { kind: "cover"; page: MemoryBookPage | null }
  | { kind: "page"; page: MemoryBookPage; number: number }
  /** The back cover: the very last physical face of the book. */
  | { kind: "back"; page: MemoryBookPage | null }
  | { kind: "blank" };

/** The photo composition of a page — exactly as it was arranged in the editor. */
function PhotoComposition({
  layoutId,
  slots,
  frame,
  photos,
}: {
  layoutId: string | null;
  slots: MemoryBookPhotoSlot[];
  frame: MemoryBookFrame;
  photos: MemoryBookMaterial[];
}) {
  const layout = findLayout(layoutId);
  if (!layout) return null;
  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `translate(${frame.x}%, ${frame.y}%) scale(${frame.scale})`,
        transformOrigin: "center center",
      }}
    >
      {layout.areas.map((area, i) => {
        const slot = slots[i] ?? emptySlot();
        const photo = photos.find((p) => p.id === slot.materialId) ?? null;
        return (
          <div
            key={i}
            className="absolute overflow-hidden rounded-md"
            style={{
              left: `${area.left}%`,
              top: `${area.top}%`,
              width: `${area.width}%`,
              height: `${area.height}%`,
            }}
          >
            {photo ? (
              <img
                src={photo.url}
                alt=""
                draggable={false}
                className="h-full w-full select-none object-cover"
                style={{
                  transform: `translate(${slot.offsetX * 100}%, ${slot.offsetY * 100}%) scale(${slot.scale})`,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Everything the finger does on a page video belongs to the video alone: the
 * book underneath must never see it, so it can neither turn nor drag. A second
 * tap within 400 ms opens the existing full-screen video.
 */
function VideoTouchGuard({
  onOpen,
  children,
  className,
  style,
}: {
  onOpen: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lastTap = { time: 0 };
    const swallow = (e: Event) => e.stopPropagation();
    const onTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastTap.time < 400) {
        lastTap.time = 0;
        if (e.cancelable) e.preventDefault();
        openRef.current();
        return;
      }
      lastTap.time = now;
    };
    const events: Array<[string, EventListener, AddEventListenerOptions?]> = [
      ["mousedown", swallow],
      ["mouseup", swallow],
      ["click", swallow],
      ["pointerdown", swallow],
      ["pointerup", swallow],
      ["touchstart", swallow, { passive: true }],
      ["touchmove", swallow, { passive: true }],
      ["touchend", onTouchEnd as EventListener, { passive: false }],
    ];
    for (const [name, handler, options] of events)
      el.addEventListener(name, handler, options);
    return () => {
      for (const [name, handler] of events) el.removeEventListener(name, handler);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * The gesture layer of one page face.
 *
 * Mouse (unchanged): a press that never moves belongs to the page, a second
 * click within 400 ms enlarges it, a press that moves drags the leaf.
 *
 * Touch: one tap turns the page, a second tap within 300 ms cancels that
 * pending turn and enlarges the page instead, and any finger movement drops
 * both and lets the book's own physical turn take over.
 */
function PhotoTapLayer({
  label,
  canOpen,
  onOpen,
  onTurn,
  onCancelTurn,
}: {
  label: string;
  canOpen: boolean;
  onOpen: () => void;
  onTurn: (direction: -1 | 1) => void;
  onCancelTurn: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const lastTap = useRef(0);
  const lastTouch = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  const canOpenRef = useRef(canOpen);
  canOpenRef.current = canOpen;
  const cancelRef = useRef(onCancelTurn);
  cancelRef.current = onCancelTurn;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clearPending = () => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
    };

    const begin = (x: number, y: number) => {
      start.current = { x, y };
      moved.current = false;
    };
    const track = (x: number, y: number) => {
      const s = start.current;
      if (!s) return;
      if (Math.abs(x - s.x) > 8 || Math.abs(y - s.y) > 8) {
        moved.current = true;
        // Movement is a page-turn gesture: nothing may be waiting to fire.
        clearPending();
        lastTap.current = 0;
      }
    };
    /**
     * A mouse press that never moved is page business only. The started press
     * is cancelled inside the turn engine itself, so no turn can be waiting to
     * happen later — for example while the enlarged page is being closed.
     */
    const finish = () => {
      if (!start.current) return;
      start.current = null;
      if (moved.current) return;
      cancelRef.current();
      const now = Date.now();
      if (now - lastTap.current < 400) {
        lastTap.current = 0;
        if (canOpenRef.current) openRef.current();
      } else {
        lastTap.current = now;
      }
    };

    const onMouseDown = (e: MouseEvent) => begin(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => track(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => {
      lastTouch.current = Date.now();
      // A second finger press cancels the turn the first tap was waiting for.
      clearPending();
      const t = e.changedTouches[0];
      if (t) begin(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (t) track(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!start.current) return;
      const point = e.changedTouches[0];
      start.current = null;
      if (moved.current) return;
      // A still finger is ours: the book's own tap handling must not see it.
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      cancelRef.current();
      const now = Date.now();
      if (now - lastTap.current < 300) {
        lastTap.current = 0;
        clearPending();
        if (canOpenRef.current) openRef.current();
        return;
      }
      lastTap.current = now;
      const rect = el.getBoundingClientRect();
      const x = point?.clientX ?? rect.left + rect.width / 2;
      const direction: -1 | 1 = x < rect.left + rect.width / 2 ? -1 : 1;
      pending.current = setTimeout(() => {
        pending.current = null;
        turnRef.current(direction);
      }, 300);
    };
    // A click that follows a tap is the browser's echo of that same tap.
    const swallowClick = (e: Event) => {
      e.stopPropagation();
      if (Date.now() - lastTouch.current < 800) e.preventDefault();
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", finish);
    el.addEventListener("click", swallowClick);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      clearPending();
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", finish);
      el.removeEventListener("click", swallowClick);
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return <div ref={ref} role="presentation" aria-label={label} className="absolute inset-0" />;
}



/** One face of the book: the cover, one saved internal page, or the back. */
function BookFace({
  face,
  coverUrl,
  backCoverUrl,
  leafBackgroundUrl,
  photos,
  videos,
  library,
  onOpenPhotos,
  onOpenVideo,
  onTurn,
  onCancelTurn,
}: {
  face: Face;
  coverUrl: string | null;
  backCoverUrl: string | null;
  leafBackgroundUrl: string | null;
  photos: MemoryBookMaterial[];
  videos: MemoryBookMaterial[];
  library: MemoryBookDecoration[];
  onOpenPhotos?: (page: MemoryBookPage) => void;
  onOpenVideo?: (url: string) => void;
  onTurn: (direction: -1 | 1) => void;
  onCancelTurn: () => void;
}) {
  const { t } = useI18n();

  if ((face.kind === "cover" || face.kind === "back") && !face.page) {
    const url = face.kind === "back" ? backCoverUrl : coverUrl;
    return (
      <div
        className="relative h-full w-full bg-muted"
        style={{
          backgroundImage: url ? `url(${url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <PhotoTapLayer
          label={t("mbpv_open_photos")}
          canOpen={false}
          onOpen={() => undefined}
          onTurn={onTurn}
          onCancelTurn={onCancelTurn}
        />
      </div>
    );
  }

  if (face.kind === "blank") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/60 text-sm text-muted-foreground">
        {t("mbpv_end")}
      </div>
    );
  }

  const page = face.page!;
  const background =
    face.kind === "cover"
      ? coverUrl
      : face.kind === "back"
        ? backCoverUrl
        : (page.backgroundUrl ?? leafBackgroundUrl ?? null);
  const textDesign = clampTextDesign(page.textDesign);
  const frame = clampFrame(page.frame);
  const videoFrame = clampVideoFrame(page.videoFrame);
  const video = videos.find((v) => v.id === page.videoMaterialId) ?? null;
  const hasPhotos = Boolean(findLayout(page.layout));

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-card"
      style={{
        containerType: "inline-size",
        backgroundImage: background ? `url(${background})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {hasPhotos ? (
        <PhotoComposition
          layoutId={page.layout}
          slots={page.slots}
          frame={frame}
          photos={photos}
        />
      ) : null}
      <PhotoTapLayer
        label={t("mbpv_open_photos")}
        canOpen={Boolean(hasPhotos && onOpenPhotos)}
        onOpen={() => {
          if (onOpenPhotos) onOpenPhotos(page);
        }}
        onTurn={onTurn}
        onCancelTurn={onCancelTurn}
      />


      {page.text.trim() ? (
        <div
          className="pointer-events-none absolute select-none"
          style={{
            left: `${textDesign.x}%`,
            top: `${textDesign.y}%`,
            width: `${textDesign.width}%`,
            transform: "translate(-50%, -50%)",
            textAlign: textDesign.align,
            color: textDesign.color,
            fontFamily: textDesign.fontFamily,
            fontSize: `${textDesign.fontSize}cqw`,
            lineHeight: 1.25,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            textShadow: textDesign.shadow ? "0 2px 10px rgba(0,0,0,0.55)" : undefined,
            WebkitTextStroke: textDesign.outline ? `0.02em ${textDesign.outlineColor}` : undefined,
            background: textDesign.background
              ? hexToRgba(textDesign.backgroundColor, textDesign.backgroundOpacity)
              : undefined,
            padding: textDesign.background ? "0.6em 0.8em" : undefined,
            borderRadius: textDesign.background ? "0.6em" : undefined,
          }}
        >
          {page.text}
        </div>
      ) : null}

      {video ? (
        <div
          className="absolute overflow-hidden rounded-xl bg-black shadow-lg"
          style={{
            left: `${videoFrame.x}%`,
            top: `${videoFrame.y}%`,
            width: `${videoFrame.width}%`,
            height: `${videoFrame.height}%`,
          }}
        >
          <video
            src={video.url}
            preload="metadata"
            playsInline
            muted
            className="pointer-events-none h-full w-full bg-black object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <button
              type="button"
              aria-label={t("mbpv_play")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-background/85"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenVideo?.(video.url);
              }}
            >
              <Play className="h-6 w-6" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {page.decorations.map((item) => {
        const source = library.find((d) => d.id === item.decorationId);
        if (!source?.url) return null;
        return (
          <div
            key={item.id}
            className="pointer-events-none absolute"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.size}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
            }}
          >
            {item.color && source.fileType === "svg" ? (
              <>
                <img src={source.url} alt="" draggable={false} className="block w-full opacity-0" />
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundColor: item.color,
                    WebkitMaskImage: `url(${source.url})`,
                    maskImage: `url(${source.url})`,
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                />
              </>
            ) : (
              <img src={source.url} alt={source.name} draggable={false} className="block w-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}

type FlipBookApi = {
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
  /** Ends a started press WITHOUT turning anything (second argument = handled). */
  userStop?: (point: { x: number; y: number }, handled?: boolean) => void;
  getUI?: () => { touchPoint?: unknown } | null;
};

/**
 * Interactive preview of the assembled Memory Book. It only READS the saved
 * state of the customer's book: nothing is generated, charged, completed or
 * changed here, apart from the order of the leaves the customer chooses.
 */
export function MemoryBookPreview({ bookId }: { bookId: string }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const loadPages = useServerFn(loadMemoryBookPages);
  const loadMaterials = useServerFn(loadMemoryBookMaterials);
  const loadLibrary = useServerFn(listMemoryBookDecorations);
  const loadDesigns = useServerFn(loadMemoryBookDesigns);
  const loadOrder = useServerFn(loadMemoryBookLeafOrder);
  const loadMusic = useServerFn(loadMemoryBookMusic);
  const saveMusicPlayback = useServerFn(setMemoryBookMusicPlayback);
  const saveOrder = useServerFn(saveMemoryBookLeafOrder);

  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [pages, setPages] = useState<Record<number, MemoryBookPage>>({});
  const [materials, setMaterials] = useState<MemoryBookMaterial[]>([]);
  const [library, setLibrary] = useState<MemoryBookDecoration[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [backCoverUrl, setBackCoverUrl] = useState<string | null>(null);
  const [leafBackgroundUrl, setLeafBackgroundUrl] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [photoPage, setPhotoPage] = useState<MemoryBookPage | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [position, setPosition] = useState(0);
  const [width, setWidth] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(0);
  const [Flip, setFlip] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  // Background music of this exact book: one composition, playing in a loop.
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.35);
  const music = useRef<HTMLAudioElement | null>(null);
  const musicOnRef = useRef(true);
  const musicVolumeRef = useRef(0.35);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const book = useRef<{ pageFlip: () => FlipBookApi } | null>(null);
  const overlay = useRef<HTMLDivElement | null>(null);
  // While a photo or video is enlarged the book is frozen: it must not react
  // to any movement happening above it.
  const frozen = photoPage !== null || videoUrl !== null;
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  musicOnRef.current = musicOn;
  musicVolumeRef.current = musicVolume;

  /**
   * Cancels any started press inside the book so nothing can turn later. The
   * turn engine is told the gesture was already handled, which drops it
   * without moving the book by even one leaf.
   */
  const settleBook = useCallback(() => {
    const api = book.current?.pageFlip?.();
    if (!api) return;
    try {
      api.userStop?.({ x: 0, y: 0 }, true);
      const ui = api.getUI?.();
      if (ui && typeof ui === "object" && "touchPoint" in ui) {
        (ui as { touchPoint: unknown }).touchPoint = null;
      }
    } catch {
      /* the engine is not ready yet — there is nothing pending to cancel */
    }
  }, []);

  // Every pointer or touch signal that does not belong to the enlarged view is
  // swallowed before the page-turn engine can see it.
  useEffect(() => {
    if (!frozen) return;
    settleBook();
    const block = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && overlay.current?.contains(target)) return;
      e.stopImmediatePropagation();
      e.stopPropagation();
    };
    const types = [
      "mousedown",
      "mousemove",
      "mouseup",
      "click",
      "touchstart",
      "touchmove",
      "touchend",
      "wheel",
    ];
    for (const type of types) window.addEventListener(type, block, true);
    return () => {
      for (const type of types) window.removeEventListener(type, block, true);
      // Closing the enlarged view must leave nothing pending either.
      settleBook();
    };
  }, [frozen, settleBook]);

  // The real page-turn engine touches the DOM, so it is only loaded in the
  // browser, after hydration.
  useEffect(() => {
    let alive = true;
    void import("react-pageflip").then((mod) => {
      if (alive) setFlip(() => mod.default as unknown as React.ComponentType<Record<string, unknown>>);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The book is scaled to the space available, keeping the page proportions.
  // Both the free width and the free height below the header are measured, so
  // a phone held sideways still shows the whole book without scrolling.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;

    const measure = () => {
      setWidth(el.clientWidth);
      const rect = el.getBoundingClientRect();
      const vv = typeof window !== "undefined" ? window.visualViewport : null;
      const viewH = vv?.height ?? window.innerHeight;
      // Space kept for the buttons under the book; the book is expected to sit
      // right below the header, so a long scroll position is ignored.
      const top = Math.max(0, Math.min(rect.top, 96));
      setAvailableHeight(Math.max(220, Math.round(viewH - top - 130)));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [ready]);

  // Turning a leaf by hand should not require dragging it across the whole
  // book: after a short, clear drag, letting go finishes the turn. The leaf
  // itself still follows the finger or mouse exactly as before.
  useEffect(() => {
    const el = wrapper.current;
    if (!el || !ready) return;

    let from: { x: number; y: number } | null = null;
    let now: { x: number; y: number } | null = null;

    const point = (e: Event) => {
      const touch = (e as TouchEvent).changedTouches?.[0];
      if (touch) return { x: touch.clientX, y: touch.clientY };
      const mouse = e as MouseEvent;
      return { x: mouse.clientX, y: mouse.clientY };
    };

    const onDown = (e: Event) => {
      if (frozenRef.current) return;
      if (!(e.target instanceof Node) || !el.contains(e.target)) return;
      from = point(e);
      now = from;
    };
    const onMove = (e: Event) => {
      if (from) now = point(e);
    };
    const onUp = (e: Event) => {
      const started = from;
      const ended = now;
      from = null;
      now = null;
      if (!started || !ended || frozenRef.current) return;
      const dx = ended.x - started.x;
      const dy = ended.y - started.y;
      if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx) * 1.5) return;
      const page = el.querySelector(".stf__parent");
      if (!page) return;
      const rect = page.getBoundingClientRect();
      // Nudge the book's own physics past its commit point, so the turn it is
      // already animating simply finishes.
      const x = dx < 0 ? rect.left - 60 : rect.right + 60;
      const type = (e as TouchEvent).changedTouches ? "touchmove" : "mousemove";
      const synthetic = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(synthetic, "clientX", { value: x });
      Object.defineProperty(synthetic, "clientY", { value: ended.y });
      Object.defineProperty(synthetic, "changedTouches", {
        value: [{ clientX: x, clientY: ended.y }],
      });
      window.dispatchEvent(synthetic);
    };

    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("touchstart", onDown, true);
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("touchmove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
    window.addEventListener("touchend", onUp, true);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("touchstart", onDown, true);
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("touchmove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      window.removeEventListener("touchend", onUp, true);
    };
  }, [ready]);


  // The preview always reads the CURRENT saved book. Opening it changes
  // nothing about the project's lifecycle.
  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadPages({ data: { bookId } }),
      loadMaterials({ data: { bookId } }),
      loadLibrary({ data: undefined }),
      loadDesigns({ data: { bookId } }),
      loadOrder({ data: { bookId } }),
    ])
      .then(([p, m, d, designs, o]) => {
        if (!alive) return;
        if (p.ok) {
          const map: Record<number, MemoryBookPage> = {};
          for (const page of p.pages) map[page.pageIndex] = page;
          setPages(map);
          setOk(true);
        }
        if (m.ok) setMaterials(m.materials);
        setLibrary(d.decorations);
        const state = designs.ok ? designs.state : null;
        if (state) {
          setCoverUrl(
            state.cover.variants.find((v) => v.id === state.cover.selectedId)?.url ?? null,
          );
          setBackCoverUrl(state.backCover.url);
          setLeafBackgroundUrl(
            state.leaf.variants.find((v) => v.id === state.leaf.selectedId)?.url ?? null,
          );
        }
        if (o.ok) setOrder(o.order);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      alive = false;
    };
  }, [bookId, loadPages, loadMaterials, loadLibrary, loadDesigns, loadOrder]);

  const photos = useMemo(() => materials.filter((m) => m.kind === "photo"), [materials]);
  const videos = useMemo(() => materials.filter((m) => m.kind === "video"), [materials]);

  /** Every face of the book in the CURRENT leaf order: cover first. */
  const faces = useMemo<Face[]>(() => {
    const list: Face[] = [{ kind: "cover", page: pages[0] ?? null }];
    for (const leaf of order) {
      for (const side of [1, 2]) {
        const pageIndex = (leaf - 1) * 2 + side;
        const page = pages[pageIndex] ?? emptyLike(pageIndex);
        list.push({ kind: "page", page, number: pageIndex });
      }
    }
    // The back cover is the very last physical face of the book.
    list.push({ kind: "back", page: pages[-1] ?? null });
    if (list.length % 2 !== 0) list.splice(list.length - 1, 0, { kind: "blank" });
    return list;
  }, [order, pages]);

  const flipNext = useCallback(() => book.current?.pageFlip()?.flipNext(), []);
  const flipPrev = useCallback(() => book.current?.pageFlip()?.flipPrev(), []);

  // Automatic viewing turns the leaves with the very same page-turn animation.
  useEffect(() => {
    if (!auto || photoPage || videoUrl) return;
    const timer = window.setInterval(() => {
      if (position >= faces.length - 1) {
        setAuto(false);
        return;
      }
      flipNext();
    }, 3200);
    return () => window.clearInterval(timer);
  }, [auto, position, faces.length, flipNext, photoPage, videoUrl]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (photoPage || videoUrl) {
        if (e.key === "Escape") {
          setPhotoPage(null);
          setVideoUrl(null);
        }
        return;
      }
      if (e.key === "ArrowRight") flipNext();
      if (e.key === "ArrowLeft") flipPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipNext, flipPrev, photoPage, videoUrl]);

  // The chosen composition of this book, if there is one.
  useEffect(() => {
    let active = true;
    void loadMusic({ data: { bookId } })
      .then((res) => {
        if (!active || !res.state) return;
        setMusicUrl(res.state.selectedUrl);
        setMusicOn(res.state.enabled);
        setMusicVolume(res.state.volume);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [bookId, loadMusic]);

  // The music plays in a loop while the book is open and the sound is on.
  useEffect(() => {
    if (!musicUrl) return;
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.volume = musicVolumeRef.current;
    music.current = audio;
    return () => {
      audio.pause();
      music.current = null;
    };
  }, [musicUrl]);

  useEffect(() => {
    const audio = music.current;
    if (!audio) return;
    audio.volume = musicVolume;
  }, [musicVolume, musicUrl]);

  useEffect(() => {
    const audio = music.current;
    if (!audio) return;
    if (musicOn) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [musicOn, musicUrl]);

  // A page video always takes the sound: the music waits and then continues
  // from exactly the same moment, unless it was switched off by hand.
  useEffect(() => {
    const onPlay = (e: Event) => {
      if (!(e.target instanceof HTMLVideoElement)) return;
      music.current?.pause();
    };
    const onStop = (e: Event) => {
      if (!(e.target instanceof HTMLVideoElement)) return;
      if (!musicOnRef.current) return;
      void music.current?.play().catch(() => undefined);
    };
    document.addEventListener("play", onPlay, true);
    document.addEventListener("pause", onStop, true);
    document.addEventListener("ended", onStop, true);
    return () => {
      document.removeEventListener("play", onPlay, true);
      document.removeEventListener("pause", onStop, true);
      document.removeEventListener("ended", onStop, true);
    };
  }, []);

  // Closing the enlarged video also gives the sound back to the music.
  useEffect(() => {
    if (videoUrl || !musicOnRef.current) return;
    void music.current?.play().catch(() => undefined);
  }, [videoUrl]);

  async function moveLeaf(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
    setOrderMessage(null);
    try {
      const res = await saveOrder({ data: { bookId, order: next } });
      setOrderMessage(res.ok ? t("mbpv_order_saved") : t("mbpv_order_failed"));
      if (res.ok) setOrder(res.order);
    } catch {
      setOrderMessage(t("mbpv_order_failed"));
    }
  }

  if (!ready) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("mbpv_loading")}
      </p>
    );
  }
  if (!ok) return <p className="text-sm text-muted-foreground">{t("mbpv_not_found")}</p>;

  const faceProps = {
    coverUrl,
    backCoverUrl,
    leafBackgroundUrl,
    photos,
    videos,
    library,
    onOpenPhotos: (page: MemoryBookPage) => setPhotoPage(page),
    onOpenVideo: (url: string) => setVideoUrl(url),
    onTurn: (direction: -1 | 1) => (direction < 0 ? flipPrev() : flipNext()),

    onCancelTurn: settleBook,
  };

  // The page is limited by the free width and, just as strictly, by the free
  // height, so the whole book always stays inside the screen.
  const widthLimit = Math.min(isMobile ? width : Math.floor(width / 2), isMobile ? 420 : 460);
  const heightLimit = availableHeight > 0 ? Math.floor((availableHeight * 3) / 4) : widthLimit;
  const pageWidth = Math.max(160, Math.min(widthLimit, heightLimit));
  const pageHeight = Math.round((pageWidth * 4) / 3);




  const current = faces[position] ?? null;
  // A closed book shows the cover alone, centered; the open book is a
  // two-page spread, so the whole block slides half a page sideways.
  const closed = !isMobile && position === 0;
  const finished = !isMobile && position >= faces.length - 1;
  const shift = closed ? -pageWidth / 2 : finished ? pageWidth / 2 : 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("mbpv_hint")}</p>

      <div
        ref={wrapper}
        className={`mb-book mx-auto w-full max-w-5xl select-none ${frozen ? "pointer-events-none" : ""}`}
      >
        {Flip && width > 0 ? (
          <div
            className="transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${shift}px)` }}
          >
          <Flip
            key={`${isMobile ? "one" : "two"}-${pageWidth}-${order.join("-")}`}
            ref={book as never}
            className="mx-auto"
            style={{}}
            width={pageWidth}
            height={pageHeight}
            size="fixed"
            minWidth={220}
            maxWidth={600}
            minHeight={290}
            maxHeight={900}
            showCover
            usePortrait={isMobile}
            mobileScrollSupport
            swipeDistance={20}
            useMouseEvents
            drawShadow
            maxShadowOpacity={0.5}
            flippingTime={800}
            startPage={0}
            onFlip={(e: { data: number }) => setPosition(e.data)}
          >
            {faces.map((face, i) => (
              <div
                key={i}
                className="mb-book-page bg-card"
                data-density={i === 0 || i === faces.length - 1 ? "hard" : "soft"}
              >
                <div className="relative h-full w-full overflow-hidden">
                  <BookFace face={face} {...faceProps} />
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute inset-y-0 w-6 ${
                      i % 2 === 0
                        ? "left-0 bg-gradient-to-r from-black/25 to-transparent"
                        : "right-0 bg-gradient-to-l from-black/25 to-transparent"
                    }`}
                  />
                </div>
              </div>
            ))}
          </Flip>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("mbpv_loading")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={flipPrev}>
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            {t("mbpv_prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {current?.kind === "cover"
              ? t("mbpv_cover")
              : current?.kind === "back"
                ? t("mbpv_back_cover")
                : current?.kind === "page"
                  ? fill(t("mbpv_page"), { n: current.number })
                  : t("mbpv_end")}
          </span>
          <Button variant="outline" size="sm" onClick={flipNext}>
            {t("mbpv_next")}
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAuto((v) => !v)}>
            {auto ? (
              <>
                <Pause className="mr-1 h-4 w-4" aria-hidden />
                {t("mbpv_auto_pause")}
              </>
            ) : (
              <>
                <Play className="mr-1 h-4 w-4" aria-hidden />
                {t("mbpv_auto_play")}
              </>
            )}
          </Button>
          {musicUrl ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = !musicOn;
                  setMusicOn(next);
                  void saveMusicPlayback({ data: { bookId, enabled: next } }).catch(
                    () => undefined,
                  );
                }}
              >
                {musicOn ? t("mbpv_music_on") : t("mbpv_music_off")}
              </Button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                {t("mbpv_music_volume")}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                  onPointerUp={() =>
                    void saveMusicPlayback({ data: { bookId, volume: musicVolume } }).catch(
                      () => undefined,
                    )
                  }
                  className="h-1 w-28 cursor-pointer"
                  aria-label={t("mbpv_music_volume")}
                />
              </label>
            </>
          ) : null}
        </div>
      </div>

      {/* Order of the leaves — both pages of a leaf always move together. */}
      <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
        <h2 className="font-display text-lg font-semibold">{t("mbpv_order_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("mbpv_order_hint")}</p>
        <ul className="space-y-2">
          {order.map((leaf, index) => (
            <li
              key={leaf}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="text-sm">{fill(t("mbpv_leaf"), { n: leaf })}</span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => void moveLeaf(index, -1)}
                >
                  {t("mbpv_move_up")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={index === order.length - 1}
                  onClick={() => void moveLeaf(index, 1)}
                >
                  {t("mbpv_move_down")}
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {orderMessage ? <p className="text-sm text-muted-foreground">{orderMessage}</p> : null}
      </div>

      {/* Full-screen photo frame: the whole composition, exactly as arranged. */}
      {photoPage ? (
        <div
          ref={overlay}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
          onClick={() => setPhotoPage(null)}
        >
          <button
            type="button"
            aria-label={t("mbpv_close")}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              setPhotoPage(null);
            }}
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div
              className="relative w-full overflow-hidden rounded-2xl bg-card"
              style={{ aspectRatio: "3 / 4", containerType: "inline-size" }}
            >
              <PhotoComposition
                layoutId={photoPage.layout}
                slots={photoPage.slots}
                frame={clampFrame(photoPage.frame)}
                photos={photos}
              />
            </div>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setPhotoPage(null)}>
              <X className="mr-1 h-4 w-4" aria-hidden />
              {t("mbpv_close")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Full-screen video: the prepared video itself is never changed. */}
      {videoUrl ? (
        <div
          ref={photoPage ? undefined : overlay}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/95 p-4"
        >
          <button
            type="button"
            aria-label={t("mbpv_close")}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/70 text-white shadow-lg"
            onClick={() => setVideoUrl(null)}
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
          <video
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] w-full max-w-4xl rounded-xl bg-black"
          />
          <Button variant="secondary" onClick={() => setVideoUrl(null)}>
            <X className="mr-1 h-4 w-4" aria-hidden />
            {t("mbpv_close")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** A page slot the customer never filled still exists inside its leaf. */
function emptyLike(pageIndex: number): MemoryBookPage {
  return {
    pageIndex,
    content: "empty",
    layout: null,
    slots: [],
    frame: clampFrame(null),
    text: "",
    textDesign: clampTextDesign(null),
    videoMaterialId: null,
    videoFrame: clampVideoFrame(null),
    decorations: [],
  };
}

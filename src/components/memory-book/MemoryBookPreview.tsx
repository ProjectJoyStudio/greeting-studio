import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hexToRgba } from "@/components/greeting-card/CardPreview";
import { useI18n } from "@/lib/i18n";
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

/** One face of the book: the cover, one saved internal page, or the back. */
function BookFace({
  face,
  coverUrl,
  leafBackgroundUrl,
  photos,
  videos,
  library,
  onOpenPhotos,
  onOpenVideo,
}: {
  face: Face;
  coverUrl: string | null;
  leafBackgroundUrl: string | null;
  photos: MemoryBookMaterial[];
  videos: MemoryBookMaterial[];
  library: MemoryBookDecoration[];
  onOpenPhotos?: (page: MemoryBookPage) => void;
  onOpenVideo?: (url: string) => void;
}) {
  const { t } = useI18n();

  if (face.kind === "cover" && !face.page) {
    return (
      <div
        className="h-full w-full bg-muted"
        style={{
          backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
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
    face.kind === "cover" ? coverUrl : (page.backgroundUrl ?? leafBackgroundUrl ?? null);
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
        <>
          <PhotoComposition
            layoutId={page.layout}
            slots={page.slots}
            frame={frame}
            photos={photos}
          />
          {onOpenPhotos ? (
            <PhotoTapLayer label={t("mbpv_open_photos")} onOpen={() => onOpenPhotos(page)} />
          ) : null}
        </>
      ) : null}

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
  const saveOrder = useServerFn(saveMemoryBookLeafOrder);

  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [pages, setPages] = useState<Record<number, MemoryBookPage>>({});
  const [materials, setMaterials] = useState<MemoryBookMaterial[]>([]);
  const [library, setLibrary] = useState<MemoryBookDecoration[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [leafBackgroundUrl, setLeafBackgroundUrl] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [photoPage, setPhotoPage] = useState<MemoryBookPage | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [position, setPosition] = useState(0);
  const [width, setWidth] = useState(0);
  const [Flip, setFlip] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const book = useRef<{ pageFlip: () => FlipBookApi } | null>(null);

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
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
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
    list.push({ kind: "blank" });
    if (list.length % 2 !== 0) list.push({ kind: "blank" });
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
    leafBackgroundUrl,
    photos,
    videos,
    library,
    onOpenPhotos: (page: MemoryBookPage) => setPhotoPage(page),
    onOpenVideo: (url: string) => setVideoUrl(url),
  };

  const pageWidth = Math.max(
    220,
    Math.min(isMobile ? width : Math.floor(width / 2), isMobile ? 420 : 460),
  );
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

      <div ref={wrapper} className="mb-book mx-auto w-full max-w-5xl select-none">
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/95 p-4">
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

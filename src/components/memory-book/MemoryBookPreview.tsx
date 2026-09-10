import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Loader2, Play, X } from "lucide-react";

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
  | { kind: "cover" }
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

  if (face.kind === "cover") {
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

  const page = face.page;
  const background = page.backgroundUrl ?? leafBackgroundUrl ?? null;
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
            <button
              type="button"
              aria-label={t("mbpv_open_photos")}
              className="absolute inset-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenPhotos(page);
              }}
            />
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
  const [turned, setTurned] = useState(0);
  const [flip, setFlip] = useState<"forward" | "backward" | null>(null);
  const [photoPage, setPhotoPage] = useState<MemoryBookPage | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

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
    const list: Face[] = [{ kind: "cover" }];
    for (const leaf of order) {
      for (const side of [1, 2]) {
        const pageIndex = (leaf - 1) * 2 + side;
        const page = pages[pageIndex];
        list.push(
          page
            ? { kind: "page", page, number: pageIndex }
            : {
                kind: "page",
                page: { ...(pages[pageIndex] ?? emptyLike(pageIndex)) },
                number: pageIndex,
              },
        );
      }
    }
    list.push({ kind: "blank" });
    return list;
  }, [order, pages]);

  /** Sheets of the book: each one has a front and a back face. */
  const sheets = useMemo(() => {
    const out: { front: Face; back: Face }[] = [];
    for (let i = 0; i < faces.length; i += 2) {
      out.push({ front: faces[i]!, back: faces[i + 1] ?? { kind: "blank" } });
    }
    return out;
  }, [faces]);

  const canForward = turned < sheets.length && !flip;
  const canBackward = turned > 0 && !flip;

  const turnForward = useCallback(() => {
    if (turned >= sheets.length || flip) return;
    setFlip("forward");
    window.setTimeout(() => {
      setTurned((n) => n + 1);
      setFlip(null);
    }, 620);
  }, [turned, sheets.length, flip]);

  const turnBackward = useCallback(() => {
    if (turned <= 0 || flip) return;
    setFlip("backward");
    window.setTimeout(() => {
      setTurned((n) => n - 1);
      setFlip(null);
    }, 620);
  }, [turned, flip]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (photoPage || videoUrl) return;
      if (e.key === "ArrowRight") turnForward();
      if (e.key === "ArrowLeft") turnBackward();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turnForward, turnBackward, photoPage, videoUrl]);

  async function moveLeaf(position: number, direction: -1 | 1) {
    const next = [...order];
    const target = position + direction;
    if (target < 0 || target >= next.length) return;
    [next[position], next[target]] = [next[target]!, next[position]!];
    setOrder(next);
    setTurned(0);
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

  const leftFace = turned > 0 ? sheets[turned - 1]!.back : null;
  const rightFace = turned < sheets.length ? sheets[turned]!.front : null;
  const flipSheet =
    flip === "forward" ? sheets[turned] : flip === "backward" ? sheets[turned - 1] : null;

  const faceProps = {
    coverUrl,
    leafBackgroundUrl,
    photos,
    videos,
    library,
    onOpenPhotos: (page: MemoryBookPage) => setPhotoPage(page),
    onOpenVideo: (url: string) => setVideoUrl(url),
  };

  const panel = "relative overflow-hidden rounded-xl bg-card shadow-sm";

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("mbpv_hint")}</p>

      <div
        className="mx-auto w-full max-w-5xl select-none"
        style={{ perspective: "2000px" }}
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
          if (dx < 0) turnForward();
          else turnBackward();
        }}
      >
        <div
          className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {!isMobile ? (
            <div className={panel} style={{ aspectRatio: "3 / 4" }}>
              {leftFace && !(flip === "backward") ? (
                <BookFace face={leftFace} {...faceProps} />
              ) : (
                <div className="h-full w-full bg-muted/40" />
              )}
            </div>
          ) : null}

          <div className={panel} style={{ aspectRatio: "3 / 4" }}>
            {isMobile ? (
              leftFace && rightFace === null ? (
                <BookFace face={leftFace} {...faceProps} />
              ) : rightFace && flip !== "forward" ? (
                <BookFace face={rightFace} {...faceProps} />
              ) : (
                <div className="h-full w-full bg-muted/40" />
              )
            ) : rightFace && flip !== "forward" ? (
              <BookFace face={rightFace} {...faceProps} />
            ) : (
              <div className="h-full w-full bg-muted/40" />
            )}

            {/* The turning sheet itself. */}
            {flipSheet ? (
              <div
                className="absolute inset-0"
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: flip === "forward" ? "left center" : "right center",
                  transition: "transform 600ms ease-in-out",
                  transform:
                    flip === "forward" ? "rotateY(-170deg)" : "rotateY(0deg)",
                  animation: undefined,
                  zIndex: 20,
                }}
              >
                <div className="absolute inset-0 overflow-hidden rounded-xl" style={{ backfaceVisibility: "hidden" }}>
                  <BookFace
                    face={flip === "forward" ? flipSheet.front : flipSheet.back}
                    {...faceProps}
                    onOpenPhotos={undefined}
                    onOpenVideo={undefined}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={!canBackward} onClick={turnBackward}>
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            {t("mbpv_prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {turned === 0
              ? t("mbpv_cover")
              : rightFace && rightFace.kind === "page"
                ? fill(t("mbpv_page"), { n: rightFace.number })
                : t("mbpv_end")}
          </span>
          <Button variant="outline" size="sm" disabled={!canForward} onClick={turnForward}>
            {t("mbpv_next")}
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Order of the leaves — both pages of a leaf always move together. */}
      <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
        <h2 className="font-display text-lg font-semibold">{t("mbpv_order_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("mbpv_order_hint")}</p>
        <ul className="space-y-2">
          {order.map((leaf, position) => (
            <li
              key={leaf}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="text-sm">{fill(t("mbpv_leaf"), { n: leaf })}</span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={position === 0}
                  onClick={() => void moveLeaf(position, -1)}
                >
                  {t("mbpv_move_up")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={position === order.length - 1}
                  onClick={() => void moveLeaf(position, 1)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4">
          <div className="relative w-full max-w-3xl">
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

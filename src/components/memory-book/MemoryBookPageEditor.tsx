import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hexToRgba } from "@/components/greeting-card/CardPreview";
import { TextStylePanel } from "@/components/greeting-card/TextStylePanel";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import type { MemoryBookMaterial } from "@/lib/memory-book/materials";
import { loadMemoryBookMaterials } from "@/lib/memory-book/materials.functions";
import type { CardTextDesign } from "@/lib/greeting-card/types";
import {
  MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS,
  clampFrame,
  clampTextDesign,
  clampSlot,
  defaultFrame,
  emptyPage,
  emptySlot,
  findLayout,
  layoutsForCount,
  type MemoryBookFrame,
  type MemoryBookPage,
  type MemoryBookPageContent,
  type MemoryBookPhotoSlot,
} from "@/lib/memory-book/pages";
import {
  loadMemoryBookPages,
  saveMemoryBookPage,
} from "@/lib/memory-book/pages.functions";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

/** One photo area: the photo can be moved and zoomed, but never leaves it. */
function PhotoArea({
  slot,
  photo,
  onChange,
  disabled,
}: {
  slot: MemoryBookPhotoSlot;
  photo: MemoryBookMaterial | null;
  onChange: (next: MemoryBookPhotoSlot) => void;
  disabled?: boolean;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());

  const move = (dx: number, dy: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    onChange(
      clampSlot({
        ...slot,
        offsetX: slot.offsetX + dx / rect.width,
        offsetY: slot.offsetY + dy / rect.height,
      }),
    );
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || !photo) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (points.current.size === 1) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    if (points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: slot.scale };
      drag.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || !photo || !points.current.has(e.pointerId)) return;
    e.preventDefault();
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && points.current.size >= 2) {
      const [a, b] = [...points.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.distance > 0) {
        onChange(
          clampSlot({ ...slot, scale: pinch.current.scale * (distance / pinch.current.distance) }),
        );
      }
      return;
    }
    if (drag.current && drag.current.id === e.pointerId) {
      move(e.clientX - drag.current.x, e.clientY - drag.current.y);
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    points.current.delete(e.pointerId);
    if (points.current.size < 2) pinch.current = null;
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  return (
    <div
      ref={box}
      className="absolute overflow-hidden rounded-lg border border-border/60 bg-muted/40"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={(e) => {
        if (disabled || !photo) return;
        onChange(clampSlot({ ...slot, scale: slot.scale * (e.deltaY < 0 ? 1.06 : 0.94) }));
      }}
      data-photo-area
    >
      {photo ? (
        <img
          src={photo.url}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full select-none object-cover"
          style={{
            transform: `translate(${slot.offsetX * 100}%, ${slot.offsetY * 100}%) scale(${slot.scale})`,
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Manual editor of the internal pages of ONE purchased Memory Book. It only
 * arranges material that already belongs to this book — nothing is generated
 * and nothing is charged here.
 */
export function MemoryBookPageEditor({
  bookId,
  leafBackgroundUrl,
}: {
  bookId: string;
  leafBackgroundUrl?: string | null;
}) {
  const { t } = useI18n();
  const loadPages = useServerFn(loadMemoryBookPages);
  const savePage = useServerFn(saveMemoryBookPage);
  const loadMaterials = useServerFn(loadMemoryBookMaterials);

  const [pages, setPages] = useState<Record<number, MemoryBookPage>>({});
  const [total, setTotal] = useState(0);
  const [videoCapacity, setVideoCapacity] = useState(0);
  const [materials, setMaterials] = useState<MemoryBookMaterial[]>([]);
  const [index, setIndex] = useState(1);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  /** Which of the two independent adjustments the customer is making. */
  const [mode, setMode] = useState<"frame" | "photo">("photo");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageBox = useRef<HTMLDivElement | null>(null);
  const frameDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const framePinch = useRef<{ distance: number; scale: number } | null>(null);
  const framePoints = useRef(new Map<number, { x: number; y: number }>());
  const textDrag = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadPages({ data: { bookId } }), loadMaterials({ data: { bookId } })])
      .then(([p, m]) => {
        if (!alive) return;
        if (p.ok) {
          const map: Record<number, MemoryBookPage> = {};
          for (const page of p.pages) map[page.pageIndex] = page;
          setPages(map);
          setTotal(p.internalPages);
          setVideoCapacity(p.videoCapacity);
        }
        if (m.ok) setMaterials(m.materials);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      alive = false;
    };
  }, [bookId, loadPages, loadMaterials]);

  const page = pages[index] ?? emptyPage(index);
  const photos = useMemo(() => materials.filter((m) => m.kind === "photo"), [materials]);
  const videos = useMemo(() => materials.filter((m) => m.kind === "video"), [materials]);
  const videoPagesUsed = useMemo(
    () => Object.values(pages).filter((p) => p.content === "video").length,
    [pages],
  );

  /** Stores the page after a short pause — there is no manual save button. */
  const persist = useCallback(
    (next: MemoryBookPage) => {
      setPages((prev) => ({ ...prev, [next.pageIndex]: next }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setSaving(true);
        setError(null);
        savePage({ data: { bookId, page: next } })
          .then((res) => {
            if (!res.ok) {
              setError(
                res.error === "video_capacity"
                  ? t("mbe_video_capacity_full")
                  : res.error === "video_too_long"
                    ? t("mbe_video_too_long")
                    : t("mbe_save_failed"),
              );
            } else if (res.page) {
              setPages((prev) => ({ ...prev, [res.page!.pageIndex]: res.page! }));
            }
          })
          .catch(() => setError(t("mbe_save_failed")))
          .finally(() => setSaving(false));
      }, 600);
    },
    [bookId, savePage, t],
  );

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  if (!ready) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      </p>
    );
  }

  const layout = findLayout(page.layout);
  const photoCount = layout?.count ?? 0;
  const frame = clampFrame(page.frame ?? defaultFrame());
  const textDesign = clampTextDesign(page.textDesign);

  /** Look and position of the page text; the page design itself is untouched. */
  function setTextDesign(patch: Partial<CardTextDesign>) {
    persist({ ...page, textDesign: clampTextDesign({ ...textDesign, ...patch }) });
  }

  function onTextPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    textDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function onTextPointerMove(e: React.PointerEvent) {
    if (!textDrag.current || textDrag.current.id !== e.pointerId) return;
    // The page box is the direct parent of the text block, so dragging works
    // identically in the small working preview and in the large preview.
    const rect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    e.preventDefault();
    const dx = ((e.clientX - textDrag.current.x) / rect.width) * 100;
    const dy = ((e.clientY - textDrag.current.y) / rect.height) * 100;
    textDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    setTextDesign({ x: textDesign.x + dx, y: textDesign.y + dy });
  }


  function onTextPointerUp(e: React.PointerEvent) {
    if (textDrag.current?.id === e.pointerId) textDrag.current = null;
  }

  /** Stores position and size of the WHOLE composition; photo crops untouched. */
  function setFrame(next: MemoryBookFrame) {
    persist({ ...page, frame: clampFrame(next) });
  }

  function onFramePointerDown(e: React.PointerEvent) {
    if (mode !== "frame") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    framePoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (framePoints.current.size === 1) {
      frameDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
    if (framePoints.current.size === 2) {
      const [a, b] = [...framePoints.current.values()];
      framePinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: frame.scale };
      frameDrag.current = null;
    }
  }

  function onFramePointerMove(e: React.PointerEvent) {
    if (mode !== "frame" || !framePoints.current.has(e.pointerId)) return;
    e.preventDefault();
    framePoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = pageBox.current?.getBoundingClientRect();
    if (!rect) return;
    if (framePinch.current && framePoints.current.size >= 2) {
      const [a, b] = [...framePoints.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (framePinch.current.distance > 0) {
        setFrame({
          ...frame,
          scale: framePinch.current.scale * (distance / framePinch.current.distance),
        });
      }
      return;
    }
    if (frameDrag.current && frameDrag.current.id === e.pointerId) {
      const dx = ((e.clientX - frameDrag.current.x) / rect.width) * 100;
      const dy = ((e.clientY - frameDrag.current.y) / rect.height) * 100;
      setFrame({ ...frame, x: frame.x + dx, y: frame.y + dy });
      frameDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  }

  function onFramePointerUp(e: React.PointerEvent) {
    framePoints.current.delete(e.pointerId);
    if (framePoints.current.size < 2) framePinch.current = null;
    if (frameDrag.current?.id === e.pointerId) frameDrag.current = null;
  }


  function setContent(content: MemoryBookPageContent) {
    if (content === "video" && page.content !== "video" && videoPagesUsed >= videoCapacity) {
      setError(t("mbe_video_capacity_full"));
      return;
    }
    if (content === "photos") {
      const first = layoutsForCount(1)[0];
      persist({
        ...page,
        content,
        layout: page.layout ?? first?.id ?? null,
        slots: page.slots.length ? page.slots : [emptySlot()],
        videoMaterialId: null,
      });
      return;
    }
    persist({
      ...page,
      content,
      layout: null,
      slots: [],

      videoMaterialId: content === "video" ? page.videoMaterialId : null,
    });
  }

  function setLayout(id: string) {
    const next = findLayout(id);
    if (!next) return;
    const slots = next.areas.map((_, i) => page.slots[i] ?? emptySlot());
    persist({ ...page, content: "photos", layout: id, slots });
  }

  function setCount(count: number) {
    const first = layoutsForCount(count)[0];
    if (first) setLayout(first.id);
  }

  return (
    <section className="space-y-6 text-left">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold">{t("mbe_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("mbe_hint")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={index <= 1}
          onClick={() => setIndex((i) => Math.max(1, i - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
          {t("mbe_prev")}
        </Button>
        <span className="text-sm font-medium">{fill(t("mbe_page"), { n: index, t: total })}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={index >= total}
          onClick={() => setIndex((i) => Math.min(total, i + 1))}
        >
          {t("mbe_next")}
          <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
        </Button>
        <span className="text-xs text-muted-foreground">
          {saving ? t("mbe_saving") : t("mbe_saved")}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["empty", "photos", "text", "video"] as MemoryBookPageContent[]).map((type) => (
          <Button
            key={type}
            size="sm"
            variant={page.content === type ? "default" : "outline"}
            onClick={() => setContent(type)}
          >
            {t(`mbe_type_${type}`)}
          </Button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {page.content === "photos" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{t("mbe_photo_count")}</span>
            {[1, 2, 3, 4].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={photoCount === n ? "default" : "outline"}
                onClick={() => setCount(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          {photoCount ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{t("mbe_layout")}</span>
              {layoutsForCount(photoCount).map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant={page.layout === option.id ? "default" : "outline"}
                  onClick={() => setLayout(option.id)}
                >
                  {t(`mbe_layout_${option.id}`)}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{t("mbe_mode")}</span>
            <Button
              size="sm"
              variant={mode === "photo" ? "default" : "outline"}
              onClick={() => setMode("photo")}
            >
              {t("mbe_mode_photo")}
            </Button>
            <Button
              size="sm"
              variant={mode === "frame" ? "default" : "outline"}
              onClick={() => setMode("frame")}
            >
              {t("mbe_mode_frame")}
            </Button>
          </div>
          {mode === "frame" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFrame({ ...frame, scale: frame.scale - 0.05 })}
              >
                <Minus className="mr-1 h-3.5 w-3.5" aria-hidden />
                {t("mbe_frame_smaller")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFrame({ ...frame, scale: frame.scale + 0.05 })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                {t("mbe_frame_bigger")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFrame(defaultFrame())}>
                {t("mbe_frame_reset")}
              </Button>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {mode === "frame" ? t("mbe_frame_hint") : t("mbe_drag_hint")}
          </p>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("mbe_no_photos")}</p>
          ) : null}
        </div>
      ) : null}

      {/* The page itself — the same state is shown in every preview size. */}
      {(() => {
        const pageSurface = (opts: { attachRef?: boolean; sizeClass: string }) => (
      <div
        ref={opts.attachRef ? pageBox : undefined}
        className={`relative mx-auto w-full ${opts.sizeClass} overflow-hidden rounded-2xl border border-border/70 bg-card`}

        style={{
          containerType: "inline-size",
          aspectRatio: "3 / 4",
          backgroundImage: leafBackgroundUrl ? `url(${leafBackgroundUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {page.content === "photos" && layout ? (
          <div
            className={`absolute inset-0 ${mode === "frame" ? "cursor-move" : ""}`}
            style={{
              transform: `translate(${frame.x}%, ${frame.y}%) scale(${frame.scale})`,
              transformOrigin: "center center",
              touchAction: mode === "frame" ? "none" : undefined,
            }}
            onPointerDown={onFramePointerDown}
            onPointerMove={onFramePointerMove}
            onPointerUp={onFramePointerUp}
            onPointerCancel={onFramePointerUp}
            onWheel={(e) => {
              if (mode !== "frame") return;
              setFrame(clampFrame({ ...frame, scale: frame.scale * (e.deltaY < 0 ? 1.05 : 0.95) }));
            }}
          >
            {mode === "frame" ? (
              <div className="pointer-events-none absolute inset-[6%] rounded-lg border-2 border-dashed border-primary/70" />
            ) : null}
            {layout.areas.map((area, i) => {
              const slot = page.slots[i] ?? emptySlot();
              const photo = photos.find((p) => p.id === slot.materialId) ?? null;
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${area.left}%`,
                    top: `${area.top}%`,
                    width: `${area.width}%`,
                    height: `${area.height}%`,
                  }}
                >
                  <div className="relative h-full w-full">
                    <div className="absolute inset-0">
                      <PhotoArea
                        slot={slot}
                        photo={photo}
                        disabled={mode === "frame"}
                        onChange={(next) => {
                          const slots = layout.areas.map((_, k) =>
                            k === i ? next : (page.slots[k] ?? emptySlot()),
                          );
                          persist({ ...page, slots });
                        }}
                      />
                    </div>
                    {mode === "photo" ? (
                      <div className="absolute inset-x-1 bottom-1 flex flex-wrap justify-center gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                          onClick={() => setPicker(i)}
                        >
                          {photo ? t("mbe_replace_photo") : t("mbe_choose_photo")}
                        </Button>
                        {photo ? (
                          <>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              aria-label={t("mbe_zoom_out")}
                              onClick={() => {
                                const slots = layout.areas.map((_, k) =>
                                  k === i
                                    ? clampSlot({ ...slot, scale: slot.scale - 0.2 })
                                    : (page.slots[k] ?? emptySlot()),
                                );
                                persist({ ...page, slots });
                              }}
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              aria-label={t("mbe_zoom_in")}
                              onClick={() => {
                                const slots = layout.areas.map((_, k) =>
                                  k === i
                                    ? clampSlot({ ...slot, scale: slot.scale + 0.2 })
                                    : (page.slots[k] ?? emptySlot()),
                                );
                                persist({ ...page, slots });
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              aria-label={t("mbe_remove_photo")}
                              onClick={() => {
                                const slots = layout.areas.map((_, k) =>
                                  k === i ? emptySlot() : (page.slots[k] ?? emptySlot()),
                                );
                                persist({ ...page, slots });
                              }}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {page.content === "text" && page.text.trim() ? (
          <div
            role="presentation"
            className="absolute cursor-move select-none"
            style={{
              left: `${textDesign.x}%`,
              top: `${textDesign.y}%`,
              width: `${textDesign.width}%`,
              transform: "translate(-50%, -50%)",
              touchAction: "none",
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
            onPointerDown={onTextPointerDown}
            onPointerMove={onTextPointerMove}
            onPointerUp={onTextPointerUp}
            onPointerCancel={onTextPointerUp}
          >
            {page.text}
          </div>
        ) : null}

        {page.content === "video" && page.videoMaterialId ? (
          <video
            src={videos.find((v) => v.id === page.videoMaterialId)?.url}
            controls
            preload="metadata"
            className="absolute inset-4 h-auto w-auto max-w-[calc(100%-2rem)] bg-black object-contain"
          />
        ) : null}
      </div>
        );
        if (page.content !== "text") return pageSurface({ attachRef: true, sizeClass: "max-w-md" });
        return (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
              <div className="lg:sticky lg:top-4">
                {pageSurface({ sizeClass: "max-w-[16rem]" })}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="mbe-text">
                  {t("mbe_text_label")}
                </label>
                <Textarea
                  id="mbe-text"
                  rows={4}
                  value={page.text}
                  placeholder={t("mbe_text_placeholder")}
                  onChange={(e) => persist({ ...page, text: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t("mbe_text_drag_hint")}</p>
                <p className="pt-2 text-sm font-medium">{t("mbe_text_style")}</p>
                <TextStylePanel design={textDesign} onChange={setTextDesign} />
              </div>
            </div>
            {pageSurface({ attachRef: true, sizeClass: "max-w-md" })}
          </div>
        );
      })()}


      {page.content === "video" ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">{t("mbe_video_label")}</p>
          <p className="text-xs text-muted-foreground">
            {fill(t("mbe_video_capacity"), { n: videoPagesUsed, t: videoCapacity })}
          </p>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("mbe_no_videos")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {videos.map((video) => {
                const tooLong =
                  !video.durationSeconds ||
                  video.durationSeconds > MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS;
                const chosen = page.videoMaterialId === video.id;
                return (
                  <div
                    key={video.id}
                    className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-2"
                  >
                    <p className="truncate text-xs text-muted-foreground">{video.fileName}</p>
                    {tooLong ? (
                      <p className="text-xs text-destructive">{t("mbe_video_needs_prep")}</p>
                    ) : null}
                    <Button
                      size="sm"
                      variant={chosen ? "secondary" : "default"}
                      disabled={tooLong || chosen}
                      onClick={() => persist({ ...page, videoMaterialId: video.id })}
                    >
                      {t("mbe_video_choose")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {page.videoMaterialId ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => persist({ ...page, videoMaterialId: null })}
            >
              {t("mbe_video_clear")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {picker != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border/70 bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">
                {fill(t("mbe_area"), { n: picker + 1 })}
              </h3>
              <Button variant="ghost" onClick={() => setPicker(null)}>
                {t("mbe_close_picker")}
              </Button>
            </div>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("mbe_no_photos")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="overflow-hidden rounded-lg border border-border/60"
                    onClick={() => {
                      const areas = findLayout(page.layout)?.areas ?? [];
                      const slots = areas.map((_, k) =>
                        k === picker
                          ? clampSlot({ ...emptySlot(), materialId: photo.id })
                          : (page.slots[k] ?? emptySlot()),
                      );
                      persist({ ...page, content: "photos", slots });
                      setPicker(null);
                    }}
                  >
                    <img src={photo.url} alt="" className="h-24 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

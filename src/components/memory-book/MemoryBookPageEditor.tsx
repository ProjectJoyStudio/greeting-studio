import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Minus, Play, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hexToRgba } from "@/components/greeting-card/CardPreview";
import { TextStylePanel } from "@/components/greeting-card/TextStylePanel";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import type { MemoryBookMaterial } from "@/lib/memory-book/materials";
import { loadMemoryBookMaterials } from "@/lib/memory-book/materials.functions";
import type { CardTextDesign } from "@/lib/greeting-card/types";
import { MemoryBookDecorations } from "@/components/memory-book/MemoryBookDecorations";
import type { MemoryBookDecoration } from "@/lib/memory-book/decorations";
import { listMemoryBookDecorations } from "@/lib/memory-book/decorations.functions";
import {
  MEMORY_BOOK_MAX_DECORATIONS_PER_PAGE,
  clampPlacedDecoration,
  type MemoryBookPlacedDecoration,
  MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS,
  clampFrame,
  clampTextDesign,
  clampSlot,
  clampVideoFrame,
  defaultFrame,
  defaultVideoFrame,
  MEMORY_BOOK_VIDEO_MIN_SIZE,
  emptyPage,
  emptySlot,
  findLayout,
  layoutsForCount,
  type MemoryBookFrame,
  type MemoryBookPage,
  type MemoryBookPageContent,
  type MemoryBookPhotoSlot,
  type MemoryBookVideoFrame,
} from "@/lib/memory-book/pages";
import {
  loadMemoryBookPages,
  saveMemoryBookPage,
} from "@/lib/memory-book/pages.functions";
import {
  improveMemoryBookPage,
  listMemoryBookPageBackgrounds,
  selectMemoryBookPageBackground,
  type MemoryBookPageBackground,
} from "@/lib/memory-book/improve.functions";
import { MEMORY_BOOK_IMPROVE_PAGE_CREDITS } from "@/lib/memory-book/pages";

/**
 * Which layer of the SAME page is being edited. Decorations are one more
 * editing tool, never a page type that replaces the other layers.
 */
type EditorTool = MemoryBookPageContent | "decorations" | "improve";

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
  initialPage,
  onPageChange,
  coverMode = false,
}: {
  bookId: string;
  leafBackgroundUrl?: string | null;
  /** Page to open first, e.g. when returning from video preparation. */
  initialPage?: number;
  /** Reports the page the customer is on, so Continue can return here. */
  onPageChange?: (page: number) => void;
  /**
   * Decorates the FRONT COVER instead of the internal pages. The cover is
   * stored as page 0 of the same book and never holds a video.
   */
  coverMode?: boolean;
}) {
  const { t } = useI18n();
  const loadPages = useServerFn(loadMemoryBookPages);
  const savePage = useServerFn(saveMemoryBookPage);
  const loadMaterials = useServerFn(loadMemoryBookMaterials);
  const loadLibrary = useServerFn(listMemoryBookDecorations);

  const [pages, setPages] = useState<Record<number, MemoryBookPage>>({});
  const [total, setTotal] = useState(0);
  const [videoCapacity, setVideoCapacity] = useState(0);
  const [materials, setMaterials] = useState<MemoryBookMaterial[]>([]);
  const [index, setIndex] = useState(initialPage && initialPage > 0 ? initialPage : 1);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  /** Which of the two independent adjustments the customer is making. */
  const [mode, setMode] = useState<"frame" | "photo">("photo");
  /** Which layer of the SAME page the customer is editing right now. */
  const [tool, setTool] = useState<EditorTool>("photos");
  /** The enabled decorations of the shared library, used to draw placed ones. */
  const [library, setLibrary] = useState<MemoryBookDecoration[]>([]);
  /** Which placed decoration of THIS page is being edited. */
  const [pickedDecoration, setPickedDecoration] = useState<string | null>(null);
  /** The page video only starts when the customer asks for it. */
  const [videoPlaying, setVideoPlaying] = useState(false);
  /** Improve Page: how many different pages this book may still improve free. */
  const improve = useServerFn(improveMemoryBookPage);
  const listBackgrounds = useServerFn(listMemoryBookPageBackgrounds);
  const selectBackground = useServerFn(selectMemoryBookPageBackground);
  /** Every background this page created successfully, oldest first. */
  const [backgrounds, setBackgrounds] = useState<MemoryBookPageBackground[]>([]);
  const [switchingBackground, setSwitchingBackground] = useState(false);
  const [improveAllowance, setImproveAllowance] = useState(0);
  const [improveDistinctUsed, setImproveDistinctUsed] = useState(0);
  const [improvePrompt, setImprovePrompt] = useState("");
  const [improving, setImproving] = useState(false);
  const [improveMessage, setImproveMessage] = useState<string | null>(null);


  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageBox = useRef<HTMLDivElement | null>(null);
  const frameDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const framePinch = useRef<{ distance: number; scale: number } | null>(null);
  const framePoints = useRef(new Map<number, { x: number; y: number }>());
  const textDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const videoDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const videoResize = useRef<{ id: number; x: number; y: number } | null>(null);
  const decorationDrag = useRef<{ id: number; item: string; x: number; y: number } | null>(null);
  const decorationResize = useRef<{ id: number; item: string; x: number; y: number } | null>(null);

  useEffect(() => {
    setVideoPlaying(false);
    setPickedDecoration(null);
    setImproveMessage(null);
  }, [index]);

  // Saved backgrounds belong to THIS exact page of THIS exact book.
  useEffect(() => {
    let alive = true;
    setBackgrounds([]);
    void listBackgrounds({ data: { bookId, pageIndex: index } })
      .then((res) => {
        if (alive && res.ok) setBackgrounds(res.backgrounds);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [bookId, index, listBackgrounds]);

  // The shared library is only read, so placed decorations can be drawn.
  useEffect(() => {
    let alive = true;
    void loadLibrary({ data: undefined })
      .then((res) => {
        if (alive) setLibrary(res.decorations);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [loadLibrary]);

  useEffect(() => {
    if (!ready) return;
    onPageChange?.(index);
  }, [ready, index, onPageChange]);

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
          setImproveAllowance(p.improveAllowance);
          setImproveDistinctUsed(p.improveDistinctUsed);
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

  // Opening another page starts with the tool that fits its saved content;
  // nothing on the page is changed by this.
  useEffect(() => {
    const stored = pages[index];
    setImprovePrompt(stored?.improvePrompt ?? "");
    if (!stored) {
      setTool("photos");
      return;
    }
    setTool(
      stored.content === "empty"
        ? stored.text.trim()
          ? "text"
          : "photos"
        : stored.content,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, ready]);

  const photos = useMemo(() => materials.filter((m) => m.kind === "photo"), [materials]);
  const videos = useMemo(() => materials.filter((m) => m.kind === "video"), [materials]);
  const videoPagesUsed = useMemo(
    () => Object.values(pages).filter((p) => p.videoMaterialId).length,
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
              // The stored page comes back without the background of this
              // page, so the improved background already shown is kept.
              setPages((prev) => ({
                ...prev,
                [res.page!.pageIndex]: { ...prev[res.page!.pageIndex], ...res.page! },
              }));
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

  /** The background of THIS page: its improved design, else the book design. */
  const pageBackgroundUrl = page.backgroundUrl ?? leafBackgroundUrl ?? null;
  const improveIncludedUsed = page.improveIncludedUsed === true;
  const improveFreeLeft = Math.max(improveAllowance - improveDistinctUsed, 0);
  const improveBlocked = !improveIncludedUsed && improveFreeLeft <= 0;

  /**
   * Creates a new background for THIS page only. Photos, video, text and
   * decorations of the page are never sent and never changed.
   */
  async function runImprove() {
    if (improving || !improvePrompt.trim() || improveBlocked) return;
    setImproving(true);
    setImproveMessage(null);
    try {
      const res = await improve({
        data: {
          bookId,
          pageIndex: index,
          prompt: improvePrompt,
          claimKey: crypto.randomUUID(),
        },
      });
      if (res.improve) {
        setImproveAllowance(res.improve.allowance);
        setImproveDistinctUsed(res.improve.distinctUsed);
      }
      if (res.ok) {
        setPages((prev) => ({
          ...prev,
          [index]: {
            ...(prev[index] ?? emptyPage(index)),
            backgroundUrl: res.backgroundUrl ?? null,
            improvePrompt,
            improveIncludedUsed: true,
          },
        }));
        setImproveMessage(t("mbi_done"));
        const list = await listBackgrounds({ data: { bookId, pageIndex: index } });
        if (list.ok) setBackgrounds(list.backgrounds);
      } else {
        setImproveMessage(
          res.error === "page_limit"
            ? t("mbi_limit_reached")
            : res.error === "insufficient_credits"
              ? t("mbi_no_credits")
              : res.error === "empty_prompt"
                ? t("mbi_needs_description")
                : t("mbi_failed"),
        );
      }
    } catch {
      setImproveMessage(t("mbi_failed"));
    } finally {
      setImproving(false);
    }
  }

  /**
   * Switches the page to a background that already exists — or back to the
   * original book design. Nothing is generated and nothing is charged.
   */
  async function pickBackground(backgroundId: string | null) {
    if (switchingBackground) return;
    setSwitchingBackground(true);
    setImproveMessage(null);
    try {
      const res = await selectBackground({ data: { bookId, pageIndex: index, backgroundId } });
      if (res.ok) {
        setPages((prev) => ({
          ...prev,
          [index]: {
            ...(prev[index] ?? emptyPage(index)),
            backgroundUrl: res.backgroundUrl ?? null,
          },
        }));
        if (res.backgrounds) setBackgrounds(res.backgrounds);
      } else {
        setImproveMessage(t("mbi_select_failed"));
      }
    } catch {
      setImproveMessage(t("mbi_select_failed"));
    } finally {
      setSwitchingBackground(false);
    }
  }

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
    // The page surface is the direct parent, so dragging behaves identically
    // in the small working preview and in the large preview.
    const rect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
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


  /**
   * Chooses which layer of the page is being edited. Photos and text live on
   * the same page, so switching never removes anything already placed.
   */
  function setContent(content: MemoryBookPageContent) {
    if (content === "video" && !page.videoMaterialId && videoPagesUsed >= videoCapacity) {
      setError(t("mbe_video_capacity_full"));
      return;
    }
    setTool(content);
    if (content === "photos") {
      const first = layoutsForCount(1)[0];
      persist({
        ...page,
        content,
        layout: page.layout ?? first?.id ?? null,
        slots: page.slots.length ? page.slots : [emptySlot()],
      });
      return;
    }
    // Every other tool only changes what is being edited: the photo, text and
    // video layers already on the page all stay exactly as they are.
    persist({ ...page, content });
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


  /** Place and size of the video window; the video itself never distorts. */
  const videoFrame = clampVideoFrame(page.videoFrame ?? defaultVideoFrame());

  function setVideoFrame(next: Partial<MemoryBookVideoFrame>) {
    persist({ ...page, videoFrame: clampVideoFrame({ ...videoFrame, ...next }) });
  }

  function pageRectOf(target: EventTarget | null) {
    const box = (target as HTMLElement | null)?.closest?.("[data-page-surface]");
    return box?.getBoundingClientRect() ?? null;
  }

  function onVideoPointerDown(e: React.PointerEvent) {
    // The video frame is only moved while the video tool is the active layer.
    if (tool !== "video") return;
    if (videoPlaying) return;
    if (videoResize.current) return;
    e.preventDefault();
    // Capturing on the frame itself keeps every move event on the same
    // element, so the drag survives the video and the play overlay.
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    videoDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function onVideoPointerMove(e: React.PointerEvent) {
    if (!videoDrag.current || videoDrag.current.id !== e.pointerId) return;
    const rect = pageRectOf(e.currentTarget);
    if (!rect?.width || !rect.height) return;
    e.preventDefault();
    const dx = ((e.clientX - videoDrag.current.x) / rect.width) * 100;
    const dy = ((e.clientY - videoDrag.current.y) / rect.height) * 100;
    videoDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    setVideoFrame({ x: videoFrame.x + dx, y: videoFrame.y + dy });
  }

  function onVideoPointerUp(e: React.PointerEvent) {
    if (videoDrag.current?.id === e.pointerId) videoDrag.current = null;
  }

  function onVideoResizeDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    videoResize.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function onVideoResizeMove(e: React.PointerEvent) {
    if (!videoResize.current || videoResize.current.id !== e.pointerId) return;
    const rect = pageRectOf(e.currentTarget);
    if (!rect?.width || !rect.height) return;
    e.stopPropagation();
    e.preventDefault();
    const dx = ((e.clientX - videoResize.current.x) / rect.width) * 100;
    const dy = ((e.clientY - videoResize.current.y) / rect.height) * 100;
    videoResize.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    setVideoFrame({ width: videoFrame.width + dx, height: videoFrame.height + dy });
  }

  function onVideoResizeUp(e: React.PointerEvent) {
    if (videoResize.current?.id === e.pointerId) videoResize.current = null;
  }

  function resizeVideoBy(step: number) {
    setVideoFrame({
      width: Math.max(MEMORY_BOOK_VIDEO_MIN_SIZE, videoFrame.width + step),
      height: Math.max(MEMORY_BOOK_VIDEO_MIN_SIZE, videoFrame.height + step),
    });
  }

  /* ---- Decorations: one more independent layer of THIS page ---- */

  const placed = page.decorations ?? [];
  const selectedDecoration = placed.find((d) => d.id === pickedDecoration) ?? null;
  const libraryOf = (decorationId: string) =>
    library.find((l) => l.id === decorationId) ?? null;

  function newDecorationId() {
    try {
      return crypto.randomUUID();
    } catch {
      return `d${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
    }
  }

  /** Puts a library decoration on the current page. Nothing is charged. */
  function addDecoration(decoration: MemoryBookDecoration) {
    if (placed.length >= MEMORY_BOOK_MAX_DECORATIONS_PER_PAGE) return;
    const next = clampPlacedDecoration({
      id: newDecorationId(),
      decorationId: decoration.id,
      x: 50,
      y: 50,
      size: 25,
      rotation: 0,
      color: null,
    });
    setPickedDecoration(next.id);
    persist({ ...page, decorations: [...placed, next] });
  }

  function updateDecoration(id: string, patch: Partial<MemoryBookPlacedDecoration>) {
    persist({
      ...page,
      decorations: placed.map((d) => (d.id === id ? clampPlacedDecoration({ ...d, ...patch }) : d)),
    });
  }

  function removeDecoration(id: string) {
    if (pickedDecoration === id) setPickedDecoration(null);
    persist({ ...page, decorations: placed.filter((d) => d.id !== id) });
  }

  function onDecorationPointerDown(e: React.PointerEvent, item: MemoryBookPlacedDecoration) {
    if (tool !== "decorations") return;
    e.preventDefault();
    setPickedDecoration(item.id);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    decorationDrag.current = { id: e.pointerId, item: item.id, x: e.clientX, y: e.clientY };
  }

  function onDecorationPointerMove(e: React.PointerEvent) {
    const drag = decorationDrag.current;
    if (!drag || drag.id !== e.pointerId) return;
    const rect = pageRectOf(e.currentTarget);
    if (!rect?.width || !rect.height) return;
    e.preventDefault();
    const current = placed.find((d) => d.id === drag.item);
    if (!current) return;
    const dx = ((e.clientX - drag.x) / rect.width) * 100;
    const dy = ((e.clientY - drag.y) / rect.height) * 100;
    decorationDrag.current = { ...drag, x: e.clientX, y: e.clientY };
    updateDecoration(drag.item, { x: current.x + dx, y: current.y + dy });
  }

  function onDecorationPointerUp(e: React.PointerEvent) {
    if (decorationDrag.current?.id === e.pointerId) decorationDrag.current = null;
  }

  function onDecorationResizeDown(e: React.PointerEvent, item: MemoryBookPlacedDecoration) {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    decorationResize.current = { id: e.pointerId, item: item.id, x: e.clientX, y: e.clientY };
  }

  function onDecorationResizeMove(e: React.PointerEvent) {
    const resize = decorationResize.current;
    if (!resize || resize.id !== e.pointerId) return;
    const rect = pageRectOf(e.currentTarget);
    if (!rect?.width) return;
    e.stopPropagation();
    e.preventDefault();
    const current = placed.find((d) => d.id === resize.item);
    if (!current) return;
    const dx = ((e.clientX - resize.x) / rect.width) * 100;
    decorationResize.current = { ...resize, x: e.clientX, y: e.clientY };
    updateDecoration(resize.item, { size: current.size + dx * 2 });
  }

  function onDecorationResizeUp(e: React.PointerEvent) {
    if (decorationResize.current?.id === e.pointerId) decorationResize.current = null;
  }

  const decorationControls = (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
      {!selectedDecoration ? (
        <p className="text-sm text-muted-foreground">
          {placed.length ? t("mbdec_select_hint") : t("mbdec_add_hint")}
        </p>
      ) : (
        <>
          <p className="text-sm font-medium">{t("mbdec_selected")}</p>
          <p className="text-xs text-muted-foreground">{t("mbdec_move_hint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateDecoration(selectedDecoration.id, { size: selectedDecoration.size - 4 })
              }
            >
              <Minus className="mr-1 h-3.5 w-3.5" aria-hidden />
              {t("mbdec_smaller")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateDecoration(selectedDecoration.id, { size: selectedDecoration.size + 4 })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
              {t("mbdec_bigger")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateDecoration(selectedDecoration.id, {
                  rotation: selectedDecoration.rotation - 15,
                })
              }
            >
              {t("mbdec_rotate_left")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateDecoration(selectedDecoration.id, {
                  rotation: selectedDecoration.rotation + 15,
                })
              }
            >
              {t("mbdec_rotate_right")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => removeDecoration(selectedDecoration.id)}
            >
              <X className="mr-1 h-3.5 w-3.5" aria-hidden />
              {t("mbdec_delete")}
            </Button>
          </div>
          {libraryOf(selectedDecoration.decorationId)?.fileType === "svg" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium" htmlFor="mbdec-color">
                {t("mbdec_color")}
              </label>
              <input
                id="mbdec-color"
                type="color"
                className="h-8 w-12 cursor-pointer rounded border border-border/70 bg-background"
                value={selectedDecoration.color ?? "#c2185b"}
                onChange={(e) =>
                  updateDecoration(selectedDecoration.id, { color: e.target.value })
                }
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateDecoration(selectedDecoration.id, { color: null })}
              >
                {t("mbdec_color_reset")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );

  /** The existing photo controls, unchanged — only their place moved. */
  const photoControls = (
    <div className="space-y-2 sm:space-y-3">
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
  );

  return (
    <section className="space-y-4 text-left sm:space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold">{t("mbe_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("mbe_hint")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            variant={tool === type ? "default" : "outline"}
            onClick={() => setContent(type)}
          >
            {t(`mbe_type_${type}`)}
          </Button>
        ))}
        <Button
          size="sm"
          variant={tool === "decorations" ? "default" : "outline"}
          onClick={() => setTool("decorations")}
        >
          {t("mbdec_open")}
        </Button>
        <Button
          size="sm"
          variant={tool === "improve" ? "default" : "outline"}
          onClick={() => setTool("improve")}
        >
          {t("mbi_open")}
        </Button>
      </div>




      {error ? <p className="text-sm text-destructive">{error}</p> : null}


      {/* The page itself — the same state is shown in every preview size. */}
      {(() => {
        const pageSurface = (opts: { attachRef?: boolean; sizeClass: string }) => (
      <div
        ref={opts.attachRef ? pageBox : undefined}
        className={`relative mx-auto w-full ${opts.sizeClass} overflow-hidden rounded-2xl border border-border/70 bg-card`}
        data-page-surface

        style={{
          containerType: "inline-size",
          aspectRatio: "3 / 4",
          backgroundImage: pageBackgroundUrl ? `url(${pageBackgroundUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {layout ? (
          <div
            className={`absolute inset-0 ${tool === "photos" && mode === "frame" ? "cursor-move" : ""}`}
            style={{
              transform: `translate(${frame.x}%, ${frame.y}%) scale(${frame.scale})`,
              transformOrigin: "center center",
              touchAction: tool === "photos" && mode === "frame" ? "none" : undefined,
              // While the text layer is being edited the photos stay visible
              // but are not touched by pointer actions.
              pointerEvents: tool === "photos" ? undefined : "none",
            }}
            onPointerDown={onFramePointerDown}
            onPointerMove={onFramePointerMove}
            onPointerUp={onFramePointerUp}
            onPointerCancel={onFramePointerUp}
            onWheel={(e) => {
              if (tool !== "photos" || mode !== "frame") return;
              setFrame(clampFrame({ ...frame, scale: frame.scale * (e.deltaY < 0 ? 1.05 : 0.95) }));
            }}
          >
            {tool === "photos" && mode === "frame" ? (
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
                        disabled={tool !== "photos" || mode === "frame"}
                        onChange={(next) => {
                          const slots = layout.areas.map((_, k) =>
                            k === i ? next : (page.slots[k] ?? emptySlot()),
                          );
                          persist({ ...page, slots });
                        }}
                      />
                    </div>
                    {tool === "photos" && mode === "photo" ? (
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

        {page.text.trim() ? (
          <div
            role="presentation"
            className={`absolute select-none ${tool === "text" ? "cursor-move" : "pointer-events-none"}`}
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

        {page.videoMaterialId ? (
          <div
            className={`absolute overflow-hidden rounded-xl bg-black shadow-lg ${
              tool === "video" ? "border-2 border-primary/60" : ""
            }`}
            style={{
              left: `${videoFrame.x}%`,
              top: `${videoFrame.y}%`,
              width: `${videoFrame.width}%`,
              height: `${videoFrame.height}%`,
              touchAction: "none",
              cursor: videoPlaying || tool !== "video" ? undefined : "move",
            }}
            onPointerDown={onVideoPointerDown}
            onPointerMove={onVideoPointerMove}
            onPointerUp={onVideoPointerUp}
            onPointerCancel={onVideoPointerUp}
          >
            <video
              ref={videoEl}
              src={videos.find((v) => v.id === page.videoMaterialId)?.url}
              controls={videoPlaying}
              preload="metadata"
              playsInline
              className={`h-full w-full bg-black object-cover ${
                videoPlaying ? "" : "pointer-events-none"
              }`}
            />
            {!videoPlaying ? (
              // The dim layer must not swallow pointers, otherwise the frame
              // can never be dragged; only the round play button reacts.
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                <button
                  type="button"
                  aria-label={t("mbe_video_play")}
                  className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-background/85"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setVideoPlaying(true);
                    void videoEl.current?.play().catch(() => undefined);
                  }}
                >
                  <Play className="h-6 w-6" aria-hidden />
                </button>
              </div>
            ) : null}
            {tool === "video" ? (
              <span
                role="presentation"
                aria-label={t("mbe_video_resize")}
                className="absolute bottom-0 right-0 h-7 w-7 cursor-nwse-resize rounded-tl-lg bg-primary/85"
                style={{ touchAction: "none" }}
                onPointerDown={onVideoResizeDown}
                onPointerMove={onVideoResizeMove}
                onPointerUp={onVideoResizeUp}
                onPointerCancel={onVideoResizeUp}
              />
            ) : null}
          </div>
        ) : null}

        {/* Decorations stay part of the page in every editing tool. */}
        {placed.map((item) => {
          const source = libraryOf(item.decorationId);
          if (!source?.url) return null;
          const active = tool === "decorations";
          const chosen = active && pickedDecoration === item.id;
          return (
            <div
              key={item.id}
              className={`absolute ${chosen ? "ring-2 ring-primary/70" : ""}`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.size}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                touchAction: "none",
                cursor: active ? "move" : undefined,
                pointerEvents: active ? "auto" : "none",
              }}
              onPointerDown={(e) => onDecorationPointerDown(e, item)}
              onPointerMove={onDecorationPointerMove}
              onPointerUp={onDecorationPointerUp}
              onPointerCancel={onDecorationPointerUp}
            >
              {item.color && source.fileType === "svg" ? (
                <>
                  {/* The library file itself is never changed: the colour is
                      painted through the shape of this placed copy only. */}
                  <img
                    src={source.url}
                    alt=""
                    draggable={false}
                    className="block w-full select-none opacity-0"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
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
                <img
                  src={source.url}
                  alt={source.name}
                  draggable={false}
                  className="pointer-events-none block w-full select-none"
                />
              )}
              {chosen ? (
                <span
                  role="presentation"
                  aria-label={t("mbdec_resize")}
                  className="absolute -bottom-2 -right-2 h-6 w-6 cursor-nwse-resize rounded-full bg-primary/85"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => onDecorationResizeDown(e, item)}
                  onPointerMove={onDecorationResizeMove}
                  onPointerUp={onDecorationResizeUp}
                  onPointerCancel={onDecorationResizeUp}
                />
              ) : null}
            </div>
          );
        })}
      </div>
        );
        // On phones the working preview and its controls sit side by side so
        // the customer does not scroll between them; from sm upwards the
        // already approved tablet/desktop arrangement is kept unchanged.
        const workspaceGrid =
          "grid gap-3 grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-start sm:grid-cols-1 sm:gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start";
        // On phones the small working page stays pinned inside the workspace
        // while the controls beside it scroll; it stops with its container.
        const workingPreview =
          "min-w-0 sticky top-16 self-start sm:static sm:top-auto sm:self-auto lg:sticky lg:top-4 lg:self-start";
        const workingSize = "max-w-full sm:max-w-[16rem]";
        if (tool === "photos") {
          // Same workspace principle as the text editor: a small working page
          // on the left, the existing controls on the right, the big page below.
          return (
            <div className="space-y-4 sm:space-y-6">
              <div className={workspaceGrid}>
                <div className={workingPreview}>{pageSurface({ sizeClass: workingSize })}</div>
                <div className="min-w-0">{photoControls}</div>
              </div>
              {pageSurface({ attachRef: true, sizeClass: "max-w-md" })}
            </div>
          );
        }
        if (tool === "decorations") {

          // Same workspace principle: the small working page stays visible on
          // the left while the library and its controls scroll on the right.
          return (
            <div className="space-y-4 sm:space-y-6">
              <div className={workspaceGrid}>
                <div className={workingPreview}>{pageSurface({ sizeClass: workingSize })}</div>
                <div className="min-w-0 space-y-4">
                  <div className="max-h-[28rem] overflow-y-auto pr-1">
                    <MemoryBookDecorations
                      bookId={bookId}
                      pageIndex={index - 1}
                      onClose={() => setTool(page.layout ? "photos" : "text")}
                      onPick={addDecoration}
                    />
                  </div>
                  {decorationControls}
                </div>
              </div>
              {pageSurface({ attachRef: true, sizeClass: "max-w-md" })}
            </div>
          );
        }
        if (tool === "improve") {
          // Only the background of THIS page is created here; everything the
          // customer already placed stays exactly where it is.
          return (
            <div className="space-y-4 sm:space-y-6">
              <div className={workspaceGrid}>
                <div className={workingPreview}>{pageSurface({ sizeClass: workingSize })}</div>
                <div className="min-w-0 space-y-2">
                  <label className="text-sm font-medium" htmlFor="mbe-improve">
                    {t("mbi_label")}
                  </label>
                  <Textarea
                    id="mbe-improve"
                    rows={4}
                    value={improvePrompt}
                    placeholder={t("mbi_placeholder")}
                    onChange={(e) => setImprovePrompt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {improveIncludedUsed
                      ? fill(t("mbi_paid_note"), { c: MEMORY_BOOK_IMPROVE_PAGE_CREDITS })
                      : fill(t("mbi_included_left"), {
                          n: improveFreeLeft,
                          t: improveAllowance,
                        })}
                  </p>
                  {improveBlocked ? (
                    <p className="text-xs text-destructive">{t("mbi_limit_reached")}</p>
                  ) : null}
                  <Button
                    size="sm"
                    disabled={improving || improveBlocked || !improvePrompt.trim()}
                    onClick={() => void runImprove()}
                  >
                    {improving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {improveIncludedUsed ? t("mbi_generate_paid") : t("mbi_generate")}
                  </Button>
                  {improveMessage ? (
                    <p className="text-xs text-muted-foreground">{improveMessage}</p>
                  ) : null}

                  {/* Every background this page ever created stays selectable. */}
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium">{t("mbi_variants")}</p>
                    <p className="text-xs text-muted-foreground">{t("mbi_variants_free")}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={switchingBackground}
                        onClick={() => void pickBackground(null)}
                        className={`h-16 w-14 overflow-hidden rounded-md border text-[10px] leading-tight ${
                          page.backgroundUrl ? "border-border/70" : "border-primary ring-2 ring-primary"
                        }`}
                        style={
                          leafBackgroundUrl
                            ? {
                                backgroundImage: `url(${leafBackgroundUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                        title={t("mbi_variant_original")}
                      >
                        <span className="sr-only">{t("mbi_variant_original")}</span>
                      </button>
                      {backgrounds.map((item, i) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={switchingBackground}
                          onClick={() => void pickBackground(item.id)}
                          className={`h-16 w-14 overflow-hidden rounded-md border ${
                            item.active ? "border-primary ring-2 ring-primary" : "border-border/70"
                          }`}
                          style={
                            item.url
                              ? {
                                  backgroundImage: `url(${item.url})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                          title={fill(t("mbi_variant_n"), { n: i + 1 })}
                        >
                          <span className="sr-only">{fill(t("mbi_variant_n"), { n: i + 1 })}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {pageSurface({ attachRef: true, sizeClass: "max-w-md" })}
            </div>
          );
        }
        if (tool !== "text") return pageSurface({ attachRef: true, sizeClass: "max-w-md" });
        return (
          <div className="space-y-4 sm:space-y-6">

            <div className={workspaceGrid}>
              <div className={workingPreview}>
                {pageSurface({ sizeClass: workingSize })}
              </div>
              <div className="min-w-0 space-y-2">
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


      {tool === "video" ? (
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
                      <>
                        <p className="text-xs text-destructive">{t("mbe_video_needs_prep")}</p>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/memory-book-video"
                            search={{
                              book: bookId,
                              material: video.id,
                              from: "pages" as const,
                              page: index,
                            }}
                          >
                            {t("mbv_process")}
                          </Link>
                        </Button>
                      </>
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
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("mbe_video_place_hint")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => resizeVideoBy(-6)}>
                  <Minus className="mr-1 h-3.5 w-3.5" aria-hidden />
                  {t("mbe_video_smaller")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => resizeVideoBy(6)}>
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                  {t("mbe_video_bigger")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => persist({ ...page, videoFrame: defaultVideoFrame() })}
                >
                  {t("mbe_video_reset")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => persist({ ...page, videoMaterialId: null })}
                >
                  {t("mbe_video_clear")}
                </Button>
              </div>
            </div>
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

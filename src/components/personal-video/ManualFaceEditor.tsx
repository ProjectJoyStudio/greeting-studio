// Manual face marking for a group photo: the person using the site draws a
// frame around every face, checks the cut-out preview and decides whether the
// face belongs to a new person or to somebody already in the project.

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  MIN_FACE_SIDE,
  cropFace,
  overlapRatio,
  readImage,
  type CroppedFace,
  type FaceBox,
} from "@/lib/personal-video/photo-tools";
import { PVG_MAX_PEOPLE, type PvgPerson } from "@/lib/personal-video/types";

export interface ManualFaceResult {
  /** Empty for a brand new person, otherwise the person the face belongs to. */
  personId: string | null;
  base64: string;
  contentType: string;
  quality: "good" | "low";
}

interface Mark {
  id: string;
  box: FaceBox;
  target: string; // "" = new person
  crop: CroppedFace | null;
  working: boolean;
}

type Drag =
  | { kind: "draw"; id: string; startX: number; startY: number }
  | { kind: "move"; id: string; dx: number; dy: number }
  | { kind: "resize"; id: string; anchorX: number; anchorY: number };

export function ManualFaceEditor({
  file,
  people,
  busy,
  onCancel,
  onSave,
}: {
  file: File;
  people: PvgPerson[];
  busy: boolean;
  onCancel: () => void;
  onSave: (faces: ManualFaceResult[]) => void;
}) {
  const { t } = useI18n();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    void (async () => {
      const img = await readImage(file);
      setImage(img);
      revoked = URL.createObjectURL(file);
      setUrl(revoked);
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // --- coordinates ---------------------------------------------------------
  function toImage(clientX: number, clientY: number): { x: number; y: number } {
    const rect = surface.current?.getBoundingClientRect();
    if (!rect || !image) return { x: 0, y: 0 };
    const scale = image.naturalWidth / rect.width;
    return {
      x: Math.min(image.naturalWidth, Math.max(0, (clientX - rect.left) * scale)),
      y: Math.min(image.naturalHeight, Math.max(0, (clientY - rect.top) * scale)),
    };
  }

  function percent(box: FaceBox) {
    if (!image) return { left: "0%", top: "0%", width: "0%", height: "0%" };
    return {
      left: `${(box.x / image.naturalWidth) * 100}%`,
      top: `${(box.y / image.naturalHeight) * 100}%`,
      width: `${(box.width / image.naturalWidth) * 100}%`,
      height: `${(box.height / image.naturalHeight) * 100}%`,
    };
  }

  // --- cropping ------------------------------------------------------------
  async function refreshCrop(id: string) {
    if (!image) return;
    setMarks((prev) => prev.map((m) => (m.id === id ? { ...m, working: true } : m)));
    const target = marksRef.current.find((m) => m.id === id);
    if (!target) return;
    try {
      const crop = await cropFace(image, target.box);
      setMarks((prev) => prev.map((m) => (m.id === id ? { ...m, crop, working: false } : m)));
    } catch {
      setMarks((prev) => prev.map((m) => (m.id === id ? { ...m, crop: null, working: false } : m)));
    }
  }

  const marksRef = useRef<Mark[]>([]);
  marksRef.current = marks;

  // --- pointer handling ----------------------------------------------------
  function onPointerDown(e: React.PointerEvent) {
    if (!image) return;
    const point = toImage(e.clientX, e.clientY);
    const id = crypto.randomUUID();
    setMarks((prev) => [
      ...prev,
      {
        id,
        box: { x: point.x, y: point.y, width: 1, height: 1 },
        target: "",
        crop: null,
        working: false,
      },
    ]);
    setActiveId(id);
    drag.current = { kind: "draw", id, startX: point.x, startY: point.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const state = drag.current;
    if (!state || !image) return;
    const point = toImage(e.clientX, e.clientY);
    setMarks((prev) =>
      prev.map((m) => {
        if (m.id !== ("id" in state ? state.id : activeId)) return m;
        if (state.kind === "draw") {
          return {
            ...m,
            box: {
              x: Math.min(state.startX, point.x),
              y: Math.min(state.startY, point.y),
              width: Math.abs(point.x - state.startX),
              height: Math.abs(point.y - state.startY),
            },
          };
        }
        if (state.kind === "move") {
          return {
            ...m,
            box: {
              ...m.box,
              x: Math.min(image.naturalWidth - m.box.width, Math.max(0, point.x - state.dx)),
              y: Math.min(image.naturalHeight - m.box.height, Math.max(0, point.y - state.dy)),
            },
          };
        }
        return {
          ...m,
          box: {
            x: Math.min(state.anchorX, point.x),
            y: Math.min(state.anchorY, point.y),
            width: Math.abs(point.x - state.anchorX),
            height: Math.abs(point.y - state.anchorY),
          },
        };
      }),
    );
  }

  function onPointerUp() {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    const id = state.id ?? activeId;
    if (!id) return;
    const mark = marksRef.current.find((m) => m.id === id);
    if (!mark) return;
    if (mark.box.width < MIN_FACE_SIDE || mark.box.height < MIN_FACE_SIDE) {
      // A stray click or a far too small frame is discarded straight away.
      if (state.kind === "draw") {
        setMarks((prev) => prev.filter((m) => m.id !== id));
        setActiveId(null);
        return;
      }
    }
    void refreshCrop(id);
  }

  // --- validation ----------------------------------------------------------
  const newPersonCount = marks.filter((m) => m.target === "").length;
  const totalPeople = people.length + newPersonCount;
  const tooSmall = marks.some((m) => m.box.width < MIN_FACE_SIDE || m.box.height < MIN_FACE_SIDE);
  const blurry = marks.some((m) => m.crop?.blurry);
  const overlapping = useMemo(() => {
    for (let i = 0; i < marks.length; i += 1) {
      for (let j = i + 1; j < marks.length; j += 1) {
        if (overlapRatio(marks[i]!.box, marks[j]!.box) > 0.5) return true;
      }
    }
    return false;
  }, [marks]);
  const duplicateTarget = useMemo(() => {
    const used = marks.filter((m) => m.target !== "").map((m) => m.target);
    return new Set(used).size !== used.length;
  }, [marks]);

  const pending = marks.some((m) => m.working);
  const canSave =
    marks.length > 0 &&
    !tooSmall &&
    !overlapping &&
    !duplicateTarget &&
    !pending &&
    !busy &&
    totalPeople <= PVG_MAX_PEOPLE &&
    marks.every((m) => m.crop);

  function save() {
    onSave(
      marks
        .filter((m) => m.crop)
        .map((m) => ({
          personId: m.target === "" ? null : m.target,
          base64: m.crop!.photo.base64,
          contentType: m.crop!.photo.contentType,
          quality: m.crop!.quality === "low" ? "low" : "good",
        })),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">{t("pvg_face_editor_title")}</h2>
            <p className="text-xs text-muted-foreground">{t("pvg_face_editor_hint")}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("pvg_face_cancel")}
            className="rounded-full border border-border/60 p-2 transition hover:border-primary/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="self-start">
            <div
              ref={surface}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="relative w-full touch-none select-none overflow-hidden rounded-2xl border border-border/60 bg-muted"
            >
              {url ? (
                <img src={url} alt="" className="pointer-events-none block w-full" />
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              {marks.map((m, index) => (
                <div
                  key={m.id}
                  style={percent(m.box)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const point = toImage(e.clientX, e.clientY);
                    setActiveId(m.id);
                    drag.current = {
                      kind: "move",
                      id: m.id,
                      dx: point.x - m.box.x,
                      dy: point.y - m.box.y,
                    };
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                  }}
                  className={`absolute cursor-move rounded-md border-2 ${
                    activeId === m.id ? "border-primary" : "border-primary/60"
                  } bg-primary/10`}
                >
                  <span className="absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setActiveId(m.id);
                      drag.current = {
                        kind: "resize",
                        id: m.id,
                        anchorX: m.box.x,
                        anchorY: m.box.y,
                      };
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                    }}
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-primary bg-card"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("pvg_face_count")}: {marks.length}
            </p>
          </div>

          <div className="space-y-3">
            {marks.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                {t("pvg_face_err_empty")}
              </p>
            )}
            {marks.map((m, index) => {
              const small = m.box.width < MIN_FACE_SIDE || m.box.height < MIN_FACE_SIDE;
              return (
                <div
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  className={`rounded-2xl border p-3 ${
                    activeId === m.id ? "border-primary/60" : "border-border/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {m.working ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : m.crop ? (
                        <img
                          src={`data:${m.crop.photo.contentType};base64,${m.crop.photo.base64}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">
                        {t("pvg_face_assign")} #{index + 1}
                      </p>
                      <select
                        value={m.target}
                        onChange={(e) =>
                          setMarks((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, target: e.target.value } : x)),
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs"
                      >
                        <option value="">{t("pvg_face_new_person")}</option>
                        {people.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name || t("pvg_person_fallback")}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setMarks((prev) => prev.filter((x) => x.id !== m.id))}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("pvg_face_delete")}
                      </button>
                    </div>
                  </div>
                  {small && (
                    <p className="mt-2 text-[11px] text-destructive">{t("pvg_face_err_small")}</p>
                  )}
                  {!small && m.crop?.blurry && (
                    <p className="mt-2 text-[11px] text-amber-600">{t("pvg_face_warn_blurry")}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border/60 px-5 py-4">
          <div className="space-y-1">
            {overlapping && (
              <p className="text-xs text-destructive">{t("pvg_face_warn_overlap")}</p>
            )}
            {duplicateTarget && (
              <p className="text-xs text-destructive">{t("pvg_face_err_duplicate")}</p>
            )}
            {totalPeople > PVG_MAX_PEOPLE && (
              <p className="text-xs text-destructive">{t("pvg_face_err_max")}</p>
            )}
            {blurry && !overlapping && (
              <p className="text-xs text-muted-foreground">{t("pvg_face_warn_blurry")}</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium transition hover:border-primary/50"
            >
              {t("pvg_face_cancel")}
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={save}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("pvg_face_save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

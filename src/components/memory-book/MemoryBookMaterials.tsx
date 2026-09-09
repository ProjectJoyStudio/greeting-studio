import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  MEMORY_BOOK_MATERIALS_BUCKET,
  MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS,
  type MemoryBookMaterial,
} from "@/lib/memory-book/materials";
import {
  loadMemoryBookMaterials,
  registerMemoryBookMaterial,
  removeMemoryBookMaterial,
} from "@/lib/memory-book/materials.functions";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

/** Reads the length of a chosen video in the browser before it is uploaded. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadedmetadata = () =>
      done(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/**
 * Source photos and videos of ONE purchased Memory Book. Nothing here is
 * placed on pages yet — the material simply stays with this book.
 */
export function MemoryBookMaterials({
  bookId,
  videoCapacity,
}: {
  bookId: string;
  videoCapacity?: number;
}) {
  const { t } = useI18n();
  const load = useServerFn(loadMemoryBookMaterials);
  const register = useServerFn(registerMemoryBookMaterial);
  const drop = useServerFn(removeMemoryBookMaterial);

  const photoInput = useRef<HTMLInputElement | null>(null);
  const videoInput = useRef<HTMLInputElement | null>(null);
  const uploadingRef = useRef(false);

  const [materials, setMaterials] = useState<MemoryBookMaterial[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<"photo" | "video" | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    load({ data: { bookId } })
      .then((res) => {
        if (alive && res.ok) setMaterials(res.materials);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [bookId, load]);

  const upload = useCallback(
    async (files: File[], kind: "photo" | "video") => {
      if (uploadingRef.current || files.length === 0) return;
      uploadingRef.current = true;
      setBusy(true);
      setUploadingKind(kind);
      setError(null);
      if (kind === "video") setVideoError(null);
      const fail = (msg: string) => {
        if (kind === "video") setVideoError(msg);
        else setError(msg);
      };
      try {
        const { data: session } = await supabase.auth.getUser();
        const userId = session.user?.id;
        if (!userId) throw new Error("no_user");

        for (const file of files) {
          let duration: number | null = null;
          if (kind === "video") {
            duration = await readDuration(file);
            if (duration == null) {
              fail(t("mbm_video_unreadable"));
              continue;
            }
            if (duration > MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS) {
              fail(t("mbm_video_too_long"));
              continue;
            }
          }

          const path = `${userId}/${bookId}/${kind}-${Date.now()}-${safeName(file.name)}`;
          const { error: upErr } = await supabase.storage
            .from(MEMORY_BOOK_MATERIALS_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || undefined });
          if (upErr) {
            fail(kind === "video" ? t("mbm_video_failed") : t("mbm_failed"));
            continue;
          }

          const res = await register({
            data: {
              bookId,
              kind,
              path,
              fileName: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
              durationSeconds: duration,
            },
          });
          if (res.ok) setMaterials(res.materials);
          else fail(res.error === "too_long" ? t("mbm_video_too_long") : kind === "video" ? t("mbm_video_failed") : t("mbm_failed"));
        }
      } catch {
        fail(kind === "video" ? t("mbm_video_failed") : t("mbm_failed"));
      } finally {
        uploadingRef.current = false;
        setBusy(false);
        setUploadingKind(null);
        if (photoInput.current) photoInput.current.value = "";
        if (videoInput.current) videoInput.current.value = "";
      }
    },
    [bookId, register, t],
  );

  async function removeOne(materialId: string) {
    setBusy(true);
    try {
      const res = await drop({ data: { bookId, materialId } });
      if (res.ok) setMaterials(res.materials);
    } catch {
      setError(t("mbm_failed"));
    } finally {
      setBusy(false);
    }
  }

  const photos = materials.filter((m) => m.kind === "photo");
  const videos = materials.filter((m) => m.kind === "video");

  return (
    <section className="space-y-6 text-left">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold">{t("mbm_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("mbm_hint")}</p>
        <p className="text-xs text-muted-foreground">{t("mbm_video_note")}</p>
        {videoCapacity ? (
          <p className="text-xs text-muted-foreground">
            {fill(t("mbm_capacity"), { n: videoCapacity })}
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {busy ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("mbm_uploading")}
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold">{t("mbm_photos")}</h3>
          <Button size="sm" disabled={busy} onClick={() => photoInput.current?.click()}>
            {t("mbm_add_photos")}
          </Button>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void upload(Array.from(e.target.files ?? []), "photo")}
          />
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("mbm_empty_photos")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <figure
                key={photo.id}
                className="overflow-hidden rounded-xl border border-border/70 bg-muted/30"
              >
                <img src={photo.url} alt={photo.fileName} className="h-32 w-full object-cover" />
                <figcaption className="flex items-center justify-between gap-2 p-2">
                  <span className="truncate text-xs text-muted-foreground">{photo.fileName}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy}
                    aria-label={t("mbm_remove")}
                    onClick={() => void removeOne(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </figcaption>
                <div className="px-2 pb-2">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link
                      to="/memory-book-video"
                      search={{ book: bookId, material: video.id, from: "materials" as const }}
                    >
                      {t("mbv_process")}
                    </Link>
                  </Button>
                </div>
              </figure>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold">{t("mbm_videos")}</h3>
          <Button size="sm" disabled={busy} onClick={() => videoInput.current?.click()}>
            {t("mbm_add_video")}
          </Button>
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => void upload(Array.from(e.target.files ?? []), "video")}
          />
        </div>
        {uploadingKind === "video" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("mbm_video_uploading")}
          </p>
        ) : null}
        {videoError ? <p className="text-sm text-destructive">{videoError}</p> : null}
        {videos.length === 0 ? (
          uploadingKind === "video" ? null : (
            <p className="text-sm text-muted-foreground">{t("mbm_empty_videos")}</p>
          )
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videos.map((video) => (
              <figure
                key={video.id}
                className="overflow-hidden rounded-xl border border-border/70 bg-muted/30"
              >
                <video src={video.url} controls preload="metadata" className="h-48 w-full bg-black object-contain" />
                <figcaption className="flex items-center justify-between gap-2 p-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {video.fileName}
                    {video.durationSeconds
                      ? ` · ${Math.floor(video.durationSeconds / 60)}:${String(
                          Math.floor(video.durationSeconds % 60),
                        ).padStart(2, "0")}`
                      : ""}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy}
                    aria-label={t("mbm_remove")}
                    onClick={() => void removeOne(video.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS,
  type MemoryBookMaterial,
} from "@/lib/memory-book/materials";
import { MaterialUploadError, uploadMemoryBookMaterial } from "@/lib/memory-book/materials-upload";
import { createMemoryBookVideoUpload } from "@/lib/memory-book/video-storage.functions";
import { createMemoryBookPhotoUpload } from "@/lib/memory-book/photo-storage.functions";
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

/** Large source videos upload a couple at a time, never all at once. */
const VIDEO_CONCURRENCY = 2;

interface VideoQueueItem {
  id: string;
  name: string;
  status: "queued" | "uploading" | "done" | "failed";
  error?: string;
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
  const createUpload = useServerFn(createMemoryBookVideoUpload);
  const createPhotoUpload = useServerFn(createMemoryBookPhotoUpload);

  const photoInput = useRef<HTMLInputElement | null>(null);
  const videoInput = useRef<HTMLInputElement | null>(null);
  const uploadingRef = useRef(false);

  const [materials, setMaterials] = useState<MemoryBookMaterial[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<"photo" | "video" | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<VideoQueueItem[]>([]);

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
        for (const file of files) {
          let duration: number | null = null;
          if (kind === "video") {
            duration = await readDuration(file);
            if (duration == null) {
              console.error("Memory Book upload", { category: "validation", detail: "video_unreadable" });
              fail(t("mbm_video_unreadable"));
              continue;
            }
            if (duration > MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS) {
              console.error("Memory Book upload", { category: "validation", detail: "too_long" });
              fail(t("mbm_video_too_long"));
              continue;
            }
          }

          const stored = await uploadMemoryBookMaterial(kind === "video" ? createUpload : createPhotoUpload, {
            bookId,
            data: file,
            fileName: file.name,
            contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
          });

          const res = await register({
            data: {
              bookId,
              kind,
              path: stored.path,
              storage: stored.storage,
              fileName: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
              durationSeconds: duration,
            },
          });
          if (res.ok) setMaterials(res.materials);
          else {
            console.error("Memory Book upload", { category: res.error === "not_found" ? "authorization" : res.error === "too_long" ? "validation" : "registration", detail: res.error ?? "failed" });
            fail(res.error === "too_long" ? t("mbm_video_too_long") : kind === "video" ? t("mbm_video_failed") : t("mbm_failed"));
          }
        }
      } catch (cause) {
        console.error("Memory Book upload", cause instanceof MaterialUploadError
          ? { category: cause.category, detail: cause.detail }
          : { category: "server", detail: "request_failed" });
        fail(kind === "video" ? t("mbm_video_failed") : t("mbm_failed"));
      } finally {
        uploadingRef.current = false;
        setBusy(false);
        setUploadingKind(null);
        if (photoInput.current) photoInput.current.value = "";
        if (videoInput.current) videoInput.current.value = "";
      }
    },
    [bookId, createUpload, createPhotoUpload, register, t],
  );

  /**
   * Source videos: each selected file is validated, uploaded to its own signed
   * R2 address and registered on its own. At most VIDEO_CONCURRENCY uploads
   * run at once; one failure never affects the other files.
   */
  const uploadVideos = useCallback(
    async (files: File[]) => {
      if (uploadingRef.current || files.length === 0) return;
      uploadingRef.current = true;
      setBusy(true);
      setUploadingKind("video");
      setVideoError(null);
      const base = Date.now();
      const items: VideoQueueItem[] = files.map((f, i) => ({ id: `${base}-${i}`, name: f.name, status: "queued" }));
      setQueue(items);
      const patch = (id: string, next: Partial<VideoQueueItem>) =>
        setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...next } : it)));

      const runOne = async (file: File, id: string) => {
        patch(id, { status: "uploading" });
        try {
          const duration = await readDuration(file);
          if (duration == null) {
            console.error("Memory Book upload", { category: "validation", detail: "video_unreadable" });
            return patch(id, { status: "failed", error: t("mbm_video_unreadable") });
          }
          if (duration > MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS) {
            console.error("Memory Book upload", { category: "validation", detail: "too_long" });
            return patch(id, { status: "failed", error: t("mbm_video_too_long") });
          }
          const stored = await uploadMemoryBookMaterial(createUpload, {
            bookId,
            data: file,
            fileName: file.name,
            contentType: file.type || "video/mp4",
          });
          const res = await register({
            data: {
              bookId,
              kind: "video",
              path: stored.path,
              storage: stored.storage,
              fileName: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
              durationSeconds: duration,
            },
          });
          if (res.ok) {
            // Merge so a slower response never hides a file registered meanwhile.
            setMaterials((prev) => {
              const ids = new Set(res.materials.map((m) => m.id));
              return [...res.materials, ...prev.filter((m) => !ids.has(m.id))];
            });
            patch(id, { status: "done" });
          } else {
            console.error("Memory Book upload", { category: res.error === "not_found" ? "authorization" : res.error === "too_long" ? "validation" : "registration", detail: res.error ?? "failed" });
            patch(id, { status: "failed", error: res.error === "too_long" ? t("mbm_video_too_long") : t("mbm_video_failed") });
          }
        } catch (cause) {
          console.error("Memory Book upload", cause instanceof MaterialUploadError
            ? { category: cause.category, detail: cause.detail }
            : { category: "server", detail: "request_failed" });
          patch(id, { status: "failed", error: t("mbm_video_failed") });
        }
      };

      let next = 0;
      const worker = async () => {
        while (next < files.length) {
          const i = next++;
          await runOne(files[i], items[i].id);
        }
      };
      try {
        await Promise.all(Array.from({ length: Math.min(VIDEO_CONCURRENCY, files.length) }, worker));
      } finally {
        uploadingRef.current = false;
        setBusy(false);
        setUploadingKind(null);
        if (videoInput.current) videoInput.current.value = "";
      }
    },
    [bookId, createUpload, register, t],
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
            multiple
            className="hidden"
            onChange={(e) => void uploadVideos(Array.from(e.target.files ?? []))}
          />
        </div>
        {uploadingKind === "video" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("mbm_video_uploading")}
          </p>
        ) : null}
        {queue.length > 0 ? (
          <ul className="space-y-1 rounded-xl border border-border/70 bg-muted/30 p-3 text-sm" data-testid="video-queue">
            {queue.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2" data-status={item.status}>
                {item.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span
                  className={
                    item.status === "failed"
                      ? "text-destructive"
                      : item.status === "done"
                        ? "text-primary"
                        : "text-muted-foreground"
                  }
                >
                  {item.status === "queued"
                    ? t("mbm_video_queued")
                    : item.status === "uploading"
                      ? t("mbm_uploading")
                      : item.status === "done"
                        ? t("mbm_video_done")
                        : item.error ?? t("mbm_video_failed")}
                </span>
              </li>
            ))}
          </ul>
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
    </section>
  );
}

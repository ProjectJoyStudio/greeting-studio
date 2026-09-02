import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";

/**
 * The Project Joy delivery view: the finished film, and only the three things
 * the customer needs — take it home, hand it on, or step back out. Closing the
 * view alone never counts as delivery.
 */
export function DeliveryDialog({
  videoUrl,
  onDelivered,
  onClose,
}: {
  videoUrl: string;
  onDelivered: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  /** The film is fetched into the page first, so the browser saves it instead
   * of opening its own full-screen player. */
  async function fileOf(): Promise<File> {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error("download_failed");
    const blob = await res.blob();
    if (!blob.size) throw new Error("download_failed");
    return new File([blob], "project-joy-greeting.mp4", {
      type: blob.type || "video/mp4",
    });
  }

  async function download() {
    if (busy) return;
    setBusy("download");
    try {
      const file = await fileOf();
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
      onDelivered();
    } catch {
      toast.error(t("pvr_download_failed"));
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    if (busy) return;
    setBusy("share");
    try {
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      const file = await fileOf();
      const data: ShareData = { files: [file], title: t("pvr_deliver_title") };
      // Sharing hands the film to the device; it is never proof of delivery,
      // so the film stays available and can be sent again.
      if (nav.share && (!nav.canShare || nav.canShare(data))) {
        await nav.share(data);
      } else {
        toast.info(t("sh_unsupported"));
      }
    } catch (err) {
      // A cancelled share is not a failure and must not deliver the film.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        toast.error(t("sh_failed"));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pvr_deliver_title")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-card p-5 shadow-warm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-display text-base font-semibold">{t("pvr_deliver_title")}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("pvr_close")}
            className="rounded-full border border-border/60 p-2 transition hover:border-primary/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <video
          src={videoUrl}
          playsInline
          controls
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          onContextMenu={(e) => e.preventDefault()}
          className="w-full rounded-2xl bg-black"
        />

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void download()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
          >
            {busy === "download" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("pvr_download")}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void share()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/50 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
          >
            {busy === "share" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {t("sh_share_video")}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-full px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          {t("pvr_close")}
        </button>
      </div>
    </div>
  );
}

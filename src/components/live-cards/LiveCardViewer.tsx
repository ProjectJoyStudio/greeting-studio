import { useEffect, useState } from "react";
import { Download, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { canShareFiles, fetchShareFile, shareFileName, shareMediaFile } from "@/lib/share/share-media";

/**
 * Built-in viewer for a finished live greeting card. The video never opens as a
 * standalone browser file, so closing always returns to the Project Joy page.
 * The final MP4 is the only visual source: greeting text is already burned into
 * its frames and must never be drawn again by the cabinet or sharing viewer.
 */
export function LiveCardViewer({
  videoUrl,
  title,
  onClose,
  onDelivered,
}: {
  videoUrl: string;
  title?: string | null;
  onClose: () => void;
  /** Called only after a successful download — sharing never closes a card. */
  onDelivered?: (method: "download" | "share") => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [canFileShare, setCanFileShare] = useState(false);

  useEffect(() => {
    setCanFileShare(canShareFiles());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function download() {
    if (busy) return;
    setBusy("download");
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${(title || "live-greeting-card").replace(/[^\w-]+/g, "-")}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      onDelivered?.("download");
    } catch {
      toast.error(t("llc_download_failed"));
    } finally {
      setBusy(null);
    }
  }

  /**
   * Hands the finished MP4 itself to the system share sheet. Sharing is never
   * destructive: the card stays exactly where it is, whatever the outcome, and
   * can be sent again as often as the person wishes.
   */
  async function share() {
    if (busy) return;
    setBusy("share");
    try {
      const name = shareFileName(title || "live-greeting-card", "mp4");
      let file: File;
      try {
        file = await fetchShareFile(videoUrl, name, "video/mp4");
      } catch {
        toast.error(t("sh_failed"));
        return;
      }
      const result = await shareMediaFile({
        url: videoUrl,
        file,
        filename: name,
        mimeType: "video/mp4",
        title: title || t("llc_title"),
      });
      if (result === "unsupported") toast.info(t("sh_unsupported"));
      else if (result === "failed") toast.error(t("sh_failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-border/60 bg-card p-4 shadow-xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            {title || t("llc_viewer_title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("llc_close")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 transition hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="max-h-[70vh] w-full rounded-2xl bg-black object-contain"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void download()}
            disabled={busy !== null}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-primary-foreground shadow-warm"
          >
            {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t("llc_download")}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            disabled={busy !== null}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/60 px-5 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {canFileShare ? t("sh_share_video") : t("llc_send")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-5 py-3 text-sm font-medium transition hover:bg-secondary"
          >
            {t("llc_close")}
          </button>
        </div>
      </div>
    </div>
  );
}

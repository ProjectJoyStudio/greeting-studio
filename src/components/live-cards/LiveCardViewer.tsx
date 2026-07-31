import { useEffect } from "react";
import { Download, Send, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";

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
}: {
  videoUrl: string;
  title?: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function download() {
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
    } catch {
      toast.error(t("llc_download_failed"));
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: title || t("llc_title"), url: videoUrl });
        return;
      }
      await navigator.clipboard.writeText(videoUrl);
      toast.success(t("llc_link_copied"));
    } catch {
      /* the person cancelled */
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
            onClick={download}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-primary-foreground shadow-warm"
          >
            <Download className="h-4 w-4" />
            {t("llc_download")}
          </button>
          <button
            type="button"
            onClick={share}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/60 px-5 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <Send className="h-4 w-4" />
            {t("llc_send")}
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

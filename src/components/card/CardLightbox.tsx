// ---------------------------------------------------------------------------
// Enlarged card preview. Renders only the artwork plus its greeting text —
// every label, badge and action control lives outside the card image.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Download, Heart, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { canShareFiles, fetchShareFile, shareFileName, shareMediaFile } from "@/lib/share/share-media";

import { PublicCardText } from "./PublicCardText";
import type { PublicTextDesignRow } from "@/lib/public-catalog.functions";

export type LightboxCard = {
  id: string;
  imageUrl: string | null;
  gradient: string;
  aspectRatio: string;
  text: string;
  designs: PublicTextDesignRow[] | undefined;
};

export function CardLightbox({
  card,
  lang,
  onClose,
  labels,
}: {
  card: LightboxCard;
  lang: string;
  onClose: () => void;
  labels: { send: string; download: string; favorite: string; close: string };
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [canFileShare, setCanFileShare] = useState(false);

  useEffect(() => {
    setCanFileShare(canShareFiles());
  }, []);

  /** The catalog artwork itself is handed to the device share sheet. */
  async function shareCard() {
    if (busy || !card.imageUrl) return;
    setBusy("share");
    try {
      const name = shareFileName("project-joy-card", "jpg");
      let file: File;
      try {
        file = await fetchShareFile(card.imageUrl, name, "image/jpeg");
      } catch {
        toast.error(t("sh_failed"));
        return;
      }
      const result = await shareMediaFile({
        url: card.imageUrl,
        file,
        filename: file.name,
        mimeType: file.type || "image/jpeg",
      });
      if (result === "unsupported") toast.info(t("sh_unsupported"));
      else if (result === "failed") toast.error(t("sh_failed"));
    } finally {
      setBusy(null);
    }
  }

  async function downloadCard() {
    if (busy || !card.imageUrl) return;
    setBusy("download");
    try {
      const name = shareFileName("project-joy-card", "jpg");
      const file = await fetchShareFile(card.imageUrl, name, "image/jpeg");
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30_000);
    } catch {
      toast.error(t("sh_failed"));
    } finally {
      setBusy(null);
    }
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Locking overflow keeps the catalog scroll position intact on close.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The device back action closes the preview instead of leaving the page.
    window.history.pushState({ lightbox: card.id }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const dismiss = () => {
    if (window.history.state?.lightbox === card.id) window.history.back();
    else onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/75 p-4 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label={labels.close}
        onClick={dismiss}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/25 text-white/90 transition hover:bg-white/10"
      >
        <X className="h-5 w-5" />
      </button>

      {/* The image itself sizes the box, so the card is never cropped or padded. */}
      <div onClick={dismiss} className="relative overflow-hidden rounded-2xl leading-none shadow-2xl">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt=""
            className="block max-h-[80vh] w-auto max-w-[min(92vw,720px)] select-none [-webkit-touch-callout:none]"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <div
            className="max-w-[min(92vw,720px)]"
            style={{
              width: "min(92vw, 720px)",
              aspectRatio: card.aspectRatio.replace(":", " / "),
              backgroundImage: card.gradient,
            }}
          />
        )}
        <PublicCardText text={card.text} designs={card.designs} lang={lang} aspectRatio={card.aspectRatio} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void shareCard()}
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95 disabled:opacity-60"
        >
          {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {canFileShare ? t("sh_share_image") : labels.send}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void downloadCard()}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {labels.download}
        </button>
        <button className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10">
          <Heart className="h-4 w-4" /> {labels.favorite}
        </button>
      </div>
    </div>
  );
}

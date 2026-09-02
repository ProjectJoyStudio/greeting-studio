import { useEffect, useState } from "react";
import { Copy, Download, Loader2, Mail, Share2, X, Check } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { canShareFiles, shareMediaFile } from "@/lib/share/share-media";

type Channel = "telegram" | "whatsapp" | "viber" | "facebook" | "messenger" | "email";

const CHANNELS: { id: Channel; label: string; href: (url: string, text: string) => string }[] = [
  { id: "telegram", label: "Telegram", href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
  { id: "whatsapp", label: "WhatsApp", href: (u, t) => `https://wa.me/?text=${t}%20${u}` },
  { id: "viber", label: "Viber", href: (u, t) => `viber://forward?text=${t}%20${u}` },
  { id: "facebook", label: "Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { id: "messenger", label: "Messenger", href: (u) => `fb-messenger://share/?link=${u}` },
];

export function ShareDialog({
  open,
  onClose,
  url,
  title,
  onDownload,
  onShared,
  prepareFile,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  onDownload: () => void;
  onShared?: (channel: string) => void;
  /** Builds the finished media file that is handed to the system share sheet. */
  prepareFile?: () => Promise<File>;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [canFileShare, setCanFileShare] = useState(false);
  const [sharingFile, setSharingFile] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setCanFileShare(canShareFiles());
  }, []);

  /** Hands the actual image file to the system share sheet. Cancelling or
   * failing keeps the card exactly as it is, ready for another attempt. */
  async function shareFile() {
    if (sharingFile || !prepareFile) return;
    setSharingFile(true);
    try {
      let file: File;
      try {
        file = await prepareFile();
      } catch {
        toast.error(t("sh_failed"));
        return;
      }
      if (!file.size) {
        toast.error(t("sh_failed"));
        return;
      }
      const result = await shareMediaFile({
        url: "",
        file,
        filename: file.name,
        mimeType: file.type || "image/png",
        title,
      });
      if (result === "shared") onShared?.("file");
      else if (result === "unsupported") toast.info(t("sh_unsupported"));
      else if (result === "failed") toast.error(t("sh_failed"));
    } finally {
      setSharingFile(false);
    }
  }

  if (!open) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShared?.("copy_link");
      toast.success(t("gc_link_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("gc_err_save"));
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: title, url });
      onShared?.("native");
    } catch {
      /* the person dismissed the sheet — nothing changes */
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/75 p-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="font-display text-xl font-semibold text-foreground">{t("gc_share_title")}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("gc_close")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {CHANNELS.map((c) => (
            <a
              key={c.id}
              href={c.href(encodedUrl, encodedText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onShared?.(c.id)}
              className="rounded-xl border border-border/60 bg-background px-4 py-3 text-center text-sm font-medium hover:bg-secondary"
            >
              {c.label}
            </a>
          ))}
          <a
            href={`mailto:?subject=${encodedText}&body=${encodedText}%0A%0A${encodedUrl}`}
            onClick={() => onShared?.("email")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-medium hover:bg-secondary"
          >
            <Mail className="h-4 w-4" /> {t("gc_email")}
          </a>
        </div>

        <div className="mt-4 space-y-2.5">
          {prepareFile && canFileShare && (
            <button
              type="button"
              disabled={sharingFile}
              onClick={() => void shareFile()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
            >
              {sharingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              {sharingFile ? t("sh_preparing") : t("sh_share_image")}
            </button>
          )}
          {prepareFile && !canFileShare && (
            <p className="rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
              {t("sh_unsupported")}
            </p>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2">
            <span className="truncate text-xs text-muted-foreground">{url}</span>
            <button
              type="button"
              onClick={copyLink}
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {t("gc_copy_link")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onDownload();
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 px-5 py-3 text-sm hover:bg-secondary"
          >
            <Download className="h-4 w-4" /> {t("gc_download")}
          </button>

          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              <Share2 className="h-4 w-4" /> {t("gc_native_share")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

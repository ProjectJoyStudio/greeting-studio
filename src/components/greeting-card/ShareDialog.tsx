import { useEffect, useState } from "react";
import { Copy, Download, Mail, Share2, X, Check } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";

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
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  onDownload: () => void;
  onShared?: (channel: string) => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

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
      /* the person dismissed the sheet */
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
              onShared?.("download");
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

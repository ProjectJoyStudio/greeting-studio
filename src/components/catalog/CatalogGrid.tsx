import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { PublicCardText } from "@/components/card/PublicCardText";
import { CardLightbox, type LightboxCard } from "@/components/card/CardLightbox";
import { useI18n } from "@/lib/i18n";
import type { CardRow } from "@/lib/catalog/usePublicCards";

const gradients = [
  "linear-gradient(160deg, oklch(0.9 0.09 55), oklch(0.6 0.15 30))",
  "linear-gradient(160deg, oklch(0.86 0.11 20), oklch(0.5 0.15 10))",
  "linear-gradient(160deg, oklch(0.9 0.08 90), oklch(0.6 0.13 65))",
  "linear-gradient(160deg, oklch(0.85 0.08 340), oklch(0.5 0.12 340))",
  "linear-gradient(160deg, oklch(0.88 0.09 150), oklch(0.5 0.11 165))",
  "linear-gradient(160deg, oklch(0.85 0.07 240), oklch(0.4 0.09 260))",
  "linear-gradient(160deg, oklch(0.9 0.07 45), oklch(0.42 0.11 30))",
  "linear-gradient(160deg, oklch(0.88 0.1 75), oklch(0.55 0.14 55))",
  "linear-gradient(160deg, oklch(0.85 0.05 200), oklch(0.5 0.08 220))",
];

/** Cards render in their stored aspect ratio — never cropped or stretched. */
const aspectOf = (card: CardRow) => {
  const w = card.background?.width ?? 0;
  const h = card.background?.height ?? 0;
  if (w > 0 && h > 0) return `${w}:${h}`;
  const o = card.background?.orientation;
  if (o === "square") return "1:1";
  if (o === "horizontal") return "5:4";
  return "4:5";
};

const PAGE_SIZE = 48;

export function CatalogGrid({
  cards,
  dense,
  loading,
  emptyText,
}: {
  cards: CardRow[];
  /** Dense layout is used by the complete "All" catalog only. */
  dense: boolean;
  loading?: boolean;
  emptyText?: string;
}) {
  const { t, lang } = useI18n();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [preview, setPreview] = useState<LightboxCard | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [cards]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setLimit((n) => n + PAGE_SIZE);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [cards.length, limit]);

  const openPreview = useCallback(
    (card: CardRow, gradient: string, text: string) =>
      setPreview({
        id: card.id,
        imageUrl: card.background?.image_url ?? null,
        gradient,
        aspectRatio: aspectOf(card),
        text,
        designs: card.text_designs,
      }),
    [],
  );

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">…</p>;

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">{emptyText ?? t("catalog_no_results")}</p>
        <Link
          to="/studio"
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
        >
          <Sparkles className="h-4 w-4" />
          {t("cta_create_gift")}
        </Link>
      </div>
    );
  }

  const shown = cards.slice(0, limit);

  return (
    <>
      <div
        className={
          dense
            ? "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
            : "grid grid-cols-2 gap-4 md:grid-cols-3"
        }
      >
        {shown.map((c, i) => {
          const tr = c.translations.find((x) => x.language_code === lang) ?? c.translations[0];
          const wish = tr?.greeting_text || t("catalog_card_wish");
          const gradient = gradients[i % gradients.length];
          const ratio = aspectOf(c);
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => openPreview(c, gradient, wish)}
              className="group relative block w-full overflow-hidden rounded-xl border border-border/60 bg-muted transition hover:-translate-y-0.5 hover:shadow-warm"
              style={{ aspectRatio: ratio.replace(":", " / ") }}
            >
              {c.background?.thumb_url || c.background?.image_url ? (
                <img
                  src={c.background.thumb_url ?? c.background.image_url ?? ""}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0" style={{ backgroundImage: gradient }} />
              )}
              <PublicCardText text={wish} designs={c.text_designs} lang={lang} aspectRatio={ratio} />
            </button>
          );
        })}
      </div>
      <div ref={sentinelRef} className="h-12" />

      {preview && (
        <CardLightbox
          card={preview}
          lang={lang}
          onClose={() => setPreview(null)}
          labels={{
            send: t("cta_send") !== "cta_send" ? t("cta_send") : "Send",
            download: t("cta_download") !== "cta_download" ? t("cta_download") : "Download",
            favorite: t("cta_favorite") !== "cta_favorite" ? t("cta_favorite") : "Favorite",
            close: t("close") !== "close" ? t("close") : "Close",
          }}
        />
      )}
    </>
  );
}
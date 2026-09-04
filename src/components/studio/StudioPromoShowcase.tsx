import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  fetchPublicPromoWindows,
  type StudioPromoWindow,
} from "@/lib/studio-promos/promo-windows";

/** Fallback order/titles used before an administrator edits anything. */
const FALLBACK: { slot: string; title: string }[] = [
  { slot: "card", title: "Greeting Cards" },
  { slot: "animated", title: "Live Greeting Cards" },
  { slot: "video-greeting", title: "Personal Video Greeting" },
];

/**
 * Promotional video windows shown beside the Studio cards. The windows are
 * purely decorative: they never navigate and never accept clicks.
 */
export function StudioPromoShowcase() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["studio-promo-windows"],
    queryFn: fetchPublicPromoWindows,
    staleTime: 5 * 60 * 1000,
  });

  const windows: StudioPromoWindow[] =
    data && data.length > 0
      ? data.slice(0, 6)
      : FALLBACK.map((f, i) => ({
          id: f.slot,
          slot: f.slot,
          title: f.title,
          storageBucket: null,
          storagePath: null,
          videoUrl: null,
          isEnabled: true,
          sortOrder: i + 1,
          resolvedVideo: null,
        }));

  return (
    <section
      aria-label={t("spw_showcase_title")}
      className="rounded-3xl border border-border/70 bg-card p-6 shadow-warm sm:p-8"
    >
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
            {t("spw_showcase_eyebrow")}
          </div>
          <h2 className="mt-0.5 truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {t("spw_showcase_title")}
          </h2>
        </div>
      </header>

      <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
        {windows.map((w, i) => (
          <PromoWindow key={w.id} item={w} label={i < 4 ? t(`spw_win_${i + 1}`) : ""} />
        ))}
      </div>
    </section>
  );
}

function PromoWindow({ item, label }: { item: StudioPromoWindow; label: string }) {
  const { t } = useI18n();
  return (
    <figure className="flex min-h-[13rem] flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <div className="relative flex-1 select-none overflow-hidden bg-secondary/50 [pointer-events:none]">
        {item.resolvedVideo ? (
          <video
            src={item.resolvedVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            tabIndex={-1}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Placeholder label={t("spw_coming_soon")} />
        )}
      </div>
      {label ? (
        <figcaption className="border-t border-border/70 px-4 py-3 text-center font-display text-sm font-semibold tracking-tight">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-warm-gradient">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gold-gradient opacity-[0.08] blur-2xl"
      />
      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-warm">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="font-display text-sm font-semibold tracking-tight text-foreground/80">
          Project Joy
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
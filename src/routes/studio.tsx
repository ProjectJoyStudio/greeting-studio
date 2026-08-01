import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Mail, Sparkles, Video, Film, Clapperboard, Crown, Coins, Clock, Gift, type LucideIcon } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";
import { StudioPromoShowcase } from "@/components/studio/StudioPromoShowcase";
import {
  STUDIO_PRICING,
  computeEstimate,
  humanizeSeconds,
  type Estimate,
  type StudioGiftId,
} from "@/lib/studio/pricing";

export const Route = createFileRoute("/studio")({
  validateSearch: (search: Record<string, unknown>): { gift?: StudioGiftId } => {
    const raw = typeof search.gift === "string" ? search.gift : undefined;
    return raw && raw in STUDIO_PRICING ? { gift: raw as StudioGiftId } : {};
  },
  // Greeting cards have one universal creation page.
  beforeLoad: ({ search }) => {
    if ((search as { gift?: string }).gift === "card") {
      throw redirect({ to: "/create-card" });
    }
  },
  head: () => ({
    meta: [
      { title: "Project Joy Studio — Create unforgettable gifts" },
      {
        name: "description",
        content:
          "Project Joy Studio — craft greeting cards, live greetings, personal videos and cartoons for the people you love.",
      },
      { property: "og:title", content: "Project Joy Studio" },
      { property: "og:description", content: "Give more than greetings. Give emotions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioPage,
});

type GiftId = StudioGiftId;

interface GiftOption {
  id: GiftId;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  /** Existing destination, or null while the section is still being built. */
  to: string | null;
}

/** The six Studio cards, in their fixed 2 × 3 order. */
const GIFTS: GiftOption[] = [
  { id: "card", icon: Mail, titleKey: "gift_card", descKey: "gift_card_desc", to: "/create-card" },
  { id: "animated", icon: Sparkles, titleKey: "gift_animated", descKey: "gift_animated_desc", to: "/live-cards" },
  // Prepared for the future Personal Video Greeting section.
  { id: "video-greeting", icon: Video, titleKey: "gift_video_greeting", descKey: "gift_video_greeting_desc", to: null },
  { id: "video-clip", icon: Film, titleKey: "gift_video_clip", descKey: "gift_video_clip_desc", to: null },
  { id: "cartoon", icon: Clapperboard, titleKey: "gift_cartoon", descKey: "gift_cartoon_desc", to: null },
  { id: "premium", icon: Crown, titleKey: "gift_premium", descKey: "gift_premium_desc", to: null },
];

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatDurationForPreparation(seconds: number, t: (k: string) => string): string {
  const { value, unitKey } = humanizeSeconds(seconds);
  return `${t("prep_about")} ${value} ${t(unitKey)}`;
}

function formatEstimatePrep(estimate: Estimate, t: (k: string) => string): string {
  if (estimate.humanCraft) {
    const min = estimate.humanCraftDaysMin ?? 3;
    const max = estimate.humanCraftDaysMax ?? 5;
    return `${t("prep_within_days")} ${min}–${max} ${t("unit_days")}`;
  }
  return formatDurationForPreparation(estimate.processingSeconds, t);
}

function baselineEstimateForCard(id: GiftId): Estimate {
  const spec = STUDIO_PRICING[id];
  return computeEstimate(id, spec.duration ? spec.duration.default : null, "standard");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function StudioPage() {
  const { t } = useI18n();
  const { balance } = useCreditBalance();

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-warm-gradient">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 bg-gold-gradient opacity-[0.06] blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("studio_eyebrow")}
          </span>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            {t("studio_hero_title_1")}
            <span className="block bg-gold-gradient bg-clip-text text-transparent">
              {t("studio_hero_title_2")}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("studio_hero_sub")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm backdrop-blur">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{t("credits_balance")}:</span>
              <span className="font-semibold text-foreground">
                {balance} {t("studio_credits_word")}
              </span>
            </span>
            <Link
              to="/credits"
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
            >
              <Coins className="h-4 w-4" />
              {t("credits_buy")}
            </Link>
          </div>
        </div>
      </section>

      {/* Body — cards on the left, promotional showcase on the right */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="grid items-stretch gap-8 xl:grid-cols-2">
          <GiftCards />
          <StudioPromoShowcase />
        </div>
      </section>
    </SiteLayout>
  );
}

// ---------------------------------------------------------------------------
// The six navigation cards
// ---------------------------------------------------------------------------

function GiftCards() {
  const { t } = useI18n();
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-warm sm:p-8">
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
          <Gift className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
            {t("studio_eyebrow")}
          </div>
          <h2 className="mt-0.5 truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {t("studio_s1_title")}
          </h2>
        </div>
      </header>
      <p className="mt-3 text-sm text-muted-foreground">{t("studio_s1_sub")}</p>

      <div className="mt-6 grid auto-rows-fr gap-4 sm:grid-cols-2">
        {GIFTS.map((g) => {
          const Icon = g.icon;
          const est = baselineEstimateForCard(g.id);
          const isPremium = g.id === "premium";
          const prepLabel = isPremium
            ? t("studio_premium_custom_estimate")
            : formatEstimatePrep(est, t);
          const cardClass =
            "group relative flex flex-col rounded-2xl border border-border bg-background p-5 text-left transition hover:border-primary/40 hover:bg-secondary/40";
          const body = (
            <>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary transition">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="min-w-0 font-display text-lg font-semibold leading-snug tracking-tight">
                  {t(g.titleKey)}
                </h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t(g.descKey)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                {!isPremium && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/60 px-2.5 py-1 font-medium text-foreground/80">
                    <Coins className="h-3 w-3 text-primary" />
                    {est.credits} {t("studio_credits_word")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {prepLabel}
                </span>
              </div>
            </>
          );
          if (g.to) {
            return (
              <Link key={g.id} to={g.to} className={cardClass}>
                {body}
              </Link>
            );
          }
          // Prepared for a future section — no destination is wired up yet.
          return (
            <div key={g.id} className={cardClass}>
              {body}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("studio_calc_final_note")}</p>
    </section>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HERO_FALLBACK_GRADIENTS,
  fetchPublicHeroCards,
  type HeroCard,
} from "@/lib/hero-showcase/hero-cards";
import {
  ArrowRight,
  Sparkles,
  Gift,
  Heart,
  Briefcase,
  HandHeart,
  Wand2,
  Send,
  Coffee,
  Bell,
  CalendarClock,
  CalendarDays,
  Clock,
  Eye,
  MessageSquareHeart,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SectionHeading } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Joy — Платформа персональных поздравлений" },
      {
        name: "description",
        content:
          "Открытки, анимации, музыка, голос, песни, видео и персональные истории для дорогих вам людей.",
      },
      { property: "og:title", content: "Project Joy — Персональные поздравления" },
      {
        property: "og:description",
        content:
          "Создавайте тёплые поздравления любого формата — от открыток до видео и авторских песен.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteLayout>
      <Hero />
      <Showcase />
      <HowItWorks />
      <CustomOrderCTA />
      <CorporateCTA />
      <ImportantDates />
    </SiteLayout>
  );
}

function SoonBadge() {
  const { t } = useI18n();
  return (
    <span className="rounded-full border border-border/70 bg-card/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
      {t("soon")}
    </span>
  );
}

function Hero() {
  const { t } = useI18n();
  const title = t("hero_title");
  return (
    <section className="relative isolate overflow-hidden bg-warm-gradient">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: "var(--gold)", opacity: 0.35 }} />
        <div className="absolute -right-16 top-48 h-80 w-80 rounded-full blur-3xl" style={{ backgroundColor: "var(--rose)", opacity: 0.3 }} />
      </div>

      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("hero_eyebrow")}
          </span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.03] tracking-tight md:text-6xl lg:text-7xl">
            {title.split("\n").map((line, i) => (
              <span key={i} className="block">
                {i === 1 ? (
                  <span className="bg-gold-gradient bg-clip-text text-transparent">
                    {line}
                  </span>
                ) : (
                  line
                )}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("hero_sub")}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/create"
              className="group inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3.5 text-base font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
            >
              <Wand2 className="h-4 w-4" />
              {t("cta_create")}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3.5 text-base font-medium text-foreground backdrop-blur transition hover:border-primary/40"
            >
              <Gift className="h-4 w-4 text-primary" />
              {t("cta_browse")}
            </Link>
          </div>

          <GiftBanner />
        </div>

        <HeroCardStack />
      </div>
    </section>
  );
}

function HeroCardStack() {
  const [cards, setCards] = useState<HeroCard[]>([]);

  useEffect(() => {
    let alive = true;
    fetchPublicHeroCards()
      .then((rows) => {
        if (alive) setCards(rows.slice(0, 3));
      })
      .catch(() => {
        if (alive) setCards([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const slots = [
    "absolute left-2 top-6 h-72 w-56 rotate-[-8deg]",
    "absolute right-2 top-2 h-80 w-60 rotate-[6deg]",
    "absolute bottom-4 left-1/2 h-64 w-52 -translate-x-1/2 rotate-[2deg]",
  ];

  const rendered = slots.map((slot, i) => {
    const card = cards[i];
    const background =
      card?.gradient ?? HERO_FALLBACK_GRADIENTS[i % HERO_FALLBACK_GRADIENTS.length];
    const inner = card?.resolvedImage ? (
      <img
        src={card.resolvedImage}
        alt={card.altText ?? ""}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    ) : null;
    const className = `${slot} overflow-hidden rounded-3xl border border-border/70 shadow-warm transition hover:-translate-y-1`;
    const style = inner ? undefined : { backgroundImage: background };

    return card ? (
      <Link key={card.id} to={card.linkTo} className={className} style={style}>
        {inner}
      </Link>
    ) : (
      <div key={`slot-${i}`} className={className} style={style} aria-hidden="true" />
    );
  });

  return (
    <div className="relative mx-auto flex h-[440px] w-full max-w-md items-center justify-center">
      {rendered}
    </div>
  );
}

function GiftBanner() {
  const { t } = useI18n();
  return (
    <div className="mt-8 flex max-w-xl items-start gap-4 rounded-3xl border border-border/70 bg-card/80 p-5 shadow-warm backdrop-blur">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
        <Gift className="h-5 w-5 text-primary-foreground" />
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold">{t("gift_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("gift_sub")}</p>
        <Link
          to="/free-greeting"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
        >
          <Gift className="h-3.5 w-3.5" />
          {t("ff_claim_cta")}
        </Link>
      </div>
    </div>
  );
}

function Showcase() {
  const { t } = useI18n();
  return (
    <section className="border-y border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <SectionHeading
          title={t("showcase_title")}
          subtitle={t("showcase_home_sub")}
        />
        <div className="mt-10 flex justify-center">
          <Link
            to="/showcase"
            className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3.5 text-base font-medium text-primary-foreground shadow-warm"
          >
            <Eye className="h-4 w-4" />
            {t("showcase_view")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}


function ImportantDates() {
  const { t } = useI18n();
  const items = [
    { icon: Bell, titleKey: "dates_1_title", bodyKey: "dates_1_body" },
    { icon: CalendarClock, titleKey: "dates_2_title", bodyKey: "dates_2_body" },
    { icon: Clock, titleKey: "dates_3_title", bodyKey: "dates_3_body" },
    { icon: CalendarDays, titleKey: "dates_4_title", bodyKey: "dates_4_body" },
  ] as const;
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
      <SectionHeading title={t("section_dates")} subtitle={t("section_dates_sub")} />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={i} className="rounded-3xl border border-border/70 bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </span>
                <SoonBadge />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{t(it.titleKey)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(it.bodyKey)}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-10 flex justify-center">
        <Link
          to="/calendar"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition hover:border-primary/40"
        >
          {t("nav_calendar")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: Gift, titleKey: "step1_title", bodyKey: "step1_body" },
    { icon: Wand2, titleKey: "step2_title", bodyKey: "step2_body" },
    { icon: MessageSquareHeart, titleKey: "step3_title", bodyKey: "step3_body" },
    { icon: Eye, titleKey: "step4_title", bodyKey: "step4_body" },
    { icon: Send, titleKey: "step5_title", bodyKey: "step5_body" },
  ] as const;
  return (
    <section className="border-y border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <SectionHeading title={t("section_how")} subtitle={t("section_how_sub")} />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6"
              >
                <div className="absolute right-4 top-4 font-display text-5xl italic text-primary/10">
                  0{i + 1}
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold leading-snug">
                  {t(s.titleKey)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(s.bodyKey)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CustomOrderCTA() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-warm-gradient p-10 md:p-14">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <HandHeart className="h-3.5 w-3.5 text-primary" />
            {t("nav_personal")}
            <SoonBadge />
          </span>
          <h3 className="mt-6 font-display text-3xl font-semibold md:text-4xl">
            {t("section_custom")}
          </h3>
          <p className="mt-4 text-muted-foreground md:text-lg">{t("section_custom_sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm"
            >
              {t("cta_create_gift")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CorporateCTA() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-24">
      <div className="grid gap-5 overflow-hidden rounded-3xl border border-border/70 bg-card md:grid-cols-[1.1fr_1fr]">
        <div className="p-10 md:p-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            {t("nav_corporate")}
          </span>
          <h3 className="mt-6 font-display text-3xl font-semibold md:text-4xl">
            {t("section_corp")}
          </h3>
          <p className="mt-4 text-muted-foreground md:text-lg">{t("section_corp_sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/studio"
              search={{ gift: "premium" as const }}
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm"
            >
              {t("cta_create_corporate")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium backdrop-blur"
            >
              {t("nav_pricing")}
            </Link>
          </div>
        </div>
        <div
          className="relative min-h-[280px]"
          style={{
            backgroundImage:
              "linear-gradient(160deg, oklch(0.45 0.11 30), oklch(0.28 0.08 20))",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-between p-8 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
              <Coffee className="h-3.5 w-3.5" /> for teams & clients
            </div>
            <div>
              <div className="font-display text-2xl italic leading-tight opacity-95">
                „Спасибо, что вы с нами."
              </div>
              <div className="mt-3 text-xs opacity-80">— your brand, delivered warmly</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

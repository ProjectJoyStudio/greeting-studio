import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Gift,
  Cake,
  Heart,
  PartyPopper,
  Briefcase,
  Baby,
  HandHeart,
  CalendarHeart,
  Wand2,
  Send,
  Sun,
  Coffee,
  Sunrise,
  Plane,
  Palmtree,
  Moon,
  Mic,
  Music2,
  Video,
  Image as ImageIcon,
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
      <GiftBanner />
      <Formats />
      <Categories />
      <EverydayWishes />
      <DailyGreetings />
      <ImportantDates />
      <HowItWorks />
      <CustomOrderCTA />
      <CorporateCTA />
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
                {i === 1 ? <span className="text-gold-gradient italic">{line}</span> : line}
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

          <div className="mt-10 flex flex-wrap items-center gap-6 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Deutsch</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span>English</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span>Русский</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span>Українська</span>
          </div>
        </div>

        <HeroCardStack />
      </div>
    </section>
  );
}

function HeroCardStack() {
  return (
    <div className="relative mx-auto flex h-[440px] w-full max-w-md items-center justify-center">
      <div
        className="absolute left-2 top-6 h-72 w-56 rotate-[-8deg] rounded-3xl border border-border/70 shadow-warm"
        style={{
          backgroundImage:
            "linear-gradient(160deg, oklch(0.9 0.06 70), oklch(0.72 0.13 45))",
        }}
      >
        <div className="flex h-full flex-col justify-between p-6 text-primary-foreground">
          <span className="font-display text-sm italic opacity-90">to Anna</span>
          <div>
            <div className="font-display text-3xl leading-tight">Happy Birthday</div>
            <div className="mt-1 text-xs opacity-80">with love</div>
          </div>
        </div>
      </div>

      <div
        className="absolute right-2 top-2 h-80 w-60 rotate-[6deg] rounded-3xl border border-border/70 shadow-warm"
        style={{
          backgroundImage:
            "linear-gradient(160deg, oklch(0.42 0.11 30), oklch(0.28 0.08 20))",
        }}
      >
        <div className="flex h-full flex-col justify-between p-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
            <Heart className="h-3.5 w-3.5" /> from Berlin
          </div>
          <div>
            <div className="font-display text-2xl italic leading-tight">
              „Ein warmer Gruß für dich."
            </div>
            <div className="mt-3 text-xs opacity-80">— Project Joy</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 h-64 w-52 -translate-x-1/2 rotate-[2deg] rounded-3xl border border-border/80 bg-card shadow-warm">
        <div className="flex h-full flex-col justify-between p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="uppercase tracking-widest">Card · 001</span>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <div className="font-display text-2xl leading-tight">З Днем народження!</div>
            <div className="mt-2 h-px bg-border" />
            <div className="mt-2 text-xs italic text-muted-foreground">
              Хай радість буде щоденною.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GiftBanner() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-5 pt-14 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 shadow-warm md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ backgroundColor: "var(--gold)", opacity: 0.35 }} />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full blur-3xl" style={{ backgroundColor: "var(--rose)", opacity: 0.25 }} />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
              <Gift className="h-6 w-6 text-primary-foreground" />
            </span>
            <div>
              <h3 className="font-display text-2xl font-semibold md:text-3xl">
                {t("gift_title")}
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                {t("gift_sub")}
              </p>
            </div>
          </div>
          <Link
            to="/create"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold-gradient px-5 py-3 text-sm font-medium text-primary-foreground shadow-warm"
          >
            {t("cta_create")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Formats() {
  const { t } = useI18n();
  const items = [
    {
      icon: ImageIcon,
      titleKey: "fmt1_title",
      bodyKey: "fmt1_body",
      grad: "linear-gradient(140deg, oklch(0.92 0.06 80), oklch(0.72 0.12 55))",
      soon: false,
    },
    {
      icon: Sparkles,
      titleKey: "fmt2_title",
      bodyKey: "fmt2_body",
      grad: "linear-gradient(140deg, oklch(0.88 0.09 30), oklch(0.55 0.15 15))",
      soon: true,
    },
    {
      icon: MessageSquareHeart,
      titleKey: "fmt3_title",
      bodyKey: "fmt3_body",
      grad: "linear-gradient(140deg, oklch(0.9 0.08 350), oklch(0.6 0.14 340))",
      soon: true,
    },
    {
      icon: Music2,
      titleKey: "fmt4_title",
      bodyKey: "fmt4_body",
      grad: "linear-gradient(140deg, oklch(0.86 0.06 260), oklch(0.42 0.1 265))",
      soon: true,
      badges: [Mic, Music2, Video],
    },
    {
      icon: HandHeart,
      titleKey: "fmt5_title",
      bodyKey: "fmt5_body",
      grad: "linear-gradient(140deg, oklch(0.88 0.07 150), oklch(0.5 0.11 160))",
      soon: true,
    },
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
      <SectionHeading
        eyebrow="01"
        title={t("section_formats")}
        subtitle={t("section_formats_sub")}
      />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <article
              key={i}
              className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 transition hover:-translate-y-1 hover:shadow-warm"
            >
              <div
                className="mb-6 grid h-28 place-items-center rounded-2xl"
                style={{ backgroundImage: it.grad }}
              >
                <Icon className="h-9 w-9 text-primary-foreground" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl font-semibold">{t(it.titleKey)}</h3>
                {it.soon && <SoonBadge />}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t(it.bodyKey)}</p>
              {"badges" in it && it.badges && (
                <div className="mt-4 flex gap-2">
                  {it.badges.map((B, k) => (
                    <span
                      key={k}
                      className="grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-secondary/60 text-muted-foreground"
                    >
                      <B className="h-3.5 w-3.5" />
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const categoryIcons = [Cake, Heart, PartyPopper, HandHeart, Gift, Briefcase, Baby, Sparkles];
const categoryKeys = [
  "cat_birthday",
  "cat_love",
  "cat_holiday",
  "cat_thanks",
  "cat_congrats",
  "cat_corporate",
  "cat_newborn",
  "cat_wedding",
] as const;

const categoryGradients = [
  "linear-gradient(140deg, oklch(0.9 0.08 60), oklch(0.7 0.14 35))",
  "linear-gradient(140deg, oklch(0.85 0.1 20), oklch(0.55 0.15 15))",
  "linear-gradient(140deg, oklch(0.88 0.09 90), oklch(0.65 0.13 60))",
  "linear-gradient(140deg, oklch(0.88 0.07 150), oklch(0.55 0.1 160))",
  "linear-gradient(140deg, oklch(0.9 0.1 75), oklch(0.6 0.16 55))",
  "linear-gradient(140deg, oklch(0.86 0.05 260), oklch(0.4 0.08 265))",
  "linear-gradient(140deg, oklch(0.92 0.06 220), oklch(0.72 0.1 210))",
  "linear-gradient(140deg, oklch(0.94 0.05 340), oklch(0.7 0.11 340))",
];

function Categories() {
  const { t } = useI18n();
  return (
    <section className="border-y border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="02"
          title={t("section_categories")}
          subtitle={t("section_categories_sub")}
        />
        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {categoryKeys.map((key, i) => {
            const Icon = categoryIcons[i];
            return (
              <Link
                key={key}
                to="/catalog"
                className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 transition hover:-translate-y-1 hover:shadow-warm"
              >
                <div
                  className="mb-6 grid h-24 place-items-center rounded-2xl"
                  style={{ backgroundImage: categoryGradients[i] }}
                >
                  <Icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-display text-lg font-semibold">{t(key)}</div>
                    <div className="text-xs text-muted-foreground">120+ designs</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EverydayWishes() {
  const { t } = useI18n();
  const items = [
    { icon: Sunrise, key: "wish_morning", grad: "linear-gradient(140deg, oklch(0.94 0.06 80), oklch(0.78 0.12 55))" },
    { icon: Sun, key: "wish_day", grad: "linear-gradient(140deg, oklch(0.92 0.09 70), oklch(0.7 0.14 50))" },
    { icon: Sparkles, key: "wish_luck", grad: "linear-gradient(140deg, oklch(0.9 0.08 150), oklch(0.55 0.12 160))" },
    { icon: Plane, key: "wish_trip", grad: "linear-gradient(140deg, oklch(0.9 0.07 220), oklch(0.55 0.11 220))" },
    { icon: Palmtree, key: "wish_rest", grad: "linear-gradient(140deg, oklch(0.9 0.09 160), oklch(0.5 0.12 180))" },
    { icon: Moon, key: "wish_night", grad: "linear-gradient(140deg, oklch(0.7 0.06 270), oklch(0.35 0.09 265))" },
  ] as const;
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
      <SectionHeading
        eyebrow="03"
        title={t("section_wishes")}
        subtitle={t("section_wishes_sub")}
      />
      <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <Link
              key={i}
              to="/daily"
              className="group overflow-hidden rounded-3xl border border-border/70 bg-card transition hover:-translate-y-1 hover:shadow-warm"
            >
              <div className="grid h-28 place-items-center" style={{ backgroundImage: it.grad }}>
                <Icon className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="px-4 py-4 text-center">
                <div className="font-display text-base font-semibold">{t(it.key)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DailyGreetings() {
  const { t } = useI18n();
  const items = [
    { title: "International Friendship Day", tag: "Today", grad: "linear-gradient(160deg, oklch(0.86 0.11 55), oklch(0.55 0.16 30))" },
    { title: "Grandparents Day", tag: "Tomorrow", grad: "linear-gradient(160deg, oklch(0.88 0.08 150), oklch(0.5 0.1 165))" },
    { title: "World Kindness Day", tag: "Nov 13", grad: "linear-gradient(160deg, oklch(0.88 0.09 20), oklch(0.55 0.16 12))" },
  ];
  return (
    <section className="border-y border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">04</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {t("section_daily")}
            </h2>
            <p className="mt-3 max-w-lg text-muted-foreground">{t("section_daily_sub")}</p>
          </div>
          <Link
            to="/daily"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition hover:border-primary/40"
          >
            {t("nav_daily")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map((it, i) => (
            <article
              key={i}
              className="group overflow-hidden rounded-3xl border border-border/70 bg-card transition hover:-translate-y-1 hover:shadow-warm"
            >
              <div className="h-52" style={{ backgroundImage: it.grad }}>
                <div className="flex h-full items-end justify-between p-6 text-primary-foreground">
                  <span className="rounded-full bg-black/20 px-3 py-1 text-xs uppercase tracking-widest backdrop-blur">
                    {it.tag}
                  </span>
                  <CalendarHeart className="h-6 w-6 opacity-90" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl font-semibold">{it.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A hand-selected greeting collection tuned for this occasion.
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
                  Open collection
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </div>
            </article>
          ))}
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
      <SectionHeading eyebrow="05" title={t("section_dates")} subtitle={t("section_dates_sub")} />
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
        <SectionHeading eyebrow="06" title={t("section_how")} subtitle={t("section_how_sub")} />
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
              to="/personal-orders"
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm"
            >
              {t("cta_custom")}
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
              to="/corporate-orders"
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm"
            >
              {t("cta_corp")}
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

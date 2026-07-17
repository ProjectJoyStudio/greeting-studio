import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Gift, Cake, Heart, PartyPopper, Briefcase, Baby, HandHeart, CalendarHeart, Wand2, Send } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SectionHeading } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <SiteLayout>
      <Hero />
      <Categories />
      <DailyGreetings />
      <HowItWorks />
    </SiteLayout>
  );
}

function Hero() {
  const { t } = useI18n();
  const title = t("hero_title");
  return (
    <section className="relative isolate overflow-hidden bg-warm-gradient">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-gold/40 blur-3xl" style={{ backgroundColor: "var(--gold)", opacity: 0.35 }} />
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

      <div
        className="absolute bottom-4 left-1/2 h-64 w-52 -translate-x-1/2 rotate-[2deg] rounded-3xl border border-border/80 bg-card shadow-warm"
      >
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
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
      <SectionHeading
        eyebrow="01"
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
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">02</span>
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

function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: Gift, title: t("step1_title"), body: t("step1_body") },
    { icon: Wand2, title: t("step2_title"), body: t("step2_body") },
    { icon: Send, title: t("step3_title"), body: t("step3_body") },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
      <SectionHeading eyebrow="03" title={t("section_how")} subtitle={t("section_how_sub")} />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8"
            >
              <div className="absolute right-6 top-6 font-display text-6xl italic text-primary/10">
                0{i + 1}
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </span>
              <h3 className="mt-6 font-display text-2xl font-semibold">{s.title}</h3>
              <p className="mt-3 text-muted-foreground">{s.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-16 overflow-hidden rounded-3xl border border-border/70 bg-warm-gradient p-10 text-center md:p-16">
        <h3 className="mx-auto max-w-2xl font-display text-3xl font-semibold md:text-4xl">
          Ready to send something people <span className="text-gold-gradient italic">actually keep?</span>
        </h3>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm"
          >
            {t("cta_create")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3 text-sm font-medium backdrop-blur"
          >
            {t("nav_pricing")}
          </Link>
        </div>
      </div>
    </section>
  );
}

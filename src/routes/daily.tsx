import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Everyday Greetings — Project Joy" },
      { name: "description", content: "Warm greetings for the small moments of everyday life." },
      { property: "og:title", content: "Everyday Greetings — Project Joy" },
      { property: "og:description", content: "Warm greetings for the small moments of everyday life." },
    ],
  }),
  component: DailyPage,
});

// `slug` is the stable database occasion slug — filtering never uses the
// translated label, so the same link works in every interface language.
const EVERYDAY_ITEMS: { key: string; slug: string; grad: string }[] = [
  { key: "ev_good_morning", slug: "good_morning", grad: "linear-gradient(160deg, oklch(0.9 0.09 75), oklch(0.6 0.15 45))" },
  { key: "ev_good_night", slug: "good_night", grad: "linear-gradient(160deg, oklch(0.7 0.1 260), oklch(0.35 0.12 275))" },
  { key: "ev_nice_day", slug: "nice_day", grad: "linear-gradient(160deg, oklch(0.9 0.09 95), oklch(0.6 0.14 70))" },
  { key: "ev_good_luck", slug: "good_luck", grad: "linear-gradient(160deg, oklch(0.88 0.1 145), oklch(0.55 0.13 160))" },
  { key: "ev_love_you", slug: "i_love_you", grad: "linear-gradient(160deg, oklch(0.88 0.1 20), oklch(0.55 0.17 15))" },
  { key: "ev_miss_you", slug: "i_miss_you", grad: "linear-gradient(160deg, oklch(0.87 0.08 340), oklch(0.5 0.14 335))" },
  { key: "ev_thank_you", slug: "thank_you", grad: "linear-gradient(160deg, oklch(0.9 0.09 55), oklch(0.55 0.14 40))" },
  { key: "ev_sorry", slug: "forgive_me", grad: "linear-gradient(160deg, oklch(0.85 0.06 250), oklch(0.5 0.09 255))" },
  { key: "ev_get_well", slug: "get_well", grad: "linear-gradient(160deg, oklch(0.88 0.09 180), oklch(0.55 0.12 195))" },
  { key: "ev_safe_trip", slug: "safe_travels", grad: "linear-gradient(160deg, oklch(0.88 0.09 210), oklch(0.5 0.13 225))" },
  { key: "ev_on_my_way", slug: "thinking_of_you", grad: "linear-gradient(160deg, oklch(0.88 0.08 130), oklch(0.55 0.13 145))" },
  { key: "ev_running_late", slug: "forgive_me", grad: "linear-gradient(160deg, oklch(0.88 0.09 35), oklch(0.55 0.16 25))" },
  { key: "ev_great_weekend", slug: "happy_weekend", grad: "linear-gradient(160deg, oklch(0.9 0.09 110), oklch(0.55 0.14 90))" },
  { key: "ev_wonderful_vacation", slug: "safe_travels", grad: "linear-gradient(160deg, oklch(0.9 0.09 200), oklch(0.55 0.15 215))" },
  { key: "ev_welcome", slug: "congratulations", grad: "linear-gradient(160deg, oklch(0.9 0.09 60), oklch(0.55 0.15 45))" },
];

function DailyPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_daily")} title={t("page_daily_title")} subtitle={t("page_daily_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EVERYDAY_ITEMS.map((it) => (
            <Link
              key={it.key}
              to="/catalog"
              search={{ occasion: it.slug }}
              className="group overflow-hidden rounded-3xl border border-border/70 bg-card transition hover:-translate-y-1 hover:shadow-warm"
            >
              <div className="h-40" style={{ backgroundImage: it.grad }} />
              <div className="flex items-center justify-between p-5">
                <h3 className="font-display text-lg font-semibold">{t(it.key)}</h3>
                <Sparkles className="h-4 w-4 text-primary opacity-70 transition group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
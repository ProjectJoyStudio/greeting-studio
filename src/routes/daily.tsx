import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { CalendarHeart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Greetings — Project Joy" },
      { name: "description", content: "A fresh selection of digital greetings every day, tuned to today's occasions." },
    ],
  }),
  component: DailyPage,
});

function DailyPage() {
  const { t } = useI18n();
  const items = [
    { day: "Today", title: "International Friendship Day", grad: "linear-gradient(160deg, oklch(0.88 0.1 55), oklch(0.55 0.16 30))" },
    { day: "Tomorrow", title: "Grandparents Day", grad: "linear-gradient(160deg, oklch(0.88 0.08 150), oklch(0.5 0.1 165))" },
    { day: "Nov 13", title: "World Kindness Day", grad: "linear-gradient(160deg, oklch(0.88 0.09 20), oklch(0.55 0.16 12))" },
    { day: "Nov 20", title: "Children's Day", grad: "linear-gradient(160deg, oklch(0.9 0.09 220), oklch(0.55 0.13 240))" },
    { day: "Nov 25", title: "Thanksgiving Eve", grad: "linear-gradient(160deg, oklch(0.9 0.08 65), oklch(0.5 0.14 45))" },
    { day: "Dec 6", title: "St. Nicholas Day", grad: "linear-gradient(160deg, oklch(0.9 0.09 340), oklch(0.5 0.14 340))" },
  ];
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_daily")} title={t("page_daily_title")} subtitle={t("page_daily_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <article key={i} className="group overflow-hidden rounded-3xl border border-border/70 bg-card transition hover:-translate-y-1 hover:shadow-warm">
              <div className="h-56" style={{ backgroundImage: it.grad }}>
                <div className="flex h-full items-end justify-between p-6 text-primary-foreground">
                  <span className="rounded-full bg-black/20 px-3 py-1 text-xs uppercase tracking-widest backdrop-blur">{it.day}</span>
                  <CalendarHeart className="h-6 w-6 opacity-90" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl font-semibold">{it.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Discover a curated set of designs and message ideas for this moment.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  12 designs
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
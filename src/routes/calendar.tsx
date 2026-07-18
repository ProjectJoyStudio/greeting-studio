import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Occasion Calendar — Project Joy" },
      { name: "description", content: "Every holiday, name day, and moment worth marking — in one warm calendar." },
    ],
  }),
  component: CalendarPage,
});

const monthDefs: { month: number; events: string[] }[] = [
  { month: 1, events: ["evt_new_year", "evt_orthodox_christmas", "evt_mlk"] },
  { month: 2, events: ["evt_valentines", "evt_family_day", "evt_defenders_day"] },
  { month: 3, events: ["evt_womens_day", "evt_st_patrick", "evt_first_spring"] },
  { month: 4, events: ["evt_easter", "evt_earth_day", "evt_passover"] },
  { month: 5, events: ["evt_labour_day", "evt_victory_day", "evt_mothers_day"] },
  { month: 6, events: ["evt_fathers_day", "evt_constitution_day", "evt_midsummer"] },
  { month: 7, events: ["evt_indep_us", "evt_bastille"] },
  { month: 8, events: ["evt_indep_ua", "evt_assumption"] },
  { month: 9, events: ["evt_grandparents", "evt_german_unity", "evt_autumn"] },
  { month: 10, events: ["evt_oktoberfest", "evt_halloween", "evt_thanksgiving_ca"] },
  { month: 11, events: ["evt_all_saints", "evt_kindness", "evt_thanksgiving_us"] },
  { month: 12, events: ["evt_st_nicholas", "evt_hanukkah", "evt_christmas", "evt_nye"] },
];

function CalendarPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_calendar")} title={t("page_calendar_title")} subtitle={t("page_calendar_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {monthDefs.map((m) => (
            <div key={m.month} className="rounded-3xl border border-border/70 bg-card p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl font-semibold">{t(`month_${m.month}`)}</h3>
                <span className="font-display text-3xl italic text-primary/25">
                  {String(m.month).padStart(2, "0")}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {m.events.map((e) => (
                  <li key={e} className="flex items-center gap-2 border-b border-border/40 py-1.5 last:border-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-foreground/80">{t(e)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
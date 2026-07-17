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

const months = [
  { name: "January", events: ["New Year", "Orthodox Christmas", "Martin Luther King Day"] },
  { name: "February", events: ["Valentine's Day", "Family Day", "Defender's Day"] },
  { name: "March", events: ["Women's Day", "St. Patrick's", "First day of spring"] },
  { name: "April", events: ["Easter", "Earth Day", "Passover"] },
  { name: "May", events: ["Labour Day", "Victory Day", "Mother's Day"] },
  { name: "June", events: ["Father's Day", "Constitution Day", "Midsummer"] },
  { name: "July", events: ["Independence Day (US)", "Bastille Day"] },
  { name: "August", events: ["Ukraine Independence Day", "Assumption Day"] },
  { name: "September", events: ["Grandparents Day", "German Unity prep", "Autumn Equinox"] },
  { name: "October", events: ["Oktoberfest", "Halloween", "Thanksgiving (CA)"] },
  { name: "November", events: ["All Saints", "Kindness Day", "Thanksgiving (US)"] },
  { name: "December", events: ["St. Nicholas", "Hanukkah", "Christmas", "New Year's Eve"] },
];

function CalendarPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_calendar")} title={t("page_calendar_title")} subtitle={t("page_calendar_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((m, i) => (
            <div key={m.name} className="rounded-3xl border border-border/70 bg-card p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl font-semibold">{m.name}</h3>
                <span className="font-display text-3xl italic text-primary/25">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {m.events.map((e) => (
                  <li key={e} className="flex items-center gap-2 border-b border-border/40 py-1.5 last:border-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-foreground/80">{e}</span>
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
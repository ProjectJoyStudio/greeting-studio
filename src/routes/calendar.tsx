import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Gift, Trash2, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Your Calendar — Project Joy" },
      { name: "description", content: "Add your own dates and prepare greetings ahead of time." },
      { property: "og:title", content: "Your Calendar — Project Joy" },
      { property: "og:description", content: "Add your own dates and prepare greetings ahead of time." },
    ],
  }),
  component: CalendarPage,
});

type CalEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  recipient?: string;
};

const STORAGE_KEY = "pj_calendar_events";

function loadEvents(): CalEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.date === "string" && typeof e.name === "string");
  } catch {
    return [];
  }
}

function CalendarPage() {
  const { t } = useI18n();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [recipient, setRecipient] = useState("");

  useEffect(() => {
    setEvents(loadEvents());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // ignore
    }
  }, [events, hydrated]);

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name.trim()) return;
    const item: CalEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      name: name.trim(),
      recipient: recipient.trim() || undefined,
    };
    setEvents((prev) => [...prev, item]);
    setDate("");
    setName("");
    setRecipient("");
  };

  const remove = (id: string) => setEvents((prev) => prev.filter((e) => e.id !== id));

  const examples = [
    "cal_ex_christmas",
    "cal_ex_easter",
    "cal_ex_moms_birthday",
    "cal_ex_anniversary",
    "cal_ex_graduation",
    "cal_ex_family",
  ];

  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_calendar")} title={t("page_calendar_title")} subtitle={t("page_calendar_sub")} />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1fr_1.2fr] lg:px-8">
        <div className="rounded-3xl border border-border/70 bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">{t("cal_add_event")}</h2>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/80">{t("cal_date")}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/80">{t("cal_event_name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("cal_event_name_ph")}
                required
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/80">{t("cal_recipient")}</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={t("cal_recipient_ph")}
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
            >
              <Sparkles className="h-4 w-4" />
              {t("cal_save_event")}
            </button>
          </form>
          <div className="mt-6 rounded-2xl border border-dashed border-border/70 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("cal_examples")}
            </p>
            <div className="flex flex-wrap gap-2">
              {examples.map((k) => (
                <span key={k} className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground/70">
                  {t(k)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">{t("cal_your_events")}</h2>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("cal_no_events")}</p>
          ) : (
            <ul className="space-y-3">
              {sorted.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-base font-semibold text-foreground">{e.name}</span>
                      <span className="text-xs text-muted-foreground">{e.date}</span>
                    </div>
                    {e.recipient && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("cal_recipient")}: {e.recipient}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/catalog"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground/80 hover:text-foreground"
                    >
                      {t("cal_choose_card")}
                    </Link>
                    <Link
                      to="/studio"
                      className="inline-flex items-center gap-1.5 rounded-full bg-gold-gradient px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-warm"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      {t("cal_create_gift")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      aria-label={t("cal_delete")}
                      className="grid h-8 w-8 place-items-center rounded-full border border-border/70 text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
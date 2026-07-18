import { createFileRoute } from "@tanstack/react-router";
import { Send, CalendarClock, FileText, Coins } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { t } = useI18n();
  const stats = [
    { key: "dash_stat_sent", icon: Send },
    { key: "dash_stat_scheduled", icon: CalendarClock },
    { key: "dash_stat_drafts", icon: FileText },
    { key: "dash_stat_credits", icon: Coins },
  ] as const;
  return (
    <div>
      <DashboardPageHeader titleKey="dash_title" subtitleKey="dash_sub" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur"
          >
            <Icon className="h-4 w-4 text-primary/70" />
            <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
              0
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {t(key)}
            </div>
          </div>
        ))}
      </div>
      <section className="mt-8 rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          {t("dash_recent")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("dash_empty")}</p>
      </section>
    </div>
  );
}
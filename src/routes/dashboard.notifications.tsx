import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t } = useI18n();
  return (
    <div>
      <DashboardPageHeader titleKey="notif_title" subtitleKey="notif_sub" />
      <div className="rounded-2xl border border-border/60 bg-card/70 p-10 text-center backdrop-blur">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <p className="mt-4 text-sm text-muted-foreground">{t("notif_empty")}</p>
      </div>
    </div>
  );
}
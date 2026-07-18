import { createFileRoute } from "@tanstack/react-router";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useI18n();
  return (
    <div>
      <DashboardPageHeader titleKey="profile_title" subtitleKey="profile_sub" />
      <form
        className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("profile_avatar")}
            </span>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-gold-gradient text-lg font-semibold text-primary-foreground shadow-warm">
                PJ
              </span>
              <button
                type="button"
                className="rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-foreground transition hover:bg-secondary"
              >
                {t("common_edit")}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("profile_display_name")}
            </span>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("email")}
            </span>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("profile_bio")}
            </span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
          >
            {t("profile_save")}
          </button>
        </div>
      </form>
    </div>
  );
}
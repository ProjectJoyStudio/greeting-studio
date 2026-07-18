import { createFileRoute } from "@tanstack/react-router";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { LANGS, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const toggles = [
    { key: "settings_email_notif" },
    { key: "settings_push_notif" },
    { key: "settings_marketing" },
  ] as const;
  return (
    <div>
      <DashboardPageHeader titleKey="settings_title" subtitleKey="settings_sub" />
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("settings_language")}
            </span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <ul className="divide-y divide-border/60">
            {toggles.map((row) => (
              <li key={row.key} className="flex items-center justify-between py-3">
                <span className="text-sm text-foreground">{t(row.key)}</span>
                <span className="inline-flex h-5 w-9 items-center rounded-full bg-secondary p-0.5">
                  <span className="h-4 w-4 rounded-full bg-background shadow-sm" />
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-destructive/40 bg-card/70 p-6 backdrop-blur">
          <h2 className="font-display text-base font-semibold text-foreground">
            {t("settings_delete")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings_delete_body")}</p>
          <button
            type="button"
            className="mt-4 inline-flex items-center justify-center rounded-full border border-destructive/60 bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            {t("settings_delete")}
          </button>
        </section>
      </div>
    </div>
  );
}
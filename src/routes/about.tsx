import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Project Joy" },
      { name: "description", content: "The team behind Project Joy — digital greetings crafted with warmth." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_about")} title={t("page_about_title")} subtitle={t("page_about_sub")} />
      <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8">
        <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>{t("about_body_1")}</p>
          <p>{t("about_body_2")}</p>
          <p className="font-display text-2xl italic text-foreground">"{t("about_quote")}"</p>
          <p>{t("about_body_3")}</p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {[
            { k: "500k+", v: t("about_stat_sent") },
            { k: "4", v: t("about_stat_langs") },
            { k: "12", v: t("about_stat_countries") },
          ].map((s) => (
            <div key={s.k} className="rounded-3xl border border-border/70 bg-card p-6 text-center">
              <div className="font-display text-4xl font-semibold text-gold-gradient">{s.k}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
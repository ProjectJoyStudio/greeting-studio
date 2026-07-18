import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { Building2, Users, Palette, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/corporate-orders")({
  head: () => ({
    meta: [
      { title: "Corporate Orders — Project Joy" },
      { name: "description", content: "Branded digital greetings at scale for clients, teams, and partners." },
    ],
  }),
  component: CorporateOrdersPage,
});

function CorporateOrdersPage() {
  const { t } = useI18n();
  const perks = [
    { icon: Palette, title: t("corp_perk1_t"), body: t("corp_perk1_b") },
    { icon: Users, title: t("corp_perk2_t"), body: t("corp_perk2_b") },
    { icon: ShieldCheck, title: t("corp_perk3_t"), body: t("corp_perk3_b") },
    { icon: Building2, title: t("corp_perk4_t"), body: t("corp_perk4_b") },
  ];
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_corporate")} title={t("page_corporate_title")} subtitle={t("page_corporate_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {perks.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex gap-5 rounded-3xl border border-border/70 bg-card p-8">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-border/70 bg-warm-gradient p-10 md:p-14">
          <h3 className="max-w-2xl font-display text-3xl font-semibold md:text-4xl">
            {t("corp_forward_1")} <span className="text-gold-gradient italic">{t("corp_forward_em")}</span> {t("corp_forward_2")}
          </h3>
          <button className="mt-8 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm">
            {t("cta_corp")}
          </button>
        </div>
      </section>
    </SiteLayout>
  );
}
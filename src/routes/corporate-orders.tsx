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
    { icon: Palette, title: "Fully branded", body: "Your logo, colors, and typography — reflected in every greeting." },
    { icon: Users, title: "Bulk delivery", body: "Send thousands of unique greetings from a single upload." },
    { icon: ShieldCheck, title: "Enterprise-ready", body: "SSO, data residency, and audit logs available on request." },
    { icon: Building2, title: "Dedicated design", body: "A designer works with your brand team to craft the collection." },
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
            Send greetings your customers <span className="text-gold-gradient italic">forward</span> to friends.
          </h3>
          <button className="mt-8 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm">
            Talk to sales
          </button>
        </div>
      </section>
    </SiteLayout>
  );
}
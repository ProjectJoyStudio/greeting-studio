import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Project Joy" },
      { name: "description", content: "Simple, warm pricing for digital greetings. Start free, upgrade any time." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { t } = useI18n();
  const tiers = [
    {
      name: t("free"),
      price: "€0",
      tag: "Start here",
      features: ["10 greetings per month", "50 free templates", "4 languages", "Send by link"],
      highlight: false,
    },
    {
      name: t("premium"),
      price: "€6",
      tag: "Most loved",
      features: ["Unlimited greetings", "All premium templates", "Custom photos & fonts", "Scheduled delivery", "Priority support"],
      highlight: true,
    },
    {
      name: t("business"),
      price: "€49",
      tag: "For teams",
      features: ["Everything in Premium", "Team workspace", "Branded designs", "Bulk delivery", "Dedicated designer"],
      highlight: false,
    },
  ];
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_pricing")} title={t("page_pricing_title")} subtitle={t("page_pricing_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                "relative rounded-3xl border p-8 " +
                (tier.highlight
                  ? "border-primary/50 bg-warm-gradient shadow-warm"
                  : "border-border/70 bg-card")
              }
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {tier.tag}
                </span>
                {tier.highlight && (
                  <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-primary-foreground">
                    ★
                  </span>
                )}
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{t("per_month")}</span>
              </div>
              <button
                className={
                  "mt-6 w-full rounded-full px-5 py-3 text-sm font-medium transition " +
                  (tier.highlight
                    ? "bg-gold-gradient text-primary-foreground shadow-warm"
                    : "border border-border bg-card hover:border-primary/40")
                }
              >
                {t("get_started")}
              </button>
              <ul className="mt-8 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/80">{f}</span>
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
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Sparkles } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";
import { creditWord } from "@/lib/credits/i18n";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Buy credits — Project Joy" },
      {
        name: "description",
        content: "Choose a Project Joy credit package and keep creating heartfelt gifts.",
      },
      { property: "og:title", content: "Buy credits — Project Joy" },
      {
        property: "og:description",
        content: "Credit packages for cards, animations, videos and premium Project Joy gifts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreditsPurchasePage,
});

const PACKAGES = [
  { id: "starter", credits: 20, price: "€9", nameKey: "credit_pkg_starter", descKey: "credit_pkg_starter_desc" },
  { id: "popular", credits: 50, price: "€19", nameKey: "credit_pkg_popular", descKey: "credit_pkg_popular_desc", highlight: true },
  { id: "value", credits: 100, price: "€35", nameKey: "credit_pkg_value", descKey: "credit_pkg_value_desc" },
  { id: "premium", credits: 250, price: "€79", nameKey: "credit_pkg_premium", descKey: "credit_pkg_premium_desc" },
];

function CreditsPurchasePage() {
  const { t, lang } = useI18n();
  const { balance, isTest } = useCreditBalance();

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-5 py-16 lg:px-8 lg:py-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          {t("credits_page_title")}
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{t("credits_page_sub")}</p>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 px-5 py-4 backdrop-blur">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Coins className="h-4 w-4 text-primary" />
            {t("credits_balance")}
          </span>
          <span className="font-display text-lg font-semibold">
            {balance} {creditWord(lang, isTest, t("studio_credits_word"))}
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PACKAGES.map((p) => (
            <article
              key={p.id}
              className={`relative flex flex-col rounded-3xl border p-6 ${
                p.highlight ? "border-primary/60 bg-primary/[0.04] shadow-warm" : "border-border bg-card/70"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2 right-5 inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground shadow-warm">
                  <Sparkles className="h-3 w-3" />
                  {t("credit_most_popular")}
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-semibold tracking-tight">{t(p.nameKey)}</h2>
                <span className="font-display text-lg font-semibold text-primary">{p.price}</span>
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Coins className="h-3 w-3 text-primary" />
                {p.credits} {t("studio_credits_word")}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t(p.descKey)}</p>
              <button
                type="button"
                disabled
                className="mt-6 inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                {t("soon")}
              </button>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">{t("credits_page_soon")}</p>
      </section>
    </SiteLayout>
  );
}
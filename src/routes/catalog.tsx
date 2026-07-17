import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Greeting Catalog — Project Joy" },
      { name: "description", content: "Browse hundreds of premium digital greeting designs across every occasion." },
    ],
  }),
  component: CatalogPage,
});

const gradients = [
  "linear-gradient(160deg, oklch(0.9 0.09 55), oklch(0.6 0.15 30))",
  "linear-gradient(160deg, oklch(0.86 0.11 20), oklch(0.5 0.15 10))",
  "linear-gradient(160deg, oklch(0.9 0.08 90), oklch(0.6 0.13 65))",
  "linear-gradient(160deg, oklch(0.85 0.08 340), oklch(0.5 0.12 340))",
  "linear-gradient(160deg, oklch(0.88 0.09 150), oklch(0.5 0.11 165))",
  "linear-gradient(160deg, oklch(0.85 0.07 240), oklch(0.4 0.09 260))",
  "linear-gradient(160deg, oklch(0.9 0.07 45), oklch(0.42 0.11 30))",
  "linear-gradient(160deg, oklch(0.88 0.1 75), oklch(0.55 0.14 55))",
  "linear-gradient(160deg, oklch(0.85 0.05 200), oklch(0.5 0.08 220))",
];

function CatalogPage() {
  const { t } = useI18n();
  const filters = [
    t("cat_birthday"),
    t("cat_love"),
    t("cat_holiday"),
    t("cat_thanks"),
    t("cat_congrats"),
    t("cat_wedding"),
    t("cat_newborn"),
    t("cat_corporate"),
  ];
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_catalog")} title={t("page_catalog_title")} subtitle={t("page_catalog_sub")}>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground">All</button>
          {filters.map((f) => (
            <button key={f} className="rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur transition hover:border-primary/40">
              {f}
            </button>
          ))}
        </div>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <article key={i} className="group overflow-hidden rounded-3xl border border-border/70 bg-card transition hover:-translate-y-1 hover:shadow-warm">
              <div className="aspect-[4/5]" style={{ backgroundImage: gradients[i % gradients.length] }}>
                <div className="flex h-full flex-col justify-between p-6 text-primary-foreground">
                  <span className="rounded-full bg-black/20 px-3 py-1 text-[10px] uppercase tracking-widest backdrop-blur">Card 0{i + 1}</span>
                  <div>
                    <div className="font-display text-2xl italic">Warmest wishes</div>
                    <div className="mt-1 text-xs opacity-80">to someone dear</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-semibold">Design N°{100 + i}</div>
                  <div className="text-xs text-muted-foreground">{filters[i % filters.length]}</div>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                  <Heart className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
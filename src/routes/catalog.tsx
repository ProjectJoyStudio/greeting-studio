import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { Heart, Search } from "lucide-react";
import { useMemo, useState } from "react";

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
  const filterKeys = [
    "cat_birthday", "cat_mother", "cat_father", "cat_wife", "cat_husband",
    "cat_children", "cat_friends", "cat_love", "cat_wedding", "cat_anniversary",
    "cat_newborn", "cat_congrats", "cat_graduation", "cat_teacher",
    "cat_christmas", "cat_newyear", "cat_easter", "cat_holiday",
    "cat_thanks", "cat_getwell", "cat_luck", "cat_corporate",
  ];
  const [active, setActive] = useState<string>("all");
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    return filterKeys.map((k, i) => ({ key: k, label: t(k), index: i }));
  }, [filterKeys, t]);

  const visible = items.filter((it) => {
    const inCat = active === "all" || it.key === active;
    const inQuery = !query.trim() || it.label.toLowerCase().includes(query.trim().toLowerCase());
    return inCat && inQuery;
  });
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_catalog")} title={t("page_catalog_title")} subtitle={t("page_catalog_sub")}>
        <div className="flex flex-col gap-4">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("catalog_search_ph")}
              className="w-full rounded-full border border-border bg-card/70 py-2 pl-9 pr-4 text-sm text-foreground shadow-sm outline-none backdrop-blur transition placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActive("all")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${active === "all" ? "bg-primary text-primary-foreground" : "border border-border bg-card/70 text-foreground/80 hover:border-primary/40"}`}
            >
              {t("catalog_all")}
            </button>
            {filterKeys.map((k) => (
              <button
                key={k}
                onClick={() => setActive(k)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${active === k ? "bg-primary text-primary-foreground" : "border border-border bg-card/70 text-foreground/80 hover:border-primary/40"}`}
              >
                {t(k)}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("catalog_no_results")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
            {visible.map((it, i) => (
              <article key={it.key} className="group overflow-hidden rounded-3xl border border-border/70 bg-card transition hover:-translate-y-1 hover:shadow-warm">
                <div className="aspect-[4/5]" style={{ backgroundImage: gradients[it.index % gradients.length] }}>
                  <div className="flex h-full flex-col justify-between p-6 text-primary-foreground">
                    <span className="rounded-full bg-black/20 px-3 py-1 text-[10px] uppercase tracking-widest backdrop-blur">
                      {t("catalog_card_tag")} {String(it.index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="font-display text-2xl italic">{t("catalog_card_wish")}</div>
                      <div className="mt-1 text-xs opacity-80">{t("catalog_card_sub")}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t("catalog_card_wish")}</div>
                    <div className="truncate text-xs text-muted-foreground">{it.label}</div>
                  </div>
                  <button aria-label="favorite" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { CatalogGrid } from "@/components/catalog/CatalogGrid";
import { useI18n } from "@/lib/i18n";
import { categoryLabel, slugToParam } from "@/lib/catalog/categories";
import { filterCards, usePublicCards, usePublicOccasions } from "@/lib/catalog/usePublicCards";

export const Route = createFileRoute("/catalog/")({
  head: () => ({
    meta: [
      { title: "Greeting Catalog — Project Joy" },
      { name: "description", content: "Browse hundreds of premium digital greeting designs across every occasion." },
      { property: "og:title", content: "Greeting Catalog — Project Joy" },
      { property: "og:description", content: "Browse premium digital greeting designs by occasion, style, and language." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/catalog" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/catalog" }],
  }),
  component: CatalogIndexPage,
});

function CatalogIndexPage() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const cardsQuery = usePublicCards();
  const occasionsQuery = usePublicOccasions();

  const cards = useMemo(
    () => filterCards(cardsQuery.data ?? [], { query, lang }),
    [cardsQuery.data, query, lang],
  );

  const chipClass =
    "rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40";

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
          {/* Category buttons live only here; each opens a dedicated page. */}
          <div className="flex flex-wrap gap-2">
            <Link
              to="/catalog/$category"
              params={{ category: "all" }}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
            >
              {t("catalog_all")}
            </Link>
            {(occasionsQuery.data ?? []).map((slug) => (
              <Link
                key={slug}
                to="/catalog/$category"
                params={{ category: slugToParam(slug) }}
                className={chipClass}
              >
                {categoryLabel(slug, lang, t)}
              </Link>
            ))}
          </div>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <CatalogGrid cards={cards} dense loading={cardsQuery.isLoading} />
      </section>
    </SiteLayout>
  );
}
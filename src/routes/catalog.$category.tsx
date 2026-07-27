import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { CatalogGrid } from "@/components/catalog/CatalogGrid";
import { useI18n } from "@/lib/i18n";
import { EVERYDAY_SLUGS, categoryLabel, paramToSlug } from "@/lib/catalog/categories";
import { filterCards, usePublicCards } from "@/lib/catalog/usePublicCards";

// One reusable template serves every category, including ones created later in
// the admin panel: the URL segment is resolved to a stable database slug at
// runtime, so no new code is needed per category.
export const Route = createFileRoute("/catalog/$category")({
  head: ({ params }) => {
    const pretty = params.category
      .replace(/-/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
    const title = `${pretty} Cards — Project Joy`;
    const description = `Official Project Joy greeting cards for ${pretty.toLowerCase()}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `/catalog/${params.category}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/catalog/${params.category}` }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const slug = paramToSlug(category);
  const isAll = slug === "all";
  const cardsQuery = usePublicCards();

  const cards = useMemo(
    () => filterCards(cardsQuery.data ?? [], { category: isAll ? undefined : slug, query, lang }),
    [cardsQuery.data, isAll, slug, query, lang],
  );

  const title = isAll ? t("catalog_all") : categoryLabel(slug, lang, t);
  const isEveryday = EVERYDAY_SLUGS.includes(slug);

  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_catalog")} title={title} subtitle={t("catalog_category_desc")}>
        <div className="flex flex-col gap-4">
          <Breadcrumbs
            items={[
              { label: t("bc_home"), to: "/" },
              { label: t("nav_catalog"), to: "/catalog" },
              ...(isEveryday ? [{ label: t("nav_daily"), to: "/daily" }] : []),
              { label: title },
            ]}
          />
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("catalog_search_in_category")}
              className="w-full rounded-full border border-border bg-card/70 py-2 pl-9 pr-4 text-sm text-foreground shadow-sm outline-none backdrop-blur transition placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <CatalogGrid
          cards={cards}
          dense={isAll}
          loading={cardsQuery.isLoading}
          emptyText={t("catalog_empty_category")}
        />
      </section>
    </SiteLayout>
  );
}
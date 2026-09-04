import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/memory-book")({
  head: () => ({
    meta: [
      { title: "Book of Memories and Greetings — Project Joy" },
      {
        name: "description",
        content:
          "A keepsake book of memories and greetings collected for someone you love. This Project Joy section is coming soon.",
      },
      { property: "og:title", content: "Book of Memories and Greetings" },
      {
        property: "og:description",
        content: "A keepsake book of memories and greetings — coming soon to Project Joy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryBookPage,
});

function MemoryBookPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader
        eyebrow={t("brand")}
        title={t("gift_memory_book")}
        subtitle={t("mb_page_sub")}
      >
        <Breadcrumbs items={[{ label: t("bc_home"), to: "/" }, { label: t("gift_memory_book") }]} />
      </PageHeader>

      <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <div className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-warm">
          <p className="text-sm font-medium uppercase tracking-widest text-primary/80">
            {t("mb_soon")}
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

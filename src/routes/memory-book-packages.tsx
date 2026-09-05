import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/memory-book-packages")({
  head: () => ({
    meta: [
      { title: "Memory Book packages — Project Joy" },
      { name: "description", content: "Packages for the Project Joy Book of Memories and Greetings." },
      { property: "og:title", content: "Memory Book packages — Project Joy" },
      { property: "og:description", content: "Packages for the Project Joy Book of Memories and Greetings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryBookPackagesPage,
});

function MemoryBookPackagesPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("brand")} title={t("mb_packages_title")} subtitle={t("mb_packages_sub")}>
        <Breadcrumbs
          items={[
            { label: t("bc_home"), to: "/" },
            { label: t("gift_memory_book"), to: "/memory-book" },
            { label: t("mb_packages_title") },
          ]}
        />
      </PageHeader>
    </SiteLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/memory-book-instructions")({
  head: () => ({
    meta: [
      { title: "Memory Book instructions — Project Joy" },
      { name: "description", content: "How to create the Project Joy Book of Memories and Greetings." },
      { property: "og:title", content: "Memory Book instructions — Project Joy" },
      { property: "og:description", content: "How to create the Project Joy Book of Memories and Greetings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryBookInstructionsPage,
});

function MemoryBookInstructionsPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader
        eyebrow={t("brand")}
        title={t("mb_instructions_title")}
        subtitle={t("mb_instructions_sub")}
      >
        <Breadcrumbs
          items={[
            { label: t("bc_home"), to: "/" },
            { label: t("gift_memory_book"), to: "/memory-book" },
            { label: t("mb_instructions_title") },
          ]}
        />
      </PageHeader>
    </SiteLayout>
  );
}

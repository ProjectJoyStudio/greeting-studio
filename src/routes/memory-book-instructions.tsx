import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { MEMORY_BOOK_INSTRUCTIONS } from "@/lib/memory-book/instructions-content";

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
  const { t, lang } = useI18n();
  const content = MEMORY_BOOK_INSTRUCTIONS[lang] ?? MEMORY_BOOK_INSTRUCTIONS.en;

  return (
    <SiteLayout>
      <PageHeader eyebrow={t("brand")} title={content.title}>
        <Breadcrumbs
          items={[
            { label: t("bc_home"), to: "/" },
            { label: t("gift_memory_book"), to: "/memory-book" },
            { label: t("mb_instructions_title") },
          ]}
        />
      </PageHeader>

      <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        <div className="space-y-4">
          {content.intro.map((p) => (
            <p key={p} className="text-base leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-10 space-y-10">
          {content.sections.map((section) => (
            <article key={section.title} className="space-y-3">
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {section.title}
              </h2>
              {groupBlocks(section.blocks).map((group, i) =>
                group.type === "list" ? (
                  <ul key={i} className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                    {group.items.map((item) => (
                      <li key={item} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="leading-relaxed text-muted-foreground">
                    {group.items[0]}
                  </p>
                ),
              )}
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

/** Turn the flat block list into paragraphs and bullet lists for display. */
function groupBlocks(blocks: string[]) {
  const groups: { type: "list" | "text"; items: string[] }[] = [];
  for (const block of blocks) {
    const isBullet = block.startsWith("- ");
    const text = isBullet ? block.slice(2) : block;
    const last = groups[groups.length - 1];
    if (isBullet && last?.type === "list") last.items.push(text);
    else groups.push({ type: isBullet ? "list" : "text", items: [text] });
  }
  return groups;
}


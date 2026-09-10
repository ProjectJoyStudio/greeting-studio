import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { MemoryBookPreview } from "@/components/memory-book/MemoryBookPreview";
import { getMemoryBookAccess } from "@/lib/memory-book/packages.functions";

export const Route = createFileRoute("/memory-book-preview")({
  validateSearch: (search: Record<string, unknown>): { book: string } => ({
    book: typeof search.book === "string" ? search.book : "",
  }),
  head: () => ({
    meta: [
      { title: "Your Memory Book preview — Project Joy" },
      {
        name: "description",
        content:
          "Turn the leaves of your assembled Project Joy Book of Memories and Greetings and keep editing whenever you like.",
      },
      { property: "og:title", content: "Your Memory Book preview — Project Joy" },
      {
        property: "og:description",
        content: "Turn the leaves of your assembled Project Joy Book of Memories and Greetings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemoryBookPreviewPage,
});

function MemoryBookPreviewPage() {
  const { t } = useI18n();
  const { book: bookId } = Route.useSearch();
  const navigate = useNavigate();
  const checkAccess = useServerFn(getMemoryBookAccess);
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  // Only the owner of a paid book may look at it. Nothing is changed here.
  useEffect(() => {
    let active = true;
    if (!bookId) {
      setState("denied");
      return;
    }
    checkAccess({ data: { bookId } })
      .then((res) => {
        if (!active) return;
        setState(res.allowed && res.book ? "allowed" : "denied");
      })
      .catch(() => {
        if (active) setState("denied");
      });
    return () => {
      active = false;
    };
  }, [bookId, checkAccess]);

  useEffect(() => {
    if (state !== "denied") return;
    const timer = setTimeout(() => {
      void navigate({ to: "/memory-book-packages" });
    }, 1500);
    return () => clearTimeout(timer);
  }, [state, navigate]);

  return (
    <SiteLayout>
      <PageHeader eyebrow={t("brand")} title={t("mbpv_title")}>
        <Breadcrumbs
          items={[
            { label: t("bc_home"), to: "/" },
            { label: t("gift_memory_book"), to: "/memory-book" },
            { label: t("mbpv_title") },
          ]}
        />
      </PageHeader>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/memory-book-create" search={{ book: bookId }}>
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            {t("mbpv_back")}
          </Link>
        </Button>

        {state === "checking" ? (
          <p className="text-sm text-muted-foreground">{t("mbpv_loading")}</p>
        ) : state === "allowed" ? (
          <MemoryBookPreview bookId={bookId} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("mbpv_not_found")}</p>
        )}
      </section>
    </SiteLayout>
  );
}

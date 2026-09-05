import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BookOpen, BookPlus } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { getMemoryBookDemo } from "@/lib/memory-book/demo-book.functions";

export const Route = createFileRoute("/memory-book")({
  head: () => ({
    meta: [
      { title: "Book of Memories and Greetings — Project Joy" },
      {
        name: "description",
        content:
          "A keepsake book of memories and greetings collected for someone you love — see the Project Joy demonstration book.",
      },
      { property: "og:title", content: "Book of Memories and Greetings" },
      {
        property: "og:description",
        content: "A keepsake book of memories and greetings, created with Project Joy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryBookPage,
});

function MemoryBookPage() {
  const { t } = useI18n();
  const router = useRouter();
  const loadDemo = useServerFn(getMemoryBookDemo);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [demoKind, setDemoKind] = useState<"book" | "video" | "image">("book");

  useEffect(() => {
    let active = true;
    loadDemo()
      .then((res) => {
        if (!active) return;
        setDemoUrl(res.url);
        setDemoKind(res.kind);
      })
      .catch(() => {
        /* the placeholder stays visible */
      });
    return () => {
      active = false;
    };
  }, [loadDemo]);


  return (
    <SiteLayout>
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <h1 className="sr-only">{t("gift_memory_book")}</h1>

        {/* Large presentation area for the future demonstration book. */}
        <div
          className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-warm"
          style={{ height: "min(72vh, 72dvh)", minHeight: "260px" }}
          aria-label={t("mb_demo_area")}
        >
          {demoUrl && demoKind === "video" ? (
            <video
              src={demoUrl}
              controls
              playsInline
              className="h-full w-full bg-black object-contain"
              aria-label={t("mb_demo_area")}
            />
          ) : demoUrl && demoKind === "image" ? (
            <img
              src={demoUrl}
              alt={t("mb_demo_area")}
              className="h-full w-full object-contain"
            />
          ) : demoUrl ? (
            <iframe
              src={demoUrl}
              title={t("mb_demo_area")}
              className="h-full w-full border-0"
              allow="fullscreen; autoplay"
            />

          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
              <BookOpen className="h-10 w-10 text-primary/60" aria-hidden />
              <p className="max-w-md text-sm text-muted-foreground">{t("mb_demo_placeholder")}</p>
            </div>
          )}
        </div>

        <p className="text-center font-display text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl">
          {t("mb_tagline")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pb-2">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("mb_back")}
          </button>
          <Link
            to="/memory-book-packages"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm transition hover:opacity-90"
          >
            <BookPlus className="h-4 w-4" aria-hidden />
            {t("mb_create")}
          </Link>
          <Link
            to="/memory-book-instructions"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            {t("mb_instructions")}
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Play, Sparkles, X } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { useI18n } from "@/lib/i18n";
import {
  SHOWCASE,
  visibleCategories,
  visibleItems,
  type ShowcaseCategory,
  type ShowcaseItem,
} from "@/lib/showcase/items";

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "What Project Joy Can Create — Showcase" },
      {
        name: "description",
        content:
          "A short selection of greeting cards, animated greetings, videos, clips, cartoons and premium projects crafted by the Project Joy team.",
      },
      { property: "og:title", content: "What Project Joy Can Create" },
      {
        property: "og:description",
        content: "See what your gift could become, then create your own unique project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShowcasePage,
});

function ShowcasePage() {
  const { t } = useI18n();
  const [open, setOpen] = useState<{ item: ShowcaseItem; cat: ShowcaseCategory } | null>(null);

  return (
    <SiteLayout>
      <PageHeader
        eyebrow={t("showcase_nav")}
        title={t("showcase_title")}
        subtitle={t("showcase_sub")}
      >
        <Breadcrumbs items={[{ label: t("bc_home"), to: "/" }, { label: t("showcase_title") }]} />
      </PageHeader>

      <div className="mx-auto max-w-7xl px-5 pt-10 lg:px-8">
        <p className="rounded-2xl border border-border/70 bg-secondary/40 px-5 py-4 text-sm text-muted-foreground">
          {t("showcase_note")}
        </p>
      </div>

      {visibleCategories(SHOWCASE).map((cat) => (
        <section key={cat.id} className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {t(cat.titleKey)}
            </h2>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems(cat).map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl border border-border/70 bg-card transition hover:shadow-warm"
              >
                <div
                  className="grid h-44 place-items-center"
                  style={
                    item.imageUrl
                      ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : { backgroundImage: item.thumb }
                  }
                  role="img"
                  aria-label={t(cat.titleKey)}
                >
                  <Play className="h-8 w-8 text-primary-foreground/80" />
                </div>
                <div className="p-4">
                  {item.permissionGranted && item.credit && (
                    <div className="mb-3 text-xs text-muted-foreground">{item.credit}</div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen({ item, cat })}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-primary/40"
                    >
                      <Play className="h-3.5 w-3.5 text-primary" />
                      {t("showcase_view")}
                    </button>
                    <Link
                      to="/studio"
                      search={{ gift: cat.gift }}
                      className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm"
                    >
                      {t("showcase_create")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-[min(92vw,860px)] overflow-hidden rounded-3xl border border-border/70 bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            {open.item.videoUrl ? (
              <video src={open.item.videoUrl} controls autoPlay playsInline className="w-full" />
            ) : open.item.imageUrl ? (
              <img src={open.item.imageUrl} alt={t(open.cat.titleKey)} className="w-full" />
            ) : (
              <div className="aspect-video w-full" style={{ backgroundImage: open.item.thumb }} />
            )}
            <div className="flex flex-wrap items-center justify-end gap-3 p-5">
              <Link
                to="/studio"
                search={{ gift: open.cat.gift }}
                className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm"
              >
                {t("showcase_create")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium"
              >
                <X className="h-3.5 w-3.5" />
                {t("showcase_close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}

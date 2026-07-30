import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { CardPreview } from "@/components/greeting-card/CardPreview";
import { useI18n } from "@/lib/i18n";
import { getSharedCard } from "@/lib/greeting-card/cards.functions";
import { normalizeTextDesign } from "@/lib/greeting-card/types";

export const Route = createFileRoute("/c/$slug")({
  head: () => ({
    meta: [
      { title: "A postcard for you — Project Joy" },
      { name: "description", content: "Someone made you a personal postcard with Project Joy. Open it and make your own." },
      { property: "og:title", content: "A postcard for you — Project Joy" },
      { property: "og:description", content: "Open your personal postcard from Project Joy." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharedCardPage,
});

function SharedCardPage() {
  const { t } = useI18n();
  const { slug } = Route.useParams();
  const fetchShared = useServerFn(getSharedCard);

  const { data, isLoading } = useQuery({
    queryKey: ["shared-card", slug],
    queryFn: () => fetchShared({ data: { slug } }),
  });

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-2xl px-5 py-16 text-center lg:px-8">
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">{t("gc_shared_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("gc_shared_sub")}</p>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("gc_loading")}
            </div>
          ) : !data?.imageUrl ? (
            <p className="rounded-2xl border border-border/60 bg-card/70 p-8 text-sm text-muted-foreground">
              {t("gc_shared_missing")}
            </p>
          ) : data.isComposed ? (
            <img
              src={data.imageUrl}
              alt={data.title || t("gc_shared_title")}
              className="w-full rounded-3xl border border-border/60 shadow-warm"
            />
          ) : (
            <CardPreview
              imageUrl={data.imageUrl}
              text={data.greetingText}
              design={normalizeTextDesign(data.textDesign)}
              alt={data.title || t("gc_shared_title")}
            />
          )}
        </div>

        <Link
          to="/create-card"
          className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          {t("gc_make_own")}
        </Link>
      </section>
    </SiteLayout>
  );
}

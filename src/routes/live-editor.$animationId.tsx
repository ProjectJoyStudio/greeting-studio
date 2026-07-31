import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { LiveGreetingEditor } from "@/components/live-cards/LiveGreetingTextStep";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLiveGreetingDraft } from "@/lib/live-cards/library.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/live-editor/$animationId")({
  head: () => ({
    meta: [
      { title: "Live greeting card editor — Project Joy" },
      {
        name: "description",
        content:
          "Place your greeting on your live greeting card, style it exactly as you like and save the finished video.",
      },
      { property: "og:title", content: "Live greeting card editor — Project Joy" },
      {
        property: "og:description",
        content: "Write, style and position the greeting on your live greeting card.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveEditorPage,
});

function LiveEditorPage() {
  const { animationId } = useParams({ from: "/live-editor/$animationId" });
  const { t } = useI18n();
  const navigate = useNavigate();
  const load = useServerFn(getLiveGreetingDraft);

  const draft = useQuery({
    queryKey: ["live-greeting-draft", animationId],
    queryFn: () => load({ data: { animationId } }),
  });

  return (
    <SiteLayout>
      <PageHeader title={t("lge_title")} subtitle={t("lge_sub")} />
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 lg:px-6">
        {draft.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("ulc_loading")}
          </div>
        ) : draft.data ? (
          <LiveGreetingEditor
            animationId={animationId}
            videoUrl={draft.data.sourceVideoUrl ?? draft.data.videoUrl}
            aspectRatio={draft.data.aspectRatio}
            onFinish={() => void draft.refetch()}
            onNewProject={() => navigate({ to: "/live-cards" })}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-10 text-center text-sm text-muted-foreground">
            {t("lge_not_found")}
          </p>
        )}
      </section>
    </SiteLayout>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Video } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useI18n } from "@/lib/i18n";
import { listPvgProjects } from "@/lib/personal-video/pvg.functions";

export const Route = createFileRoute("/dashboard/video-greetings")({
  head: () => ({
    meta: [
      { title: "My personal video greetings — Project Joy" },
      {
        name: "description",
        content: "Your personal video greeting projects, saved automatically and ready to continue any time.",
      },
      { property: "og:title", content: "My personal video greetings — Project Joy" },
      { property: "og:description", content: "Continue your personal video greeting exactly where you left it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoGreetingsPage,
});

function VideoGreetingsPage() {
  const { t } = useI18n();
  const list = useServerFn(listPvgProjects);
  const projects = useQuery({ queryKey: ["pvg", "projects"], queryFn: () => list({}) });

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("pvg_drafts_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pvg_drafts_sub")}</p>
        </div>
        <Link
          to="/video-greeting"
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm"
        >
          <Plus className="h-4 w-4" />
          {t("pvg_new_project")}
        </Link>
      </div>

      {(projects.data?.length ?? 0) === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">{t("pvg_empty_drafts")}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.data!.map((project) => (
            <div
              key={project.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-warm"
            >
              <div className="aspect-video w-full bg-muted/40">
                {project.coverUrl ? (
                  <img src={project.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Video className="h-6 w-6 opacity-50" />
                  </div>
                )}
              </div>
              <div className="space-y-1 p-4">
                <p className="truncate font-display text-base font-semibold">
                  {project.recipientName || t("pvg_drafts_title")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {project.occasion || "—"} · {project.peopleCount}/5 · {project.generationsUsed}/
                  {project.generationsLimit}
                </p>
                <Link
                  to="/video-greeting"
                  search={{ project: project.id }}
                  className="mt-3 inline-flex rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50"
                >
                  {t("pvg_continue")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
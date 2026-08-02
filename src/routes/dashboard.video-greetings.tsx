import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useI18n } from "@/lib/i18n";
import { deletePvgProject, listPvgProjects } from "@/lib/personal-video/pvg.functions";

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
  const removeProject = useServerFn(deletePvgProject);
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const projects = useQuery({ queryKey: ["pvg", "projects"], queryFn: () => list({}) });

  const del = useMutation({
    mutationFn: (projectId: string) => removeProject({ data: { projectId } }),
    onSuccess: () => {
      toast.success(t("pvg_deleted_toast"));
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["pvg", "projects"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

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
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    to="/video-greeting"
                    search={{ project: project.id }}
                    className="inline-flex rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50"
                  >
                    {t("pvg_continue")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(project.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("pvg_delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm"
          onClick={() => !del.isPending && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-warm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-muted-foreground">{t("pvg_delete_confirm_title")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={del.isPending}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm transition hover:bg-secondary disabled:opacity-60"
              >
                {t("pvg_delete_cancel")}
              </button>
              <button
                type="button"
                onClick={() => del.mutate(pendingDelete)}
                disabled={del.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {del.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("pvg_delete_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
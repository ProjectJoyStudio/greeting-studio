import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film, Loader2, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { LiveCardViewer } from "@/components/live-cards/LiveCardViewer";
import { useI18n } from "@/lib/i18n";
import { deleteMyLiveGreeting, listMyLiveGreetings } from "@/lib/live-cards/library.functions";
import type { LiveGreetingRecord } from "@/lib/live-cards/types";

export const Route = createFileRoute("/dashboard/live-cards")({
  component: MyLiveCardsPage,
});

function MyLiveCardsPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const fetchAll = useServerFn(listMyLiveGreetings);
  const remove = useServerFn(deleteMyLiveGreeting);

  const [open, setOpen] = useState<LiveGreetingRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LiveGreetingRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-live-greetings"],
    queryFn: () => fetchAll({ data: undefined }),
  });

  const del = useMutation({
    mutationFn: (animationId: string) => remove({ data: { animationId } }),
    onSuccess: () => {
      toast.success(t("llc_deleted"));
      setConfirmDelete(null);
      setOpen(null);
      queryClient.invalidateQueries({ queryKey: ["my-live-greetings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const items = data ?? [];

  return (
    <div>
      <DashboardPageHeader titleKey="llc_title" subtitleKey="llc_sub" />

      <Link
        to="/live-cards"
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm"
      >
        <Plus className="h-4 w-4" />
        {t("llc_create")}
      </Link>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("ulc_loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          {t("llc_empty")}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-warm"
            >
              <button
                type="button"
                onClick={() => setOpen(item)}
                className="group relative block aspect-video w-full bg-muted/50"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.motionPrompt} className="h-full w-full object-cover" />
                ) : (
                  <Film className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 transition group-hover:opacity-100">
                  <Play className="h-9 w-9 text-primary" />
                </span>
              </button>
              <div className="space-y-2 p-4">
                <p className="line-clamp-2 text-sm text-foreground">{item.motionPrompt || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {t("llc_duration")}: {item.durationSeconds}
                  {t("la_seconds")} · {t("llc_created")}: {new Date(item.createdAt).toLocaleDateString(lang)}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(item)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t("llc_open")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(item)}
                    aria-label={t("llc_delete")}
                    className="inline-flex items-center justify-center rounded-full border border-destructive/40 px-3 py-2 text-destructive transition hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {open?.videoUrl && (
        <LiveCardViewer
          videoUrl={open.videoUrl}
          title={open.title}
          greetingText={open.greetingText}
          design={open.textDesign}
          onClose={() => setOpen(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/75 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold">{t("llc_confirm_delete_title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("llc_confirm_delete_desc")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:bg-secondary"
              >
                {t("llc_cancel")}
              </button>
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => del.mutate(confirmDelete.id)}
                className="rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {t("llc_delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

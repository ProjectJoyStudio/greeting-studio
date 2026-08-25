import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film, Loader2, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { LiveCardViewer } from "@/components/live-cards/LiveCardViewer";
import { useI18n } from "@/lib/i18n";
import {
  deleteMyLiveGreeting,
  listMyLiveDrafts,
  listMyLiveGreetings,
  markLiveGreetingDelivered,
  syncMyLiveCardAnimations,
} from "@/lib/live-cards/library.functions";
import { retryLiveCardAnimation } from "@/lib/live-cards/animations.functions";
import type { LiveGreetingRecord } from "@/lib/live-cards/types";

export const Route = createFileRoute("/dashboard/live-cards")({
  component: MyLiveCardsPage,
});

function MyLiveCardsPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const fetchAll = useServerFn(listMyLiveGreetings);
  const remove = useServerFn(deleteMyLiveGreeting);
  const markDelivered = useServerFn(markLiveGreetingDelivered);

  const [open, setOpen] = useState<LiveGreetingRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LiveGreetingRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-live-greetings"],
    queryFn: () => fetchAll({ data: undefined }),
  });

  // Generations keep running in the background; every visit finishes whatever
  // the engine has completed since the person left the creation page.
  const sync = useServerFn(syncMyLiveCardAnimations);
  const fetchDrafts = useServerFn(listMyLiveDrafts);
  const retry = useServerFn(retryLiveCardAnimation);

  const drafts = useQuery({
    queryKey: ["my-live-drafts"],
    queryFn: () => fetchDrafts({ data: undefined }),
    refetchInterval: 15000,
  });

  useEffect(() => {
    void sync({ data: undefined })
      .then(() => {
        void drafts.refetch();
        void queryClient.invalidateQueries({ queryKey: ["my-live-greetings"] });
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryOne = useMutation({
    mutationFn: (animationId: string) => retry({ data: { animationId } }),
    onSuccess: () => {
      toast.success(t("llc_retry_started"));
      void drafts.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const deliver = useMutation({
    mutationFn: (vars: { animationId: string; method: "download" | "share" }) =>
      markDelivered({ data: vars }),
    onSuccess: () => {
      setOpen(null);
      void queryClient.invalidateQueries({ queryKey: ["my-live-greetings"] });
    },
  });

  const del = useMutation({
    mutationFn: (animationId: string) => remove({ data: { animationId } }),
    onSuccess: () => {
      toast.success(t("llc_deleted"));
      setConfirmDelete(null);
      setOpen(null);
      queryClient.invalidateQueries({ queryKey: ["my-live-greetings"] });
      void drafts.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const items = data ?? [];
  const unfinished = drafts.data ?? [];

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

      {unfinished.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-lg font-semibold tracking-tight">{t("llc_unfinished_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("llc_unfinished_sub")}</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {unfinished.map((item) => {
              const imageOnly = item.kind === "image";
              const pending =
                !imageOnly && ["preparing", "queued", "processing", "storing"].includes(item.status);
              const failed = !imageOnly && item.status === "failed";
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-warm"
                >
                  <div className="relative aspect-video w-full bg-muted/50">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.motionPrompt} className="h-full w-full object-cover" />
                    ) : (
                      <Film className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium">
                      {imageOnly
                        ? `${t("lc_recent")} · ${item.variantCount ?? 1}`
                        : pending
                          ? t("llc_state_working")
                          : failed
                            ? t("llc_state_failed")
                            : t("llc_state_ready_text")}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="line-clamp-2 text-sm text-foreground">{item.motionPrompt || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("llc_created")}: {new Date(item.createdAt).toLocaleDateString(lang)}
                    </p>
                    <div className="flex gap-2 pt-1">
                      {pending && (
                        <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t("llc_state_working")}
                        </span>
                      )}
                      {failed && (
                        <button
                          type="button"
                          disabled={retryOne.isPending}
                          onClick={() => retryOne.mutate(item.id)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50 disabled:opacity-60"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {t("llc_retry")}
                        </button>
                      )}
                      {imageOnly && (
                        <Link
                          to="/live-cards"
                          search={{ session: item.sessionId ?? item.id }}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("llc_continue")}
                        </Link>
                      )}
                      {!imageOnly && item.status === "ready" && (
                        <Link
                          to="/live-editor/$animationId"
                          params={{ animationId: item.id }}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("llc_continue")}
                        </Link>
                      )}
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
              );
            })}

          </div>
        </section>
      )}

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
          onClose={() => setOpen(null)}
          onDelivered={(method) => deliver.mutate({ animationId: open.id, method })}
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

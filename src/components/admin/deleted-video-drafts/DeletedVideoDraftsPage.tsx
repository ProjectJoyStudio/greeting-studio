import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { countdown, PVG_RETENTION_OPTIONS, PVG_STATUS_KEY, normalizeStatus } from "@/lib/personal-video/order";
import {
  getPvgRetention,
  listDeletedPvgDrafts,
  previewDeletedPvgDraft,
  purgePvgDraft,
  restorePvgDraft,
  setPvgRetention,
  type DeletedPvgDraftDetail,
  type DeletedPvgDraftRow,
} from "@/lib/personal-video/order.functions";

const DAY_KEY: Record<number, string> = { 1: "pvo_days_one", 2: "pvo_days_two", 3: "pvo_days_three" };

/** Recycle bin of the Personal Video Greeting orders. */
export function DeletedVideoDraftsPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const fetchRows = useServerFn(listDeletedPvgDrafts);
  const fetchRetention = useServerFn(getPvgRetention);
  const saveRetention = useServerFn(setPvgRetention);
  const openPreview = useServerFn(previewDeletedPvgDraft);
  const restore = useServerFn(restorePvgDraft);
  const purge = useServerFn(purgePvgDraft);

  const [days, setDays] = useState(3);
  const [detail, setDetail] = useState<DeletedPvgDraftDetail | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<DeletedPvgDraftRow | null>(null);
  const [, setTick] = useState(0);

  const rows = useQuery({ queryKey: ["admin-pvg-deleted"], queryFn: () => fetchRows({ data: undefined }) });
  const retention = useQuery({ queryKey: ["admin-pvg-retention"], queryFn: () => fetchRetention({ data: undefined }) });

  useEffect(() => {
    if (retention.data?.days) setDays(retention.data.days);
  }, [retention.data?.days]);

  // Live countdown for every deleted draft.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-pvg-deleted"] });
  const fmt = (value: string | null) => (value ? new Date(value).toLocaleString(lang) : "—");

  const restoreM = useMutation({
    mutationFn: (projectId: string) => restore({ data: { projectId } }),
    onSuccess: () => {
      toast.success(t("pvo_restored_toast"));
      setDetail(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const purgeM = useMutation({
    mutationFn: (projectId: string) => purge({ data: { projectId } }),
    onSuccess: () => {
      toast.success(t("pvo_purged_toast"));
      setConfirmPurge(null);
      setDetail(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const retentionM = useMutation({
    mutationFn: (value: number) => saveRetention({ data: { days: value } }),
    onSuccess: (res) => {
      setDays(res.days);
      queryClient.invalidateQueries({ queryKey: ["admin-pvg-retention"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const previewM = useMutation({
    mutationFn: (projectId: string) => openPreview({ data: { projectId } }),
    onSuccess: (res) => setDetail(res),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t("pvo_admin_title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("pvo_admin_sub")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-4">
        <span className="text-sm font-medium">{t("pvo_retention")}</span>
        {PVG_RETENTION_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => retentionM.mutate(option)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
              days === option
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 hover:border-primary/50"
            }`}
          >
            {t(DAY_KEY[option]!)}
          </button>
        ))}
        {retentionM.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {rows.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> …
        </p>
      ) : (rows.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">{t("pvo_empty")}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.data!.map((row) => {
            const left = countdown(row.purgeAfter);
            return (
              <div key={row.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-warm">
                <div className="aspect-video w-full bg-muted/40">
                  {row.previewUrl ? (
                    <img src={row.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="space-y-1.5 p-4 text-xs text-muted-foreground">
                  <p className="truncate text-sm font-semibold text-foreground">{row.userEmail ?? row.userId}</p>
                  <p className="truncate font-mono text-[11px]">{row.id}</p>
                  <p>
                    {t("pvo_created_on")}: {fmt(row.createdAt)}
                  </p>
                  <p>
                    {t("pvo_deleted_on")}: {fmt(row.deletedAt)}
                  </p>
                  <p>
                    {t(row.workflowStep === "video" ? "pvo_step_video" : "pvo_step_scene")} ·{" "}
                    {t(PVG_STATUS_KEY[normalizeStatus(row.status)])}
                  </p>
                  <p>
                    {t("pvo_spent")}: {row.creditsCharged}
                  </p>
                  <p className={left.expired ? "text-destructive" : "text-foreground"}>
                    {left.expired
                      ? t("pvo_expired")
                      : `${t("pvo_countdown")} ${left.days} ${t("pvo_days")} ${left.hours} ${t("pvo_hours")}`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => previewM.mutate(row.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 font-medium transition hover:border-primary/50"
                    >
                      <Eye className="h-3.5 w-3.5" /> {t("pvo_preview")}
                    </button>
                    <button
                      type="button"
                      onClick={() => restoreM.mutate(row.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 font-medium transition hover:border-primary/50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> {t("pvo_restore")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmPurge(row)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 font-medium text-destructive transition hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("pvo_purge")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewM.isPending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> …
        </p>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-warm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">{detail.userEmail ?? detail.userId}</h2>
                <p className="font-mono text-[11px] text-muted-foreground">{detail.id}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="rounded-full p-2 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <Info label={t("pvo_created_on")} value={fmt(detail.createdAt)} />
              <Info label={t("pvo_deleted_on")} value={fmt(detail.deletedAt)} />
              <Info
                label="Step"
                value={t(detail.workflowStep === "video" ? "pvo_step_video" : "pvo_step_scene")}
              />
              <Info label={t("pvo_duration")} value={`${detail.durationSeconds}s`} />
              <Info label={t("pvo_spent")} value={String(detail.creditsCharged)} />
              <Info label={t("pvo_cost")} value={String(detail.orderCost)} />
            </div>

            <Section title={t("pvo_participants")}>
              <div className="flex flex-wrap gap-3">
                {detail.people.map((person) => (
                  <div key={person.id} className="w-28 text-center text-xs">
                    <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted/40">
                      {person.photoUrl ? (
                        <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <p className="mt-1 truncate">{person.name || "—"}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t("pvo_scenes")}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {detail.scenes.map((scene) => (
                  <div key={scene.id} className="overflow-hidden rounded-xl border border-border/60">
                    <div className="aspect-video bg-muted/40">
                      {scene.imageUrl ? (
                        <img src={scene.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <p className="p-2 text-[11px] text-muted-foreground">
                      {scene.status}
                      {scene.approved ? ` · ${t("pvo_approved")}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t("pvo_greeting")}>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{detail.greetingText || "—"}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("pvo_keywords")}: {detail.greetingKeywords || "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{detail.sceneDescription || "—"}</p>
            </Section>

            <Section title={t("pvo_credit_history")}>
              {detail.creditHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {detail.creditHistory.map((entry, index) => (
                    <li key={index}>
                      {fmt(entry.at)} · {entry.amount} · {entry.reason}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t("pvo_no_refund_note")}</p>
            </Section>

            <Section title={t("pvo_files")}>
              <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
                {detail.files.map((file) => (
                  <li key={`${file.bucket}/${file.path}`}>
                    {file.bucket}/{file.path}
                  </li>
                ))}
              </ul>
            </Section>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm transition hover:bg-secondary"
              >
                {t("pvo_close")}
              </button>
              <button
                type="button"
                onClick={() => restoreM.mutate(detail.id)}
                disabled={restoreM.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {restoreM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("pvo_restore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-warm">
            <p className="text-sm text-muted-foreground">{t("pvo_confirm_purge")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmPurge(null)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm transition hover:bg-secondary"
              >
                {t("pvo_cancel")}
              </button>
              <button
                type="button"
                onClick={() => purgeM.mutate(confirmPurge.id)}
                disabled={purgeM.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {purgeM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("pvo_purge")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <h3 className="mb-3 font-display text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

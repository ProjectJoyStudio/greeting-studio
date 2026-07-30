import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  getRetentionDays,
  listDeletedCards,
  logAdminCardView,
  purgeDeletedCard,
  restoreDeletedCard,
  setRetentionDays,
  type DeletedCardRow,
} from "@/lib/admin/deleted-cards.functions";

const PRESETS = [3, 7, 15, 30, 60, 90];

function fmtSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DeletedCardsPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const fetchCards = useServerFn(listDeletedCards);
  const fetchRetention = useServerFn(getRetentionDays);
  const saveRetention = useServerFn(setRetentionDays);
  const restore = useServerFn(restoreDeletedCard);
  const purge = useServerFn(purgeDeletedCard);
  const logView = useServerFn(logAdminCardView);

  const [preview, setPreview] = useState<DeletedCardRow | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<DeletedCardRow | null>(null);
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deleted-cards"],
    queryFn: () => fetchCards({ data: undefined }),
  });
  const retention = useQuery({
    queryKey: ["admin-retention-days"],
    queryFn: () => fetchRetention({ data: undefined }),
  });

  useEffect(() => {
    if (retention.data?.days) setDays(retention.data.days);
  }, [retention.data?.days]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-deleted-cards"] });

  const restoreM = useMutation({
    mutationFn: (cardId: string) => restore({ data: { cardId } }),
    onSuccess: () => {
      toast.success(t("dc_restored"));
      setPreview(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const purgeM = useMutation({
    mutationFn: (cardId: string) => purge({ data: { cardId } }),
    onSuccess: () => {
      toast.success(t("dc_purged"));
      setConfirmPurge(null);
      setPreview(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const retentionM = useMutation({
    mutationFn: (value: number) => saveRetention({ data: { days: value } }),
    onSuccess: () => {
      toast.success(t("dc_retention_saved"));
      queryClient.invalidateQueries({ queryKey: ["admin-retention-days"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const rows = data ?? [];
  const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleString(lang) : "—");

  return (
    <div>
      <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground">{t("dc_title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("dc_sub")}</p>

      <section className="mt-6 rounded-2xl border border-border/60 bg-card/70 p-5">
        <h2 className="text-sm font-semibold text-foreground">{t("dc_retention_title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("dc_retention_desc")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                days === p ? "border-primary bg-primary text-primary-foreground" : "border-border/60 hover:bg-secondary"
              }`}
            >
              {p} {t("dc_days")}
            </button>
          ))}
          <label className="ml-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            {t("dc_retention_custom")}
            <input
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-24 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => retentionM.mutate(days)}
            disabled={retentionM.isPending}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {t("dc_retention_save")}
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("dc_loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card/70 p-8 text-center text-sm text-muted-foreground">
          {t("dc_empty")}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/70">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-border/60 text-muted-foreground">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">{t("dc_user")}</th>
                <th className="p-3">{t("dc_created")}</th>
                <th className="p-3">{t("dc_deleted")}</th>
                <th className="p-3">{t("dc_purge_on")}</th>
                <th className="p-3">{t("dc_size")}</th>
                <th className="p-3">{t("dc_status")}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const soon =
                  row.purge_after != null &&
                  new Date(row.purge_after).getTime() - Date.now() < 3 * 86_400_000;
                return (
                  <tr key={row.id} className="border-b border-border/40 last:border-0">
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPreview(row);
                          void logView({ data: { cardId: row.id, userId: row.user_id } });
                        }}
                        className="block h-14 w-14 overflow-hidden rounded-md border border-border/60 bg-muted"
                      >
                        {row.image_url ? (
                          <img src={row.image_url} alt={row.title ?? row.prompt} className="h-full w-full object-cover" />
                        ) : null}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{row.title || "—"}</div>
                      <div className="text-muted-foreground">{row.user_email ?? row.user_id}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{fmtDate(row.created_at)}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(row.deleted_at)}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(row.purge_after)}</td>
                    <td className="p-3 text-muted-foreground">{fmtSize(row.file_size)}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full border px-2 py-1 ${
                          soon
                            ? "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200"
                            : "border-rose-500/30 bg-rose-500/15 text-rose-800 dark:text-rose-200"
                        }`}
                      >
                        {soon ? t("dc_status_expiring") : t("dc_status_deleted")}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreview(row);
                            void logView({ data: { cardId: row.id, userId: row.user_id } });
                          }}
                          className="rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary"
                        >
                          {t("dc_view")}
                        </button>
                        <button
                          type="button"
                          onClick={() => restoreM.mutate(row.id)}
                          disabled={restoreM.isPending}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-60"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> {t("dc_restore")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmPurge(row)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("dc_purge")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">{preview.title || "—"}</h3>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label={t("dc_close")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {preview.image_url && (
              <img src={preview.image_url} alt={preview.prompt} className="mb-4 w-full rounded-xl object-contain" />
            )}
            <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div><dt className="font-medium text-foreground">{t("dc_user")}</dt><dd>{preview.user_email ?? preview.user_id}</dd></div>
              <div><dt className="font-medium text-foreground">{t("dc_created")}</dt><dd>{fmtDate(preview.created_at)}</dd></div>
              <div><dt className="font-medium text-foreground">{t("dc_deleted")}</dt><dd>{fmtDate(preview.deleted_at)}</dd></div>
              <div><dt className="font-medium text-foreground">{t("dc_purge_on")}</dt><dd>{fmtDate(preview.purge_after)}</dd></div>
              <div><dt className="font-medium text-foreground">{t("dc_size")}</dt><dd>{fmtSize(preview.file_size)}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {confirmPurge && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/75 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">{t("dc_confirm_purge_title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("dc_confirm_purge_desc")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmPurge(null)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:bg-secondary"
              >
                {t("dc_cancel")}
              </button>
              <button
                type="button"
                onClick={() => purgeM.mutate(confirmPurge.id)}
                disabled={purgeM.isPending}
                className="rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {t("dc_confirm_yes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
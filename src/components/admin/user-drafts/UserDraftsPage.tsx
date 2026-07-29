import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, X, FolderPlus } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  addUserDraftToCatalog,
  deleteAllUserDrafts,
  deleteUserDraft,
  listUserDrafts,
  type UserDraftRow,
} from "@/lib/greeting-card/admin-drafts.functions";

function shortPrompt(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length < prompt.trim().length ? `${words}…` : words;
}

export function UserDraftsPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const fetchDrafts = useServerFn(listUserDrafts);
  const removeOne = useServerFn(deleteUserDraft);
  const removeAll = useServerFn(deleteAllUserDrafts);
  const toCatalog = useServerFn(addUserDraftToCatalog);

  const [preview, setPreview] = useState<UserDraftRow | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-user-drafts"],
    queryFn: () => fetchDrafts({ data: undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-user-drafts"] });

  const delOne = useMutation({
    mutationFn: (draftId: string) => removeOne({ data: { draftId } }),
    onSuccess: () => {
      toast.success(t("ud_deleted_one"));
      setPreview(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const delAll = useMutation({
    mutationFn: () => removeAll({ data: undefined }),
    onSuccess: (res) => {
      toast.success(`${t("ud_deleted_all")} (${res.deleted})`);
      setConfirmAll(false);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const addToCatalog = useMutation({
    mutationFn: (draftId: string) => toCatalog({ data: { draftId } }),
    onSuccess: () => toast.success(t("ud_added_catalog")),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const drafts = data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">{t("ud_title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("ud_sub")}</p>
        </div>
        <button
          type="button"
          disabled={drafts.length === 0}
          onClick={() => setConfirmAll(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {t("ud_delete_all")}
        </button>
      </header>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Error"}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("ud_loading")}
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/70 p-8 text-center text-sm text-muted-foreground">
          {t("ud_empty")}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(128px,1fr))]">
          {drafts.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setPreview(d)}
              title={d.prompt}
              className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card/70 text-left transition hover:border-primary/40 hover:bg-secondary/50"
            >
              {d.image_url ? (
                <img
                  src={d.image_url}
                  alt={shortPrompt(d.prompt)}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-square w-full bg-muted" />
              )}
              <div className="min-w-0 space-y-0.5 px-2 py-1.5">
                <p className="truncate text-[11px] leading-tight text-foreground">{shortPrompt(d.prompt)}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString(lang)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
        {t("ud_publish_note")}
      </p>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-[min(92vw,760px)] rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-foreground">{t("ud_details")}</h3>
              <button
                onClick={() => setPreview(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60"
                aria-label={t("ud_close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {preview.image_url && (
              <img src={preview.image_url} alt={preview.prompt} className="w-full rounded-xl" />
            )}
            <dl className="mt-4 space-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">{t("ud_prompt_label")}</dt>
                <dd className="whitespace-pre-wrap text-foreground">{preview.prompt}</dd>
              </div>
              {preview.greeting_text && (
                <div>
                  <dd className="whitespace-pre-wrap text-foreground">{preview.greeting_text}</dd>
                </div>
              )}
              {preview.keywords.length > 0 && (
                <div>
                  <dt className="text-muted-foreground">Keywords</dt>
                  <dd className="text-foreground">{preview.keywords.join(", ")}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">{t("ud_email_label")}</dt>
                <dd className="break-all text-foreground">{preview.user_email ?? preview.user_id ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("ud_date_label")}</dt>
                <dd className="text-foreground">{new Date(preview.created_at).toLocaleString(lang)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => addToCatalog.mutate(preview.id)}
                disabled={addToCatalog.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs text-primary disabled:opacity-60"
              >
                {addToCatalog.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FolderPlus className="h-3.5 w-3.5" />
                )}
                {t("ud_add_catalog")}
              </button>
              <button
                onClick={() => delOne.mutate(preview.id)}
                disabled={delOne.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" /> {t("ud_delete_one")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">{t("ud_confirm_title")}</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{t("ud_confirm_desc")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmAll(false)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:bg-secondary"
              >
                {t("ud_cancel")}
              </button>
              <button
                onClick={() => delAll.mutate()}
                disabled={delAll.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {delAll.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("ud_confirm_delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
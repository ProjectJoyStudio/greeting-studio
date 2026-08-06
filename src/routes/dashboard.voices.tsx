import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mic, Pencil, Plus, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { useI18n } from "@/lib/i18n";
import {
  deleteMyVoice,
  listMyVoices,
  previewMyVoice,
  renameMyVoice,
} from "@/lib/personal-video/voice/personal-voices.functions";
import type { PersonalVoice } from "@/lib/personal-video/voice/personal-voices";
import { VoiceProfileStudio } from "@/components/personal-video/voice/VoiceProfileStudio";

export const Route = createFileRoute("/dashboard/voices")({
  component: MyVoicesPage,
  head: () => ({
    meta: [
      { title: "My Voices — Project Joy" },
      {
        name: "description",
        content:
          "Your personal voice library in Project Joy: keep, rename and reuse the voices of the people you love.",
      },
      { property: "og:title", content: "My Voices — Project Joy" },
      {
        property: "og:description",
        content: "Keep, rename and reuse your personal voices for every Project Joy greeting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MyVoicesPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const fetchVoices = useServerFn(listMyVoices);
  const rename = useServerFn(renameMyVoice);
  const remove = useServerFn(deleteMyVoice);
  const speak = useServerFn(previewMyVoice);

  const [editing, setEditing] = useState<PersonalVoice | null>(null);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<PersonalVoice | null>(null);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState<PersonalVoice | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [previewing, setPreviewing] = useState<string | null>(null);

  async function playPreview(voice: PersonalVoice) {
    if (previews[voice.id]) return;
    setPreviewing(voice.id);
    try {
      const res = await speak({ data: { voiceId: voice.id } });
      setPreviews((prev) => ({
        ...prev,
        [voice.id]: `data:${res.mimeType};base64,${res.audioBase64}`,
      }));
    } catch {
      toast.error(t("mv_preview_failed"));
    } finally {
      setPreviewing(null);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["my-voices"],
    queryFn: () => fetchVoices({ data: undefined }),
  });

  const renameVoice = useMutation({
    mutationFn: (input: { voiceId: string; displayName: string }) => rename({ data: input }),
    onSuccess: async () => {
      setEditing(null);
      toast.success(t("mv_renamed"));
      await queryClient.invalidateQueries({ queryKey: ["my-voices"] });
    },
    onError: () => toast.error(t("mv_save_failed")),
  });

  const deleteVoice = useMutation({
    mutationFn: (voiceId: string) => remove({ data: { voiceId } }),
    onSuccess: async (result) => {
      setConfirm(null);
      toast.success(t("mv_deleted"));
      if (result.affectedProjects > 0) {
        toast.info(t("mv_deleted_affected").replace("{count}", String(result.affectedProjects)));
      }
      await queryClient.invalidateQueries({ queryKey: ["my-voices"] });
    },
    onError: () => toast.error(t("mv_save_failed")),
  });

  const voices = data?.voices ?? [];

  return (
    <>
      <DashboardPageHeader titleKey="mv_title" subtitleKey="mv_sub" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("mv_only_profiles")}</p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("mv_add_voice")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("mv_loading")}
        </div>
      ) : voices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-10 text-center">
          <Mic className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("mv_empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {voices.map((voice) => (
            <li
              key={voice.id}
              className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{voice.displayName}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("mv_permanent")} · {voice.language.toUpperCase()}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-[11px] text-muted-foreground">
                  {t(`mv_status_${voice.processingStatus}`)}
                </span>
              </div>

              {(previews[voice.id] ?? voice.previewUrl) ? (
                <audio
                  src={previews[voice.id] ?? voice.previewUrl ?? undefined}
                  controls
                  preload="none"
                  className="mt-3 w-full"
                  aria-label={`${t("mv_preview")}: ${voice.displayName}`}
                />
              ) : (
                <button
                  type="button"
                  disabled={previewing === voice.id}
                  onClick={() => void playPreview(voice)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50 disabled:opacity-60"
                >
                  {previewing === voice.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                  {previewing === voice.id ? t("mv_preview_generating") : t("mv_preview")}
                </button>
              )}

              <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <dt className="uppercase tracking-wide">{t("mv_samples")}</dt>
                  <dd className="text-foreground">{voice.sampleCount}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">{t("mv_created")}</dt>
                  <dd className="text-foreground">
                    {new Date(voice.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(voice);
                    setName(voice.displayName);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("mv_rename")}
                </button>
                <button
                  type="button"
                  onClick={() => setUpdating(voice)}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50"
                >
                  <Mic className="h-3.5 w-3.5" />
                  {t("mv_update_voice")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(voice)}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium text-destructive transition hover:border-destructive/60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("mv_delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Dialog title={t("mv_rename_title")} onClose={() => setEditing(null)}>
          <label className="block text-xs font-medium text-muted-foreground">
            {t("mv_name_label")}
          </label>
          <input
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            placeholder={t("mv_name_placeholder")}
            className="mt-2 w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-border/60 px-4 py-2 text-xs font-medium"
            >
              {t("mv_cancel")}
            </button>
            <button
              type="button"
              disabled={renameVoice.isPending}
              onClick={() => {
                if (name.trim().length < 2) {
                  toast.error(t("mv_name_required"));
                  return;
                }
                renameVoice.mutate({ voiceId: editing.id, displayName: name.trim() });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
            >
              {renameVoice.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("mv_save")}
            </button>
          </div>
        </Dialog>
      )}

      {confirm && (
        <Dialog title={t("mv_delete_title")} onClose={() => setConfirm(null)}>
          <p className="text-sm text-muted-foreground">{t("mv_delete_body")}</p>
          <p className="mt-2 text-sm font-medium">{confirm.displayName}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="rounded-full border border-border/60 px-4 py-2 text-xs font-medium"
            >
              {t("mv_cancel")}
            </button>
            <button
              type="button"
              disabled={deleteVoice.isPending}
              onClick={() => deleteVoice.mutate(confirm.id)}
              className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
            >
              {deleteVoice.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("mv_delete")}
            </button>
          </div>
        </Dialog>
      )}

      {(adding || updating) && (
        <Dialog
          title={updating ? t("mv_update_voice") : t("mv_wizard_title")}
          onClose={() => {
            setAdding(false);
            setUpdating(null);
          }}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            <VoiceProfileStudio
              language={lang}
              updateVoice={updating}
              onSaved={() => void queryClient.invalidateQueries({ queryKey: ["my-voices"] })}
            />
          </div>
        </Dialog>
      )}
    </>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-warm"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

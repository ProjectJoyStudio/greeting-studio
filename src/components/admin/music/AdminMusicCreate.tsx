import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Music, Pause, Play, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  createAdminMusic,
  discardAdminMusicDraft,
  listAdminMusicDrafts,
  publishAdminMusicDraft,
  type AdminMusicDraft,
} from "@/lib/admin/music/create.functions";
import { MUSIC_CATEGORIES } from "@/lib/music/types";

/**
 * Creating music for the EXISTING Project Joy Music Library. A result stays a
 * private draft until an administrator explicitly adds it to the library.
 */
export function AdminMusicCreate({ onPublished }: { onPublished: () => void }) {
  const { t } = useI18n();
  const list = useServerFn(listAdminMusicDrafts);
  const create = useServerFn(createAdminMusic);
  const publish = useServerFn(publishAdminMusicDraft);
  const discard = useServerFn(discardAdminMusicDraft);

  const [drafts, setDrafts] = useState<AdminMusicDraft[]>([]);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("background");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    void list({ data: {} } as never)
      .then((res) => setDrafts(res.drafts))
      .catch(() => undefined);
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [list]);

  function preview(draft: AdminMusicDraft) {
    if (playing === draft.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    if (!draft.url) return;
    const audio = new Audio(draft.url);
    audio.addEventListener("ended", () => setPlaying(null));
    audioRef.current = audio;
    void audio.play().catch(() => setPlaying(null));
    setPlaying(draft.id);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
      <p className="flex items-center gap-2 font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        {t("mus_admin_create_title")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t("mus_admin_create_hint")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("mus_admin_track_title")}
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t("mus_admin_category")}
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
        >
          {MUSIC_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`mus_cat_${c}`)}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={prompt}
        rows={3}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("mbmu_describe_example")}
        className="mt-3 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
      />
      <button
        type="button"
        disabled={busy || !prompt.trim()}
        onClick={async () => {
          setBusy(true);
          const res = await create({ data: { prompt, title, category } }).catch(() => null);
          setBusy(false);
          if (!res?.ok) {
            toast.error(t("mus_admin_create_failed"));
            if (res?.drafts) setDrafts(res.drafts);
            return;
          }
          setDrafts(res.drafts);
          setPrompt("");
          setTitle("");
        }}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? t("mus_admin_creating") : t("mus_admin_create_cta")}
      </button>

      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium">{t("mus_admin_drafts")}</p>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("mus_admin_drafts_empty")}</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <Music className="h-4 w-4 text-primary" />
                <span className="flex-1 text-sm">{draft.title}</span>
                <button
                  type="button"
                  onClick={() => preview(draft)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1.5 text-xs"
                >
                  {playing === draft.id ? (
                    <>
                      <Pause className="h-3.5 w-3.5" /> {t("mus_pause")}
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" /> {t("mus_play")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const res = await publish({
                      data: { draftId: draft.id, title: draft.title, category: draft.category },
                    }).catch(() => null);
                    setBusy(false);
                    if (!res?.ok) return;
                    setDrafts(res.drafts);
                    toast.success(t("mus_admin_published"));
                    onPublished();
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                >
                  {t("mus_admin_publish")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const res = await discard({ data: { draftId: draft.id } }).catch(() => null);
                    setBusy(false);
                    if (res?.drafts) setDrafts(res.drafts);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/50 px-3 py-1.5 text-xs text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("mus_admin_discard")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

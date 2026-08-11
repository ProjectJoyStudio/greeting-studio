import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Music, Pause, Play, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  deleteTrack,
  fetchAllTracks,
  updateTrack,
  uploadLibraryTrack,
} from "@/lib/music/library";
import { MUSIC_CATEGORIES, type MusicTrack } from "@/lib/music/types";

export function MusicPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("background");
  const [file, setFile] = useState<File | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tracks = useQuery({ queryKey: ["admin", "music"], queryFn: fetchAllTracks });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "music"] });

  const upload = useMutation({
    mutationFn: () => uploadLibraryTrack({ file: file!, title, category }),
    onSuccess: () => {
      setFile(null);
      setTitle("");
      toast.success(t("mus_admin_saved"));
      void refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const patch = useMutation({
    mutationFn: (input: { id: string; patch: Parameters<typeof updateTrack>[1] }) =>
      updateTrack(input.id, input.patch),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const remove = useMutation({
    mutationFn: (track: MusicTrack) => deleteTrack(track),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  function play(track: MusicTrack) {
    if (playing === track.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    if (!track.audioUrl) return;
    const audio = new Audio(track.audioUrl);
    audio.addEventListener("ended", () => setPlaying(null));
    audioRef.current = audio;
    void audio.play().catch(() => setPlaying(null));
    setPlaying(track.id);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 font-[Fraunces] text-2xl font-semibold">
          <Music className="h-5 w-5 text-primary" />
          {t("mus_admin_title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("mus_admin_sub")}</p>
      </div>

      {/* Add a track */}
      <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
        <p className="font-medium">{t("mus_admin_add")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs transition hover:border-primary/50"
            >
              <Upload className="h-3.5 w-3.5" />
              {file ? file.name.slice(0, 22) : t("mus_admin_file")}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("mus_admin_upload")}
          </button>
          <p className="text-xs text-muted-foreground">{t("mus_admin_rights")}</p>
        </div>
      </div>

      {/* Library */}
      {tracks.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("mus_loading")}
        </p>
      ) : (tracks.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">{t("mus_admin_empty")}</p>
      ) : (
        <div className="space-y-3">
          {tracks.data!.map((track) => (
            <div
              key={track.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-4"
            >
              <button
                type="button"
                onClick={() => play(track)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs transition hover:border-primary/50"
              >
                {playing === track.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
              <input
                defaultValue={track.title}
                onBlur={(e) =>
                  e.target.value !== track.title &&
                  patch.mutate({ id: track.id, patch: { title: e.target.value } })
                }
                aria-label={t("mus_admin_track_title")}
                className="min-w-[10rem] flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <select
                value={track.category}
                onChange={(e) => patch.mutate({ id: track.id, patch: { category: e.target.value } })}
                aria-label={t("mus_admin_category")}
                className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              >
                {MUSIC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`mus_cat_${c}`)}
                  </option>
                ))}
                {!MUSIC_CATEGORIES.includes(track.category as never) && (
                  <option value={track.category}>{track.category}</option>
                )}
              </select>
              <span className="text-xs text-muted-foreground">
                {t("mus_duration")}: {Math.round(track.durationSeconds)}s
              </span>
              <label className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t("mus_admin_order")}</span>
                <input
                  type="number"
                  defaultValue={track.sortOrder}
                  onBlur={(e) =>
                    Number(e.target.value) !== track.sortOrder &&
                    patch.mutate({
                      id: track.id,
                      patch: { sort_order: Number(e.target.value) || 0 },
                    })
                  }
                  className="w-20 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-sm outline-none focus:border-primary/60"
                />
              </label>
              <button
                type="button"
                onClick={() => patch.mutate({ id: track.id, patch: { is_active: !track.isActive } })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  track.isActive
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground"
                }`}
              >
                {track.isActive ? t("mus_admin_active") : t("mus_admin_inactive")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t("mus_admin_delete_confirm"))) remove.mutate(track);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
                {t("mus_admin_delete")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
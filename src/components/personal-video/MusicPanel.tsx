import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Music, Pause, Play, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  fetchActiveTracks,
  musicUrl,
  removeCustomerMusic,
  uploadCustomerMusic,
} from "@/lib/music/library";
import {
  DEFAULT_MUSIC_SETTINGS,
  MUSIC_CATEGORIES,
  musicPlan,
  type MusicMode,
  type PvgMusicSettings,
} from "@/lib/music/types";

const MODES: MusicMode[] = ["none", "library", "upload"];

/**
 * Background music of the whole video: the Project Joy library, music the
 * customer brings, or no music at all. Nothing here costs a credit and
 * nothing here touches the voices of the greeting.
 */
export function MusicPanel({
  projectId,
  settings,
  videoSeconds,
  disabled,
  onChange,
}: {
  projectId: string;
  settings: PvgMusicSettings;
  videoSeconds: number;
  disabled?: boolean;
  onChange: (next: PvgMusicSettings) => void;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<string>("all");
  const [playing, setPlaying] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const tracks = useQuery({
    queryKey: ["music", "active"],
    queryFn: fetchActiveTracks,
    enabled: settings.mode === "library",
  });

  // A playable link for whatever this project has chosen.
  useEffect(() => {
    let alive = true;
    const bucket = settings.mode === "upload" ? settings.uploadBucket : settings.trackBucket;
    const path = settings.mode === "upload" ? settings.uploadPath : settings.trackPath;
    if (!bucket || !path) {
      setSelectedUrl(null);
      return;
    }
    void musicUrl(bucket, path).then((url) => {
      if (alive) setSelectedUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [
    settings.mode,
    settings.trackBucket,
    settings.trackPath,
    settings.uploadBucket,
    settings.uploadPath,
  ]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function play(id: string, url: string | null) {
    if (!url) return;
    if (playing === id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.addEventListener("ended", () => setPlaying(null));
    audioRef.current = audio;
    void audio.play().catch(() => setPlaying(null));
    setPlaying(id);
  }

  function stop() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
  }

  /** Switching option never leaves the previous choice behind. */
  function setMode(mode: MusicMode) {
    stop();
    if (mode === settings.mode) return;
    if (mode === "none") {
      onChange({
        ...DEFAULT_MUSIC_SETTINGS,
        volume: settings.volume,
        voiceVolume: settings.voiceVolume,
        musicVolume: settings.musicVolume,
        mode: "none",
      });
      return;
    }
    if (mode === "library") {
      onChange({
        ...settings,
        mode: "library",
        uploadBucket: null,
        uploadPath: null,
        uploadName: "",
        uploadDurationSeconds: 0,
      });
      return;
    }
    onChange({
      ...settings,
      mode: "upload",
      trackId: null,
      trackTitle: "",
      trackCategory: "",
      trackBucket: null,
      trackPath: null,
    });
  }

  async function handleUpload(file: File) {
    setUploading(true);
    stop();
    try {
      const stored = await uploadCustomerMusic(projectId, file);
      onChange({
        ...settings,
        mode: "upload",
        trackId: null,
        trackTitle: "",
        trackCategory: "",
        trackBucket: null,
        trackPath: null,
        uploadBucket: stored.bucket,
        uploadPath: stored.path,
        uploadName: stored.name,
        uploadDurationSeconds: stored.durationSeconds,
      });
      toast.success(t("mus_upload_done"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setUploading(false);
    }
  }

  const visible = useMemo(() => {
    const all = tracks.data ?? [];
    return category === "all" ? all : all.filter((track) => track.category === category);
  }, [tracks.data, category]);

  const categories = useMemo(() => {
    const used = new Set((tracks.data ?? []).map((track) => track.category));
    return MUSIC_CATEGORIES.filter((c) => used.has(c));
  }, [tracks.data]);

  const selectedTitle = settings.mode === "upload" ? settings.uploadName : settings.trackTitle;
  const selectedSeconds =
    settings.mode === "upload"
      ? settings.uploadDurationSeconds
      : (tracks.data?.find((track) => track.id === settings.trackId)?.durationSeconds ?? 0);
  const plan = musicPlan(settings, videoSeconds, selectedSeconds);

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
      <p className="mb-4 flex flex-wrap items-center gap-2 font-display text-base font-semibold">
        <span className="text-primary">
          <Music className="h-4 w-4" />
        </span>
        {t("mus_title")}
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("mus_free")}
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => setMode(mode)}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition disabled:opacity-60 ${
              settings.mode === mode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 hover:border-primary/40"
            }`}
          >
            {t(`mus_mode_${mode}`)}
          </button>
        ))}
      </div>

      {settings.mode === "none" && (
        <p className="mt-4 text-xs text-muted-foreground">{t("mus_none_note")}</p>
      )}

      {/* Chosen music --------------------------------------------------- */}
      {settings.mode !== "none" && selectedTitle && (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("mus_selected")}
          </p>
          <p className="mt-1 font-display text-sm font-semibold">{selectedTitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => play("selected", selectedUrl)}
              disabled={!selectedUrl}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-medium transition hover:border-primary/50 disabled:opacity-50"
            >
              {playing === "selected" ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {playing === "selected" ? t("mus_pause") : t("mus_play")}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                settings.mode === "upload" ? fileRef.current?.click() : setMode("library")
              }
              className="rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50 disabled:opacity-60"
            >
              {t("mus_replace")}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                stop();
                if (settings.mode === "upload" && settings.uploadBucket && settings.uploadPath) {
                  void removeCustomerMusic(settings.uploadBucket, settings.uploadPath).catch(
                    () => undefined,
                  );
                }
                onChange({
                  ...DEFAULT_MUSIC_SETTINGS,
                  volume: settings.volume,
                  voiceVolume: settings.voiceVolume,
                  musicVolume: settings.musicVolume,
                  mode: settings.mode,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("mus_remove")}
            </button>
          </div>
          {plan && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {t("mus_plan").replace("{seconds}", String(plan.neededSeconds))}
              {plan.loops > 1 ? ` ${t("mus_plan_loop")}` : ""}
            </p>
          )}
        </div>
      )}

      {/* Project Joy library -------------------------------------------- */}
      {settings.mode === "library" && (
        <div className="mt-5">
          {tracks.isLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("mus_loading")}
            </p>
          ) : (tracks.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">{t("mus_empty")}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {["all", ...categories].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                      category === c
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    {c === "all" ? t("mus_filter_all") : t(`mus_cat_${c}`)}
                  </button>
                ))}
              </div>

              <ul className="mt-4 space-y-2">
                {visible.map((track) => (
                  <li
                    key={track.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                      settings.trackId === track.id
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{track.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t(`mus_cat_${track.category}`)}
                        {track.durationSeconds ? ` · ${Math.round(track.durationSeconds)}s` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => play(track.id, track.audioUrl ?? null)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/50"
                      >
                        {playing === track.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {playing === track.id ? t("mus_pause") : t("mus_play")}
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          stop();
                          onChange({
                            ...settings,
                            mode: "library",
                            trackId: track.id,
                            trackTitle: track.title,
                            trackCategory: track.category,
                            trackBucket: track.storageBucket,
                            trackPath: track.storagePath,
                            uploadBucket: null,
                            uploadPath: null,
                            uploadName: "",
                            uploadDurationSeconds: 0,
                          });
                        }}
                        className="rounded-full bg-gold-gradient px-4 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
                      >
                        {t("mus_select")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Music the customer brings --------------------------------------- */}
      {settings.mode === "upload" && (
        <div className="mt-5">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleUpload(file);
            }}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-xs font-medium transition hover:border-primary/50 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? t("mus_uploading") : t("mus_upload_cta")}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("mus_upload_hint")}</p>
        </div>
      )}

      {/* Volume, always available ---------------------------------------- */}
      {settings.mode !== "none" && (
        <div className="mt-6 border-t border-border/60 pt-5">
          <p className="text-xs font-medium text-muted-foreground">{t("mus_volume")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {VOLUMES.map((level) => (
              <button
                key={level}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...settings, volume: level })}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition disabled:opacity-60 ${
                  settings.volume === level
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                {t(`mus_vol_${level}`)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {t("mus_volume_hint")} {t("mus_ducking")}
          </p>
        </div>
      )}
    </div>
  );
}

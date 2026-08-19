import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Music2, Pause, Play, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { fetchActiveTracks } from "@/lib/music/library";
import { MUSIC_VOLUME_GAIN, type MusicTrack, type MusicVolume } from "@/lib/music/types";
import type { LiveCardMusic } from "@/lib/live-cards/types";

const VOLUMES: MusicVolume[] = ["quiet", "medium", "louder"];
const VOLUME_LABEL: Record<MusicVolume, string> = {
  quiet: "mus_vol_quiet",
  medium: "mus_vol_medium",
  louder: "mus_vol_louder",
};

/**
 * Optional background music for a live greeting card. Live cards never speak,
 * so this is only about choosing a track, listening to it and setting how loud
 * it should sit inside the finished card.
 */
export function LiveMusicPanel({
  music,
  onChange,
}: {
  music: LiveCardMusic;
  onChange: (next: LiveCardMusic) => void;
}) {
  const { t } = useI18n();
  const [tracks, setTracks] = useState<MusicTrack[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchActiveTracks()
      .then((list) => {
        if (!cancelled) setTracks(list);
      })
      .catch(() => {
        if (!cancelled) setTracks([]);
      });
    return () => {
      cancelled = true;
      audio.current?.pause();
    };
  }, []);

  const selected = useMemo(
    () => tracks?.find((track) => track.id === music.trackId) ?? null,
    [tracks, music.trackId],
  );

  function preview(track: MusicTrack) {
    if (playing === track.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    if (!track.audioUrl) return;
    const element = new Audio(track.audioUrl);
    element.volume = Math.min(1, Math.max(0.05, music.gain * 3));
    element.onended = () => setPlaying(null);
    audio.current = element;
    void element.play().catch(() => setPlaying(null));
    setPlaying(track.id);
  }

  function choose(track: MusicTrack) {
    onChange({
      ...music,
      mode: "library",
      trackId: track.id,
      trackTitle: track.title,
      trackBucket: track.storageBucket,
      trackPath: track.storagePath,
    });
  }

  function clear() {
    audio.current?.pause();
    setPlaying(null);
    onChange({
      ...music,
      mode: "none",
      trackId: null,
      trackTitle: "",
      trackBucket: null,
      trackPath: null,
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <Music2 className="h-4 w-4 text-primary" />
        {t("mus_title")}
      </p>

      {music.mode === "library" && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2">
          <span className="min-w-0 truncate text-xs">
            {t("mus_selected")}: {selected?.title || music.trackTitle}
          </span>
          <button
            type="button"
            onClick={clear}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs transition hover:bg-secondary"
          >
            <X className="h-3 w-3" />
            {t("mus_remove")}
          </button>
        </div>
      )}

      {tracks === null ? (
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("mus_loading")}
        </p>
      ) : tracks.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("mus_empty")}</p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {tracks.map((track) => (
            <li
              key={track.id}
              className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => preview(track)}
                aria-label={playing === track.id ? t("mus_pause") : t("mus_play")}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 transition hover:bg-secondary"
              >
                {playing === track.id ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="min-w-0 flex-1 truncate text-xs">{track.title}</span>
              <button
                type="button"
                onClick={() => choose(track)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                  music.trackId === track.id
                    ? "bg-primary/15 text-primary"
                    : "border border-border/60 hover:bg-secondary"
                }`}
              >
                {music.trackId === track.id ? t("mus_selected") : t("mus_select")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {music.mode === "library" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("mus_volume")}</p>
          <div className="flex gap-2">
            {VOLUMES.map((volume) => (
              <button
                key={volume}
                type="button"
                onClick={() =>
                  onChange({ ...music, volume, gain: MUSIC_VOLUME_GAIN[volume] })
                }
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs transition ${
                  music.volume === volume
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t(VOLUME_LABEL[volume])}
              </button>
            ))}
          </div>
        </div>
      )}

      {music.mode === "none" && <p className="text-xs text-muted-foreground">{t("mus_none_note")}</p>}
    </div>
  );
}

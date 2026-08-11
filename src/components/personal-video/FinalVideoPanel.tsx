import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Film, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { musicUrl } from "@/lib/music/library";
import type { PvgMusicSettings } from "@/lib/music/types";
import { getPvgVoiceover } from "@/lib/personal-video/voice.functions";
import {
  getPvgVideo,
  retryPvgVideo,
  startPvgVideo,
} from "@/lib/personal-video/video-render.functions";
import { isPvgVideoRunning, pvgVideoStatusKey } from "@/lib/personal-video/video-render";

/**
 * The film itself: the one button that confirms the order, the calm progress
 * of the work and, at the end, the finished greeting played with its voice,
 * its music and its scene sounds together.
 */
export function FinalVideoPanel({
  projectId,
  music,
  disabled,
  onChanged,
}: {
  projectId: string;
  music: PvgMusicSettings;
  disabled?: boolean;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  const load = useServerFn(getPvgVideo);
  const start = useServerFn(startPvgVideo);
  const retry = useServerFn(retryPvgVideo);
  const loadVoice = useServerFn(getPvgVoiceover);

  const [starting, setStarting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const query = useQuery({
    queryKey: ["pvg", "video", projectId],
    queryFn: () => load({ data: { projectId } }),
    refetchInterval: (q) => (isPvgVideoRunning(q.state.data?.video ?? null) ? 5000 : false),
  });
  const video = query.data?.video ?? null;
  const running = isPvgVideoRunning(video);

  const voiceQuery = useQuery({
    queryKey: ["pvg", "voice", projectId],
    queryFn: () => loadVoice({ data: { projectId } }),
  });
  const voiceUrl = voiceQuery.data?.voiceover?.audioUrl ?? null;

  const bucket = music.mode === "upload" ? music.uploadBucket : music.trackBucket;
  const path = music.mode === "upload" ? music.uploadPath : music.trackPath;
  const musicQuery = useQuery({
    queryKey: ["pvg", "music-url", bucket, path],
    queryFn: () => musicUrl(bucket, path),
    enabled: Boolean(bucket && path),
  });
  const trackUrl = musicQuery.data ?? null;

  /** Everything that is not the voice steps back while the voice speaks. */
  const backgroundGain = useCallback(
    (isSpeaking: boolean) =>
      isSpeaking && music.ducking.enabled ? music.ducking.duckedGain : 1,
    [music.ducking.enabled, music.ducking.duckedGain],
  );

  useEffect(() => {
    if (voiceRef.current) voiceRef.current.volume = music.voiceVolume;
    if (musicRef.current) musicRef.current.volume = music.musicVolume * backgroundGain(speaking);
    if (videoRef.current) videoRef.current.volume = backgroundGain(speaking);
  }, [music.voiceVolume, music.musicVolume, speaking, backgroundGain]);

  function stopAll() {
    videoRef.current?.pause();
    voiceRef.current?.pause();
    musicRef.current?.pause();
    setPlaying(false);
    setSpeaking(false);
  }

  function togglePlay() {
    if (playing) {
      stopAll();
      return;
    }
    const v = videoRef.current;
    const voice = voiceRef.current;
    const track = musicRef.current;
    if (v) {
      v.currentTime = 0;
      v.volume = backgroundGain(Boolean(voice));
      void v.play().catch(() => undefined);
    }
    if (voice) {
      voice.currentTime = 0;
      voice.volume = music.voiceVolume;
      void voice.play().catch(() => undefined);
    }
    if (track) {
      track.currentTime = 0;
      track.loop = true;
      track.volume = music.musicVolume * backgroundGain(Boolean(voice));
      void track.play().catch(() => undefined);
    }
    setSpeaking(Boolean(voice));
    setPlaying(true);
  }

  async function create() {
    if (starting || running || disabled) return;
    setStarting(true);
    try {
      const res = await start({ data: { projectId } });
      if (!res.ok) {
        toast.error(t(res.error ?? "pvr_err_generic"));
      }
      await query.refetch();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("pvr_err_generic"));
    } finally {
      setStarting(false);
    }
  }

  async function tryAgain() {
    await retry({ data: { projectId } });
    await query.refetch();
    await create();
  }

  return (
    <div className="mt-6 rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
      <p className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <span className="text-primary">
          <Film className="h-4 w-4" />
        </span>
        {t("pvr_title")}
      </p>

      {video?.status === "ready" && video.videoUrl ? (
        <div className="space-y-3">
          <video
            ref={videoRef}
            src={video.videoUrl}
            playsInline
            controls={false}
            className="w-full rounded-2xl"
            onEnded={stopAll}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? t("pvr_pause") : t("pvr_play")}
            </button>
            <a
              href={video.videoUrl}
              download
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-sm font-medium transition hover:border-primary/50"
            >
              <Download className="h-4 w-4" />
              {t("pvr_download")}
            </a>
          </div>
          <p className="text-xs text-primary">{t("pvr_status_ready")}</p>
          {voiceUrl && (
            <audio
              ref={voiceRef}
              src={voiceUrl}
              preload="metadata"
              className="hidden"
              onEnded={() => setSpeaking(false)}
            />
          )}
          {trackUrl && (
            <audio ref={musicRef} src={trackUrl} preload="metadata" className="hidden" />
          )}
        </div>
      ) : running ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t(pvgVideoStatusKey(video!.status))}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width:
                  video!.status === "pending" ? "20%" : video!.status === "processing" ? "65%" : "90%",
              }}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("pvr_leave_note")}</p>
        </div>
      ) : video?.status === "failed" ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">{t("pvr_status_failed")}</p>
          <button
            type="button"
            disabled={disabled || starting}
            onClick={() => void tryAgain()}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-sm font-medium transition hover:border-primary/50 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            {t("pvr_retry")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            disabled={disabled || starting}
            onClick={() => void create()}
            className="w-full rounded-full bg-gold-gradient px-6 py-4 text-base font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
          >
            {starting ? t("pvr_creating") : t("pvr_create")}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            {t("pvr_confirm_note")}
          </p>
        </div>
      )}
    </div>
  );
}
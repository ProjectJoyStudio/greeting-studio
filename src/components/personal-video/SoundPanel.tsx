import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, Sliders } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { musicUrl } from "@/lib/music/library";
import type { PvgMusicSettings } from "@/lib/music/types";
import { getPvgVoiceover } from "@/lib/personal-video/voice.functions";

/**
 * The balance between the greeting voice and the background music. Moving a
 * slider only changes what is heard: nothing is generated, reloaded or paid
 * for again. Both values travel with the draft into the final mixing.
 */
export function SoundPanel({
  projectId,
  settings,
  disabled,
  onChange,
}: {
  projectId: string;
  settings: PvgMusicSettings;
  disabled?: boolean;
  onChange: (next: PvgMusicSettings) => void;
}) {
  const { t } = useI18n();
  const loadVoice = useServerFn(getPvgVoiceover);
  const [playing, setPlaying] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const rampRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const voiceQuery = useQuery({
    queryKey: ["pvg", "voice", projectId],
    queryFn: () => loadVoice({ data: { projectId } }),
  });
  const voiceUrl = voiceQuery.data?.voiceover?.audioUrl ?? null;

  const bucket = settings.mode === "upload" ? settings.uploadBucket : settings.trackBucket;
  const path = settings.mode === "upload" ? settings.uploadPath : settings.trackPath;
  const musicQuery = useQuery({
    queryKey: ["pvg", "music-url", bucket, path],
    queryFn: () => musicUrl(bucket, path),
    enabled: Boolean(bucket && path),
  });
  const trackUrl = musicQuery.data ?? null;

  /** Music sits under the voice while somebody is speaking. */
  const musicTarget = useCallback(
    (isSpeaking: boolean) =>
      settings.musicVolume *
      (isSpeaking && settings.ducking.enabled ? settings.ducking.duckedGain : 1),
    [settings.musicVolume, settings.ducking.enabled, settings.ducking.duckedGain],
  );

  /** Never a jump: the music always slides to its new level. */
  const rampMusic = useCallback((to: number, seconds: number) => {
    const audio = musicRef.current;
    if (!audio) return;
    if (rampRef.current) clearInterval(rampRef.current);
    const from = audio.volume;
    const steps = Math.max(1, Math.round((seconds * 1000) / 40));
    let step = 0;
    rampRef.current = setInterval(() => {
      step += 1;
      const value = from + ((to - from) * step) / steps;
      audio.volume = Math.min(1, Math.max(0, value));
      if (step >= steps && rampRef.current) {
        clearInterval(rampRef.current);
        rampRef.current = null;
      }
    }, 40);
  }, []);

  // Live levels while a slider moves: no regeneration, no reloading.
  useEffect(() => {
    if (voiceRef.current) voiceRef.current.volume = settings.voiceVolume;
  }, [settings.voiceVolume]);

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicTarget(speaking);
  }, [settings.musicVolume, speaking, musicTarget]);

  useEffect(() => {
    return () => {
      if (rampRef.current) clearInterval(rampRef.current);
      voiceRef.current?.pause();
      musicRef.current?.pause();
    };
  }, []);

  function stop() {
    voiceRef.current?.pause();
    musicRef.current?.pause();
    setPlaying(false);
    setSpeaking(false);
  }

  function toggle() {
    if (playing) {
      stop();
      return;
    }
    const voice = voiceRef.current;
    const music = musicRef.current;
    if (!voice && !music) return;
    if (voice) {
      voice.currentTime = 0;
      voice.volume = settings.voiceVolume;
      void voice.play().catch(() => undefined);
    }
    if (music) {
      music.currentTime = 0;
      music.loop = true;
      music.volume = musicTarget(Boolean(voice));
      void music.play().catch(() => undefined);
    }
    setSpeaking(Boolean(voice));
    setPlaying(true);
  }

  const percent = (value: number) => Math.round(value * 100);

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
      <p className="mb-4 flex flex-wrap items-center gap-2 font-display text-base font-semibold">
        <span className="text-primary">
          <Sliders className="h-4 w-4" />
        </span>
        {t("pvs_audio")}
      </p>

      <div className="space-y-5">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{t("pvs_voice_volume")}</span>
            <span>{percent(settings.voiceVolume)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            disabled={disabled}
            value={percent(settings.voiceVolume)}
            aria-label={t("pvs_voice_volume")}
            onChange={(e) => onChange({ ...settings, voiceVolume: Number(e.target.value) / 100 })}
            className="w-full accent-primary"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{t("pvs_music_volume")}</span>
            <span>{percent(settings.musicVolume)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            disabled={disabled}
            value={percent(settings.musicVolume)}
            aria-label={t("pvs_music_volume")}
            onChange={(e) => {
              const next = Number(e.target.value) / 100;
              if (musicRef.current) {
                musicRef.current.volume =
                  next * (speaking && settings.ducking.enabled ? settings.ducking.duckedGain : 1);
              }
              onChange({ ...settings, musicVolume: next });
            }}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {(voiceUrl || trackUrl) && (
        <div className="mt-5">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-sm font-medium transition hover:border-primary/50"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? t("mus_pause") : t("mus_play")}
          </button>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t("mus_ducking")}</p>

      {voiceUrl && (
        <audio
          ref={voiceRef}
          src={voiceUrl}
          preload="metadata"
          className="hidden"
          onEnded={() => {
            setSpeaking(false);
            rampMusic(settings.musicVolume, settings.ducking.releaseSeconds);
            if (!trackUrl) setPlaying(false);
          }}
        />
      )}
      {trackUrl && <audio ref={musicRef} src={trackUrl} preload="metadata" className="hidden" />}
    </div>
  );
}

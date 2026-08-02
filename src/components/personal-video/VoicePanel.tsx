import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mic, Pause, Play, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { generatePvgVoiceover, getPvgVoiceover } from "@/lib/personal-video/voice.functions";
import {
  PVG_DEFAULT_VOICE_ID,
  PVG_VOICES,
  type PvgVoiceover,
} from "@/lib/personal-video/voice/catalog";

/**
 * The spoken greeting of one order. A person picks a voice, listens, and may
 * create a new version — the order always keeps exactly one voice.
 */
export function VoicePanel({
  projectId,
  greeting,
  language,
  disabled,
}: {
  projectId: string;
  greeting: string;
  language: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const load = useServerFn(getPvgVoiceover);
  const create = useServerFn(generatePvgVoiceover);

  const [voiceId, setVoiceId] = useState(PVG_DEFAULT_VOICE_ID);
  const [voiceover, setVoiceover] = useState<PvgVoiceover | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const running = useRef(false);

  // The saved voice comes back with the draft, ready to play again.
  const saved = useQuery({
    queryKey: ["pvg", "voice", projectId],
    queryFn: () => load({ data: { projectId } }),
  });

  useEffect(() => {
    const found = saved.data?.voiceover ?? null;
    if (!found) return;
    setVoiceover(found);
    setVoiceId(found.voiceId);
  }, [saved.data]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const stop = () => setPlaying(false);
    audio.addEventListener("ended", stop);
    audio.addEventListener("pause", stop);
    return () => {
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("pause", stop);
    };
  }, [voiceover?.audioUrl]);

  async function generate() {
    // A single request at a time: extra clicks are simply ignored.
    if (running.current || busy || disabled) return;
    if (greeting.trim().length < 2) {
      toast.error(t("pvv_need_text"));
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      const res = await create({ data: { projectId, text: greeting, voiceId, language } });
      audioRef.current?.pause();
      setPlaying(false);
      setVoiceover(res.voiceover);
      toast.success(t("pvv_success"));
    } catch {
      // The earlier voice stays exactly as it was.
      toast.error(t("pvv_failed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
      <p className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <span className="text-primary">
          <Mic className="h-4 w-4" />
        </span>
        {t("pvv_title")}
      </p>

      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("pvv_choose")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PVG_VOICES.map((voice) => (
          <button
            key={voice.id}
            type="button"
            disabled={busy || disabled}
            onClick={() => setVoiceId(voice.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60 ${
              voiceId === voice.id
                ? "border-primary bg-primary/10"
                : "border-border/60 hover:border-primary/40"
            }`}
          >
            <span className="block text-sm font-medium">{voice.name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {t(`pvv_${voice.description}`)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => void generate()}
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : voiceover ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {busy ? t("pvv_working") : voiceover ? t("pvv_regenerate") : t("pvv_generate")}
        </button>

        {voiceover?.audioUrl && (
          <button
            type="button"
            onClick={togglePlay}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-sm font-medium transition hover:border-primary/50 disabled:opacity-60"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? t("pvv_pause") : t("pvv_play")}
          </button>
        )}
      </div>

      {voiceover?.audioUrl && (
        <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-4">
          <audio ref={audioRef} src={voiceover.audioUrl} preload="metadata" className="w-full" controls />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>{t("pvv_ready")}</span>
            <span>
              {t("pvv_duration")}: {Math.round(voiceover.durationSeconds * 10) / 10}s
            </span>
            <span>
              {voiceover.characterCount} {t("pvv_characters")}
            </span>
            <span>
              {t("pvv_language")}: {voiceover.language.toUpperCase()}
            </span>
            <span>{voiceover.voiceName}</span>
            <span>
              {t("pvv_created")}: {new Date(voiceover.generatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">{t("pvv_free_note")}</p>
    </div>
  );
}
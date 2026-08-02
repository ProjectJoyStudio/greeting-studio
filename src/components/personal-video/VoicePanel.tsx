import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Headphones, Loader2, Mic, Pause, Play, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  generatePvgVoiceover,
  getPvgVoiceover,
  previewPvgVoice,
} from "@/lib/personal-video/voice.functions";
import {
  PVG_DEFAULT_VOICE_ID,
  PVG_VOICES,
  VOICE_PROVIDER_LABELS,
  findVoice,
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
  const preview = useServerFn(previewPvgVoice);

  const [voiceId, setVoiceId] = useState(PVG_DEFAULT_VOICE_ID);
  const [voiceover, setVoiceover] = useState<PvgVoiceover | null>(null);
  const [busy, setBusy] = useState(false);
  const [sampling, setSampling] = useState(false);
  const [lastStatus, setLastStatus] = useState<"success" | "failed" | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sampleRef = useRef<HTMLAudioElement | null>(null);
  const running = useRef(false);

  const selected = findVoice(voiceId);
  const providerLabel = VOICE_PROVIDER_LABELS[selected.provider] ?? selected.provider;

  // The saved audio only matches while both the voice and the greeting are unchanged.
  const voiceChanged = Boolean(voiceover && voiceover.voiceId !== voiceId);
  const textChanged = Boolean(
    voiceover && voiceover.greetingText.trim() !== greeting.trim(),
  );
  const outdated = voiceChanged || textChanged;

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
      setLastStatus("success");
      toast.success(t("pvv_success"));
    } catch {
      // The earlier voice stays exactly as it was.
      setLastStatus("failed");
      toast.error(t("pvv_failed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  async function playSample() {
    if (sampling || busy || disabled) return;
    setSampling(true);
    try {
      const res = await preview({ data: { voiceId, language } });
      audioRef.current?.pause();
      sampleRef.current?.pause();
      const audio = new Audio(`data:${res.mimeType};base64,${res.audioBase64}`);
      sampleRef.current = audio;
      await audio.play();
    } catch {
      toast.error(t("pvv_preview_failed"));
    } finally {
      setSampling(false);
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

      {/* The chosen voice is always visible, so nobody wonders who will speak. */}
      <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("pvv_selected")}
        </p>
        <p className="mt-1 font-display text-base font-semibold">{selected.name}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            {t("pvv_language")}: {language.toUpperCase()}
          </span>
          <span>
            {t("pvv_gender")}: {t(selected.gender === "female" ? "pvv_female" : "pvv_male")}
          </span>
          <span>
            {t("pvv_provider")}: {providerLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void playSample()}
          disabled={sampling || busy || disabled}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-medium transition hover:border-primary/50 disabled:opacity-60"
        >
          {sampling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Headphones className="h-3.5 w-3.5" />
          )}
          {sampling ? t("pvv_preview_working") : t("pvv_preview")}
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("pvv_preview_note")}</p>
      </div>

      {voiceover && outdated && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t(voiceChanged ? "pvv_outdated_voice" : "pvv_outdated_text")}</span>
        </div>
      )}

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

        {voiceover?.audioUrl && !outdated && (
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
          <audio
            ref={audioRef}
            src={voiceover.audioUrl}
            preload="metadata"
            className={`w-full ${outdated ? "pointer-events-none opacity-50" : ""}`}
            controls
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>{outdated ? t("pvv_outdated_badge") : t("pvv_ready")}</span>
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

      {/* Test information — development only, safe to remove later. */}
      {import.meta.env.DEV && (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("pvv_test_info")}
          </p>
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
            <div className="flex justify-between gap-2">
              <dt>{t("pvv_provider")}</dt>
              <dd className="font-medium text-foreground">{providerLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t("pvv_selected")}</dt>
              <dd className="font-medium text-foreground">
                {selected.name} ({selected.id})
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t("pvv_language")}</dt>
              <dd className="font-medium text-foreground">{language.toUpperCase()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t("pvv_characters")}</dt>
              <dd className="font-medium text-foreground">
                {voiceover?.characterCount ?? greeting.trim().length}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t("pvv_duration")}</dt>
              <dd className="font-medium text-foreground">
                {voiceover ? `${Math.round(voiceover.durationSeconds * 10) / 10}s` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t("pvv_status")}</dt>
              <dd className="font-medium text-foreground">
                {lastStatus === "failed"
                  ? t("pvv_status_fail")
                  : lastStatus === "success" || voiceover
                    ? t("pvv_status_ok")
                    : "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">{t("pvv_free_note")}</p>
    </div>
  );
}
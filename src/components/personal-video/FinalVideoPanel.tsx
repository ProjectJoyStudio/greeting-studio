import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Film, Loader2, Pause, Play, RotateCcw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { creditWord } from "@/lib/credits/i18n";
import { useCreditBalance, useRefreshCreditBalance } from "@/lib/credits/useCreditBalance";
import { musicUrl } from "@/lib/music/library";
import type { PvgMusicSettings } from "@/lib/music/types";
import {
  getPvgVideo,
  markPvgVideoDelivered,
  attachPvgVideoMix,
  preparePvgVideoMix,
  retryPvgVideo,
  selectPvgVideoVariant,
  startPvgVideo,
} from "@/lib/personal-video/video-render.functions";
import {
  PVR_REGENERATION_CREDITS,
  isPvgVideoRunning,
  pvgVideoStatusKey,
} from "@/lib/personal-video/video-render";
import { DeliveryDialog } from "./DeliveryDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  canMixInBrowser,
  hasMusicChoice,
  mixMusicIntoVideo,
  musicMixSignature,
} from "@/lib/personal-video/mix/music-mix";

/**
 * The film itself: the one button that confirms the order, the calm progress
 * of the work and, at the end, the finished greeting. The greeting voice is
 * already inside the film — only the chosen music is added on top of it.
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
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const load = useServerFn(getPvgVideo);
  const start = useServerFn(startPvgVideo);
  const retry = useServerFn(retryPvgVideo);
  const choose = useServerFn(selectPvgVideoVariant);
  const deliver = useServerFn(markPvgVideoDelivered);
  const prepareMix = useServerFn(preparePvgVideoMix);
  const attachMix = useServerFn(attachPvgVideoMix);
  const { isTest } = useCreditBalance();
  const refreshCredits = useRefreshCreditBalance();
  const word = creditWord(lang, isTest, t("pvg_credits_word"));

  const [starting, setStarting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [mixing, setMixing] = useState(false);
  const mixAttempts = useRef<Set<string>>(new Set());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const query = useQuery({
    queryKey: ["pvg", "video", projectId],
    queryFn: () => load({ data: { projectId } }),
    refetchInterval: (q) => (isPvgVideoRunning(q.state.data?.video ?? null) ? 5000 : false),
  });
  const state = query.data ?? null;
  const video = state?.video ?? null;
  const running = isPvgVideoRunning(video);
  const readyVariants = useMemo(
    () => (state?.variants ?? []).filter((v) => v.status === "ready" && v.videoUrl),
    [state],
  );
  const selected = useMemo(
    () =>
      readyVariants.find((v) => v.id === activeId) ??
      readyVariants.find((v) => v.id === state?.selectedId) ??
      readyVariants[0] ??
      null,
    [readyVariants, activeId, state],
  );
  const balance = state?.balance ?? 0;

  const bucket = music.mode === "upload" ? music.uploadBucket : music.trackBucket;
  const path = music.mode === "upload" ? music.uploadPath : music.trackPath;
  const musicQuery = useQuery({
    queryKey: ["pvg", "music-url", bucket, path],
    queryFn: () => musicUrl(bucket, path),
    enabled: Boolean(bucket && path),
  });
  const trackUrl = musicQuery.data ?? null;

  // One authoritative file: the music the customer chose is written into the
  // film itself, so the page and the downloaded copy sound exactly alike.
  const signature = musicMixSignature(music);
  const musicInside = (selected?.mixSignature ?? "none") === signature;
  const needsMix = Boolean(selected?.videoUrl) && !musicInside;

  useEffect(() => {
    if (!needsMix || mixing || !selected) return;
    const key = `${selected.id}:${signature}`;
    if (mixAttempts.current.has(key)) return;
    if (!canMixInBrowser()) return;
    mixAttempts.current.add(key);
    let cancelled = false;
    void (async () => {
      setMixing(true);
      try {
        const slot = await prepareMix({ data: { projectId, videoId: selected.id } });
        if (!slot.ok || !slot.sourceUrl || !slot.bucket || !slot.path || !slot.token) {
          throw new Error("mix_slot_failed");
        }
        const original = await (await fetch(slot.sourceUrl)).blob();
        const track =
          hasMusicChoice(music) && trackUrl ? await (await fetch(trackUrl)).blob() : null;
        if (hasMusicChoice(music) && !track) throw new Error("music_missing");
        const mixed = await mixMusicIntoVideo(original, track, music);
        const up = await supabase.storage
          .from(slot.bucket)
          .uploadToSignedUrl(slot.path, slot.token, mixed, { contentType: "video/mp4" });
        if (up.error) throw new Error(up.error.message);
        await attachMix({
          data: { projectId, videoId: selected.id, path: slot.path, signature },
        });
        if (!cancelled) await query.refetch();
      } catch {
        if (!cancelled) toast.error(t("pvr_mix_failed"));
      } finally {
        if (!cancelled) setMixing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsMix, selected?.id, signature, trackUrl]);

  /** The music steps back while the greeting inside the film is speaking. */
  const backgroundGain = useCallback(
    (isSpeaking: boolean) => (isSpeaking && music.ducking.enabled ? music.ducking.duckedGain : 1),
    [music.ducking.enabled, music.ducking.duckedGain],
  );

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = musicInside ? 1 : music.voiceVolume;
    if (musicRef.current) musicRef.current.volume = music.musicVolume * backgroundGain(playing);
  }, [music.voiceVolume, music.musicVolume, playing, backgroundGain, musicInside]);

  function stopAll() {
    videoRef.current?.pause();
    musicRef.current?.pause();
    setPlaying(false);
  }

  function togglePlay() {
    if (playing) {
      stopAll();
      return;
    }
    const v = videoRef.current;
    const track = musicRef.current;
    if (v) {
      v.currentTime = 0;
      v.volume = musicInside ? 1 : music.voiceVolume;
      void v.play().catch(() => undefined);
    }
    // Once the music lives inside the file, the second player stays silent.
    if (track && !musicInside) {
      track.currentTime = 0;
      track.loop = true;
      track.volume = music.musicVolume * backgroundGain(true);
      void track.play().catch(() => undefined);
    }
    setPlaying(true);
  }

  async function create(again = false) {
    if (starting || running || disabled) return;
    if (again && balance < PVR_REGENERATION_CREDITS) {
      toast.error(t("pvr_err_credits"));
      return;
    }
    stopAll();
    setStarting(true);
    try {
      const res = await start({ data: { projectId, again } });
      if (!res.ok) {
        toast.error(t(res.error ?? "pvr_err_generic"));
      } else if (again) {
        toast.success(t("pvr_again_started"));
      }
      refreshCredits(res.balance);
      await query.refetch();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("pvr_err_generic"));
    } finally {
      setStarting(false);
    }
  }

  async function pick(videoId: string) {
    setActiveId(videoId);
    stopAll();
    try {
      await choose({ data: { projectId, videoId } });
      await query.refetch();
    } catch {
      // Choosing is free and harmless; the picture already switched.
    }
  }

  async function tryAgain() {
    await retry({ data: { projectId } });
    await query.refetch();
    await create(readyVariants.length > 0);
  }

  /**
   * The film has left the workshop: it is kept safely, but the active page
   * returns to its calm, empty state. Only downloading or sharing does this.
   */
  async function onDelivered(videoId: string) {
    setDelivering(false);
    stopAll();
    setActiveId(null);
    try {
      await deliver({ data: { projectId, videoId } });
    } catch {
      // The customer already has the film; nothing else needs to happen.
    }
    toast.success(t("pvr_delivered"));
    // A finished order is gone: the customer starts page one afresh.
    await navigate({ to: "/video-greeting", search: {}, replace: true });
  }

  return (
    <div className="mt-6 rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
      <p className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <span className="text-primary">
          <Film className="h-4 w-4" />
        </span>
        {t("pvr_title")}
      </p>

      {selected ? (
        <div className="space-y-3">
          <video
            key={selected.id}
            ref={videoRef}
            src={selected.videoUrl ?? undefined}
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
            <button
              type="button"
              onClick={() => {
                stopAll();
                setDelivering(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-sm font-medium transition hover:border-primary/50"
            >
              <Send className="h-4 w-4" />
              {t("pvr_deliver_open")}
            </button>
          </div>
          <p className="text-xs text-primary">{t("pvr_status_ready")}</p>

          {readyVariants.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("pvr_variants_title")}
              </p>
              <div className="flex flex-wrap gap-2">
                {readyVariants
                  .slice()
                  .sort((a, b) => a.variantIndex - b.variantIndex)
                  .map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => void pick(v.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition ${
                        v.id === selected.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      {v.id === selected.id && <Check className="h-3.5 w-3.5" />}
                      {t("pvr_variant")} {v.variantIndex}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {running ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t(pvgVideoStatusKey(video!.status))}
            </p>
          ) : (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <button
                type="button"
                disabled={disabled || starting || balance < PVR_REGENERATION_CREDITS}
                onClick={() => void create(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/50 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {t("pvr_again")} — {PVR_REGENERATION_CREDITS} {word}
              </button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                {balance < PVR_REGENERATION_CREDITS ? t("pvr_err_credits") : t("pvr_again_note")}
              </p>
            </div>
          )}

          {trackUrl && <audio ref={musicRef} src={trackUrl} preload="metadata" className="hidden" />}

          {delivering && selected.videoUrl && (
            <DeliveryDialog
              videoUrl={selected.videoUrl}
              onDelivered={() => void onDelivered(selected.id)}
              onClose={() => setDelivering(false)}
            />
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
                  video!.status === "pending"
                    ? "20%"
                    : video!.status === "processing"
                      ? "60%"
                      : "92%",
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
            onClick={() => void create(false)}
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

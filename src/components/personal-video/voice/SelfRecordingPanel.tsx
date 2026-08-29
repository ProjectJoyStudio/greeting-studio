// "Record the greeting with my own real voice". The customer reads the
// finished greeting themselves and that exact recording becomes the speech of
// the film. No text-to-speech provider is ever involved in this mode.

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mic, Save, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  savePvgMergedVoiceover,
  savePvgPersonRecording,
} from "@/lib/personal-video/voice.functions";
import type { PvgVoiceover } from "@/lib/personal-video/voice/catalog";
import { audioDuration, fileToBase64, mergeInOrder } from "@/lib/personal-video/voice/mixdown";
import { isValidVoiceName } from "@/lib/personal-video/voice/personal-voices";

/** The voice of a greeting spoken by the customer themselves. */
export const SELF_RECORDING_PROVIDER = "self-recording";
export const SELF_RECORDING_VOICE_ID = "self-recording";

export function SelfRecordingPanel({
  projectId,
  personId,
  greeting,
  language,
  videoSeconds,
  disabled,
  onSaved,
}: {
  projectId: string;
  /** The participant who speaks, when the scene has one. */
  personId?: string | null;
  greeting: string;
  language: string;
  videoSeconds: number;
  disabled?: boolean;
  onSaved?: (voiceover: PvgVoiceover) => void;
}) {
  const { t } = useI18n();
  const saveVoiceover = useServerFn(savePvgMergedVoiceover);
  const saveRecording = useServerFn(savePvgPersonRecording);

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [clip, setClip] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const limit = Math.max(1, Math.round(videoSeconds || 0));
  const text = greeting.trim();
  const tooLong = Boolean(clip && clip.seconds > limit + 0.05);

  useEffect(() => {
    return () => {
      if (clip?.url) URL.revokeObjectURL(clip.url);
    };
  }, [clip?.url]);

  async function start() {
    if (disabled || recording || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const base64 = await fileToBase64(blob);
        const seconds = await audioDuration({ base64, mimeType: blob.type });
        if (clip?.url) URL.revokeObjectURL(clip.url);
        setClip({ blob, url: URL.createObjectURL(blob), seconds });
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error(t("pvsr_mic_denied"));
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function discard() {
    if (clip?.url) URL.revokeObjectURL(clip.url);
    setClip(null);
  }

  /**
   * Keeps the recording exactly as it was spoken: the original stays untouched
   * and a studio-readable WAV rendition becomes the speech of the film.
   */
  async function save() {
    if (!clip || busy || disabled) return;
    if (!isValidVoiceName(name)) {
      toast.error(t("pvsr_name_required"));
      return;
    }
    if (tooLong) {
      toast.error(
        t("pvsr_too_long").replace("{n}", String(clip.seconds)).replace("{max}", String(limit)),
      );
      return;
    }
    setBusy(true);
    try {
      const originalBase64 = await fileToBase64(clip.blob);
      const originalMime = clip.blob.type || "audio/webm";
      // The browser records WebM/Opus; providers and storage always receive the
      // compatible WAV rendition prepared here. Nothing is stretched or hurried.
      const wav = await mergeInOrder([{ base64: originalBase64, mimeType: originalMime }], {
        compress: false,
      });

      if (personId) {
        await saveRecording({
          data: {
            projectId,
            personId,
            language,
            originalBase64,
            originalMime,
            extension: originalMime.includes("ogg") ? "ogg" : "webm",
            processedBase64: wav.base64,
            processedMime: wav.mimeType,
            durationSeconds: wav.durationSeconds,
            permissionConfirmed: true,
          },
        }).catch(() => undefined);
      }

      const res = await saveVoiceover({
        data: {
          projectId,
          audioBase64: wav.base64,
          mimeType: wav.mimeType,
          durationSeconds: wav.durationSeconds,
          characterCount: text.length,
          language,
          greetingText: text,
          voiceId: SELF_RECORDING_VOICE_ID,
          voiceName: name.trim(),
          provider: SELF_RECORDING_PROVIDER,
          speechMode: "single" as const,
          syncMode: null,
          trackSummary: [
            { label: name.trim(), durationSeconds: wav.durationSeconds, source: "recording" },
          ],
        },
      });
      toast.success(t("pvsr_saved"));
      onSaved?.(res.voiceover);
    } catch {
      toast.error(t("pvsr_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Mic className="h-3.5 w-3.5 text-primary" />
        {t("pvsr_title")}
      </p>

      {!text ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("pvsr_no_greeting")}</p>
      ) : (
        <>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("pvsr_read_label")}
          </p>
          <p className="mt-1 whitespace-pre-wrap rounded-xl border border-border/50 bg-card/60 p-3 text-sm leading-relaxed">
            {text}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("pvsr_limit").replace("{n}", String(limit))}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!recording ? (
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => void start()}
                className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
              >
                <Mic className="h-3.5 w-3.5" />
                {clip ? t("pvsr_again") : t("pvsr_start")}
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-full border border-destructive/50 px-4 py-2 text-xs font-semibold text-destructive"
              >
                <Square className="h-3.5 w-3.5" />
                {t("pvsr_stop")}
              </button>
            )}
            {recording && (
              <span className="text-[11px] font-medium text-destructive">
                {t("pvsr_recording")}
              </span>
            )}
            {clip && !recording && (
              <button
                type="button"
                disabled={busy}
                onClick={discard}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-4 py-2 text-xs text-destructive transition hover:border-destructive/60 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("pvsr_delete")}
              </button>
            )}
          </div>

          {clip && (
            <div className="mt-4 rounded-xl border border-border/50 bg-card/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("pvsr_listen")}
              </p>
              <audio src={clip.url} controls preload="metadata" className="mt-2 w-full" />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("pvsr_duration")}: {clip.seconds}s
              </p>
              {tooLong && (
                <p className="mt-2 text-[11px] font-medium text-destructive">
                  {t("pvsr_too_long")
                    .replace("{n}", String(clip.seconds))
                    .replace("{max}", String(limit))}
                </p>
              )}

              <label className="mt-3 block text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("pvsr_name_label")}
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("pvsr_name_placeholder")}
                maxLength={60}
                className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />

              <button
                type="button"
                disabled={busy || disabled || tooLong || !isValidVoiceName(name)}
                onClick={() => void save()}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {busy ? t("pvsr_saving") : t("pvsr_save")}
              </button>
            </div>
          )}

          <p className="mt-3 text-[11px] text-muted-foreground">{t("pvsr_no_tts")}</p>
        </>
      )}
    </div>
  );
}

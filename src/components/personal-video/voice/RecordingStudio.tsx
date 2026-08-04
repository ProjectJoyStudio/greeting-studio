import { useEffect, useRef, useState } from "react";
import { FileAudio, Loader2, Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { audioDuration, fileToBase64 } from "@/lib/personal-video/voice/mixdown";
import {
  PVG_RECORDING_ACCEPT,
  PVG_RECORDING_MAX_BYTES,
  isAcceptedRecording,
} from "@/lib/personal-video/voice/speech";

export interface PendingRecording {
  base64: string;
  mimeType: string;
  extension: string;
  durationSeconds: number;
  objectUrl: string;
}

/**
 * The place where a person speaks the greeting themselves: they record it here
 * or bring a recording they already have.
 */
export function RecordingStudio({
  greeting,
  disabled,
  onReady,
}: {
  greeting: string;
  disabled?: boolean;
  onReady: (recording: PendingRecording, permissionConfirmed: boolean) => void;
}) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState(false);
  const [pending, setPending] = useState<PendingRecording | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(
    () => () => {
      if (pending) URL.revokeObjectURL(pending.objectUrl);
    },
    [pending],
  );

  async function accept(blob: Blob, mimeType: string, extension: string) {
    setBusy(true);
    try {
      const base64 = await fileToBase64(blob);
      const objectUrl = URL.createObjectURL(blob);
      const durationSeconds = await audioDuration({ base64, mimeType });
      const next = { base64, mimeType, extension, durationSeconds, objectUrl };
      setPermission(false);
      setPending((old) => {
        if (old) URL.revokeObjectURL(old.objectUrl);
        return next;
      });
    } catch {
      toast.error(t("pvv_recording_unsupported"));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const type = rec.mimeType || "audio/webm";
        void accept(
          new Blob(chunks.current, { type }),
          type,
          type.includes("ogg") ? "ogg" : "webm",
        );
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error(t("pvv_record_denied"));
    }
  }

  function stop() {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (!isAcceptedRecording(file.name, file.type)) {
      toast.error(t("pvv_recording_unsupported"));
      return;
    }
    if (file.size > PVG_RECORDING_MAX_BYTES) {
      toast.error(t("pvv_recording_too_big"));
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
    void accept(file, file.type || "audio/mpeg", extension);
  }

  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("pvv_record_title")}
      </p>

      <div className="mt-3 whitespace-pre-line rounded-2xl border border-border/50 bg-card/60 p-4 text-sm leading-relaxed">
        {greeting.trim() || t("pvv_no_greeting_text")}
      </div>
      <p className="mt-3 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
        {t("pvv_read_aloud")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => (recording ? stop() : void start())}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-warm transition disabled:opacity-60 ${
            recording
              ? "bg-destructive text-destructive-foreground"
              : "bg-gold-gradient text-primary-foreground"
          }`}
        >
          {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {recording ? t("pvv_record_stop") : pending ? t("pvv_record_again") : t("pvv_record_now")}
        </button>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50">
          <FileAudio className="h-3.5 w-3.5" />
          {pending ? t("pvv_replace_file") : t("pvv_record_upload")}
          <input
            type="file"
            accept={PVG_RECORDING_ACCEPT}
            disabled={disabled || busy}
            className="hidden"
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{t("pvv_recording_formats")}</p>

      {pending && (
        <div className="mt-4 rounded-2xl border border-border/50 bg-card/60 p-3">
          <audio src={pending.objectUrl} controls preload="metadata" className="w-full" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("pvv_recording_duration")}: {Math.round(pending.durationSeconds * 10) / 10}s
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              checked={permission}
              disabled={disabled}
              onChange={(event) => setPermission(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-[hsl(var(--primary))]"
            />
            <span>{t("pvv_permission_confirm")}</span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
          onClick={() => {
            if (!permission) {
              toast.error(t("pvv_err_permission"));
              return;
            }
            onReady(pending, true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
            >
              {t("pvv_use_recording")}
            </button>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(pending.objectUrl);
                setPending(null);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium text-destructive transition hover:border-destructive/60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("pvv_delete_recording")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

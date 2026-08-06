import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Mic, Square, Upload } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { audioDuration, fileToBase64 } from "@/lib/personal-video/voice/mixdown";
import {
  isAcceptedRecording,
  PVG_RECORDING_MAX_BYTES,
} from "@/lib/personal-video/voice/speech";
import {
  ENROLLMENT_RULE_KEYS,
  enrollmentText,
  enrollmentTexts,
} from "@/lib/personal-video/voice/enrollment";
import {
  checkVoiceSample,
  primaryIssue,
  SAMPLE_ISSUE_KEY,
} from "@/lib/personal-video/voice/quality";
import type { SampleCheck, SampleIssue } from "@/lib/personal-video/voice/quality";
import { coverageOf } from "@/lib/personal-video/voice/coverage";
import { hearVoiceSample } from "@/lib/personal-video/voice/transcribe.functions";
import {
  addVoiceSample,
  createVoiceProfile,
  previewMyVoice,
} from "@/lib/personal-video/voice/personal-voices.functions";
import type {
  PersonalVoice,
  PersonalVoiceScope,
} from "@/lib/personal-video/voice/personal-voices";

interface Sample {
  base64: string;
  mimeType: string;
  extension: string;
  durationSeconds: number;
  objectUrl: string;
  textId: "sample1" | "sample2";
}

/**
 * The wizard that turns one or two short read-aloud samples into a reusable
 * personal voice profile. The samples are only ever used to prepare the
 * profile: every greeting is spoken fresh by the finished voice.
 */
export function VoiceProfileStudio({
  language,
  projectId = null,
  allowProjectScope = false,
  updateVoice = null,
  disabled,
  onSaved,
}: {
  language: string;
  projectId?: string | null;
  allowProjectScope?: boolean;
  /** When set, the wizard adds one more sample to an existing profile. */
  updateVoice?: PersonalVoice | null;
  disabled?: boolean;
  onSaved?: (voice: PersonalVoice) => void;
}) {
  const { t } = useI18n();
  const createProfile = useServerFn(createVoiceProfile);
  const addSample = useServerFn(addVoiceSample);
  const speakPreview = useServerFn(previewMyVoice);
  const listen = useServerFn(hearVoiceSample);

  const textId: "sample1" | "sample2" = updateVoice ? "sample2" : "sample1";
  const prompt = enrollmentText(language, textId);
  const secondPrompt = enrollmentTexts(language)[1]!;

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sample, setSample] = useState<Sample | null>(null);
  const [check, setCheck] = useState<SampleCheck | null>(null);
  /** The one problem worth telling the person about, if there is one. */
  const [issue, setIssue] = useState<SampleIssue | null>(null);
  const [consent, setConsent] = useState(false);
  const [scope, setScope] = useState<PersonalVoiceScope>("library");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<PersonalVoice | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [extra, setExtra] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(
    () => () => {
      if (sample) URL.revokeObjectURL(sample.objectUrl);
    },
    [sample],
  );

  const activePrompt = extra ? secondPrompt : prompt;

  async function accept(blob: Blob, mimeType: string, extension: string) {
    setBusy(true);
    try {
      const base64 = await fileToBase64(blob);
      const durationSeconds = await audioDuration({ base64, mimeType });
      const objectUrl = URL.createObjectURL(blob);
      setSample((old) => {
        if (old) URL.revokeObjectURL(old.objectUrl);
        return {
          base64,
          mimeType,
          extension,
          durationSeconds,
          objectUrl,
          textId: extra ? "sample2" : textId,
        };
      });
      const result = await checkVoiceSample({
        base64,
        mimeType,
        expectedWords: activePrompt.words,
      }).catch(() => null);
      setCheck(result);

      // What was really said decides whether the sentence was read in full.
      // When listening is not possible, the recording is simply accepted.
      const found = [...(result?.issues ?? [])];
      const heard = await listen({
        data: { base64, mimeType, language },
      }).catch(() => ({ text: null as string | null }));
      if (heard.text && heard.text.trim().length > 0) {
        const spoken = coverageOf(activePrompt.text, heard.text);
        if (spoken.coverage < 0.75) found.push("incomplete");
        else if (spoken.missingTail >= 2) found.push("tail_missing");
      }
      setIssue(primaryIssue(found));
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

  function clearSample() {
    setSample((old) => {
      if (old) URL.revokeObjectURL(old.objectUrl);
      return null;
    });
    setCheck(null);
    setIssue(null);
  }

  /** Prepares the profile, then lets the person hear it before keeping it. */
  async function submit() {
    if (!sample) return;
    if (!updateVoice && !consent) {
      toast.error(t("mv_consent_required"));
      return;
    }
    if (!updateVoice && name.trim().length < 2) {
      toast.error(t("mv_name_required"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        base64: sample.base64,
        mimeType: sample.mimeType,
        extension: sample.extension,
        durationSeconds: sample.durationSeconds,
        textId: sample.textId,
      };
      const target = updateVoice ?? profile;
      const res = target
        ? await addSample({ data: { voiceId: target.id, sample: payload } })
        : await createProfile({
            data: {
              projectId: scope === "project" ? projectId : null,
              scope,
              displayName: name.trim(),
              language,
              consentConfirmed: consent,
              samples: [payload],
            },
          });
      setProfile(res.voice);
      setPreviewSrc(res.voice.previewUrl);
      clearSample();
      setExtra(false);
      toast.success(t("mv_profile_saved"));
      onSaved?.(res.voice);
    } catch {
      toast.error(t("mv_profile_failed"));
    } finally {
      setSaving(false);
    }
  }

  async function playTest() {
    const target = profile ?? updateVoice;
    if (!target) return;
    setPreviewing(true);
    try {
      const res = await speakPreview({ data: { voiceId: target.id } });
      setPreviewSrc(`data:${res.mimeType};base64,${res.audioBase64}`);
    } catch {
      toast.error(t("mv_preview_failed"));
    } finally {
      setPreviewing(false);
    }
  }

  const ready = profile ?? updateVoice;

  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {updateVoice ? t("mv_update_voice") : t("mv_wizard_title")}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {t("mv_wizard_intro")}
      </p>

      {/* What makes a good sample ------------------------------------- */}
      <div className="mt-4 rounded-2xl border border-border/50 bg-card/60 p-4">
        <p className="text-xs font-semibold">{t("mv_instructions_title")}</p>
        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          {ENROLLMENT_RULE_KEYS.map((key) => (
            <li key={key}>• {t(key)}</li>
          ))}
        </ul>
      </div>

      {/* The text to read aloud --------------------------------------- */}
      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t("mv_read_text")}
      </p>
      <div className="mt-2 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed">
        {activePrompt.text}
      </div>

      {/* Record or upload --------------------------------------------- */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || busy || saving}
          onClick={() => (recording ? stop() : void start())}
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
        >
          {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {recording ? t("mv_stop") : t("mv_record")}
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50">
          <Upload className="h-3.5 w-3.5" />
          {t("mv_upload")}
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={disabled || busy || saving}
            onChange={(event) => pick(event.target.files?.[0])}
          />
        </label>
        {busy && (
          <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("mv_checking")}
          </span>
        )}
      </div>

      {/* Listen before anything is prepared --------------------------- */}
      {sample && (
        <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4">
          <p className="text-xs font-semibold">{t("mv_step_preview")}</p>
          <audio
            src={sample.objectUrl}
            controls
            className="mt-2 w-full"
            aria-label={t("mv_step_preview")}
          />
          {check && !issue && <p className="mt-2 text-[11px] text-primary">{t("mv_check_ok")}</p>}
          {issue && (
            <div className="mt-2 space-y-1">
              {/* Only the real reason is ever shown, never a second guess. */}
              <p className="text-[11px] text-destructive">{t(SAMPLE_ISSUE_KEY[issue])}</p>
              <p className="text-[11px] text-muted-foreground">{t("mv_issue_retry")}</p>
            </div>
          )}

          {!updateVoice && !profile && (
            <>
              <label className="mt-4 block text-[11px] font-medium text-muted-foreground">
                {t("mv_name_label")}
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("mv_name_placeholder")}
                className="mt-1 w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />

              {allowProjectScope && projectId && (
                <div className="mt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("mv_scope_title")}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(["library", "project"] as PersonalVoiceScope[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setScope(option)}
                        className={`rounded-2xl border px-3 py-2 text-left text-[11px] transition ${
                          scope === option
                            ? "border-primary bg-primary/10"
                            : "border-border/60 hover:border-primary/40"
                        }`}
                      >
                        <span className="block font-semibold">
                          {t(option === "project" ? "mv_scope_project" : "mv_scope_library")}
                        </span>
                        <span className="mt-0.5 block text-muted-foreground">
                          {t(
                            option === "project"
                              ? "mv_scope_project_note"
                              : "mv_scope_library_note",
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5"
                />
                {t("mv_consent")}
              </label>
            </>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {saving ? t("mv_creating") : t("mv_continue")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={clearSample}
              className="rounded-full border border-border/60 px-4 py-2 text-xs font-medium disabled:opacity-60"
            >
              {t("mv_record_again")}
            </button>
          </div>
        </div>
      )}

      {/* The finished voice speaking a fresh test phrase --------------- */}
      {ready && !sample && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-semibold">{t("mv_test_title")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("mv_test_note")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("mv_samples")}: {ready.sampleCount} · {t("mv_language")}:{" "}
            {ready.language.toUpperCase()}
          </p>
          {previewSrc ? (
            <audio
              src={previewSrc}
              controls
              className="mt-2 w-full"
              aria-label={`${t("mv_preview")}: ${ready.displayName}`}
            />
          ) : (
            <button
              type="button"
              disabled={previewing}
              onClick={() => void playTest()}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium disabled:opacity-60"
            >
              {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {previewing ? t("mv_preview_generating") : t("mv_preview")}
            </button>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{t("mv_add_sample_note")}</p>
          <button
            type="button"
            onClick={() => setExtra(true)}
            className="mt-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50"
          >
            {t("mv_add_sample")}
          </button>
        </div>
      )}
    </div>
  );
}
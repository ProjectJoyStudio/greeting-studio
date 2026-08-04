import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Headphones,
  Loader2,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  assignPvgPersonVoice,
  generatePvgVoiceover,
  getPvgVoiceover,
  previewPvgVoice,
} from "@/lib/personal-video/voice.functions";
import type { PvgVoiceover } from "@/lib/personal-video/voice/catalog";
import type { PvgPerson } from "@/lib/personal-video/types";
import { listStudioVoices } from "@/lib/voice-library/library.functions";
import {
  previewFor,
  voiceCategory,
  type LibraryVoice,
  type VoiceCategory,
} from "@/lib/voice-library/types";

type VoiceMode = "library" | "own";

const CATEGORIES: VoiceCategory[] = ["female", "male", "children"];

const CATEGORY_KEY: Record<VoiceCategory, string> = {
  female: "pvv_cat_female",
  male: "pvv_cat_male",
  children: "pvv_cat_children",
};

/**
 * The voices of one order. A person chooses a Project Joy voice and gives it to
 * the participants of the greeting; the exact voice is always stored with them.
 */
export function VoicePanel({
  projectId,
  people,
  greeting,
  language,
  disabled,
  onAssigned,
}: {
  projectId: string;
  people: PvgPerson[];
  greeting: string;
  language: string;
  disabled?: boolean;
  onAssigned?: () => void;
}) {
  const { t } = useI18n();
  const load = useServerFn(getPvgVoiceover);
  const create = useServerFn(generatePvgVoiceover);
  const preview = useServerFn(previewPvgVoice);
  const assign = useServerFn(assignPvgPersonVoice);
  const loadVoices = useServerFn(listStudioVoices);

  const library = useQuery({
    queryKey: ["voice-library", "active"],
    queryFn: () => loadVoices({ data: undefined }),
  });

  const [mode, setMode] = useState<VoiceMode | null>(null);
  const [category, setCategory] = useState<VoiceCategory | null>(null);
  const [pending, setPending] = useState<LibraryVoice | null>(null);
  const [voiceover, setVoiceover] = useState<PvgVoiceover | null>(null);
  const [busy, setBusy] = useState(false);
  const [samplingId, setSamplingId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, { id: string; name: string }>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sampleRef = useRef<HTMLAudioElement | null>(null);
  const running = useRef(false);

  const voices = useMemo(() => library.data?.voices ?? [], [library.data]);
  const byCategory = useMemo(
    () => voices.filter((v) => (category ? voiceCategory(v) === category : false)),
    [voices, category],
  );

  // The participants come straight from the first page, in their own order.
  const participants = useMemo(
    () => [...people].sort((a, b) => a.position - b.position).slice(0, 5),
    [people],
  );

  useEffect(() => {
    const next: Record<string, { id: string; name: string }> = {};
    for (const person of participants) {
      if (person.voiceId) next[person.id] = { id: person.voiceId, name: person.voiceName ?? person.voiceId };
    }
    setAssignments(next);
  }, [participants]);

  const primary = participants[0] ? assignments[participants[0].id] : undefined;

  const saved = useQuery({
    queryKey: ["pvg", "voice", projectId],
    queryFn: () => load({ data: { projectId } }),
  });

  useEffect(() => {
    const found = saved.data?.voiceover ?? null;
    if (found) setVoiceover(found);
  }, [saved.data]);

  const voiceChanged = Boolean(voiceover && primary && voiceover.voiceId !== primary.id);
  const textChanged = Boolean(voiceover && voiceover.greetingText.trim() !== greeting.trim());
  const outdated = voiceChanged || textChanged;

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

  function participantLabel(person: PvgPerson, index: number): string {
    return person.name.trim() || `${t("pvv_participant")} ${index + 1}`;
  }

  /** Listening always uses the sample stored inside Project Joy. */
  async function playSample(voice: { id: string; previewUrl: string | null }) {
    if (samplingId) return;
    setSamplingId(voice.id);
    try {
      audioRef.current?.pause();
      sampleRef.current?.pause();
      let src = voice.previewUrl;
      if (!src) {
        const res = await preview({ data: { voiceId: voice.id, language } });
        src = `data:${res.mimeType};base64,${res.audioBase64}`;
      }
      const audio = new Audio(src);
      sampleRef.current = audio;
      await audio.play();
    } catch {
      toast.error(t("pvv_preview_failed"));
    } finally {
      setSamplingId(null);
    }
  }

  function sampleOf(voice: LibraryVoice): { id: string; previewUrl: string | null } {
    return { id: voice.externalVoiceId, previewUrl: previewFor(voice, language)?.audioUrl ?? null };
  }

  async function give(person: PvgPerson, voice: LibraryVoice) {
    const name = voice.displayName || voice.name;
    setAssignments((prev) => ({ ...prev, [person.id]: { id: voice.externalVoiceId, name } }));
    setPending(null);
    try {
      await assign({
        data: {
          projectId,
          personId: person.id,
          voiceId: voice.externalVoiceId,
          voiceName: name,
          provider: voice.provider,
        },
      });
      toast.success(t("pvv_assigned_toast"));
      onAssigned?.();
    } catch {
      toast.error(t("pvv_failed"));
    }
  }

  async function take(person: PvgPerson) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[person.id];
      return next;
    });
    try {
      await assign({ data: { projectId, personId: person.id, voiceId: null } });
      onAssigned?.();
    } catch {
      toast.error(t("pvv_failed"));
    }
  }

  function choose(voice: LibraryVoice) {
    if (disabled) return;
    const only = participants[0];
    if (participants.length === 1 && only) {
      void give(only, voice);
      return;
    }
    setPending(voice);
  }

  async function generate() {
    if (running.current || busy || disabled) return;
    if (!primary) {
      toast.error(t("pvv_need_voice"));
      return;
    }
    if (greeting.trim().length < 2) {
      toast.error(t("pvv_need_text"));
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      const res = await create({
        data: { projectId, text: greeting, voiceId: primary.id, language },
      });
      audioRef.current?.pause();
      setPlaying(false);
      setVoiceover(res.voiceover);
      toast.success(t("pvv_success"));
    } catch {
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

      {/* The two ways a greeting can be spoken --------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode(mode === "library" ? null : "library")}
          className={`rounded-2xl border px-4 py-4 text-left transition disabled:opacity-60 ${
            mode === "library" ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("pvv_option_library")}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t("pvv_option_library_note")}
          </span>
        </button>

        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-4 opacity-70">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Mic className="h-4 w-4 text-primary" />
            {t("pvv_option_own")}
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              {t("pvv_soon")}
            </span>
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">{t("pvv_option_own_note")}</span>
        </div>
      </div>

      {/* Female · Male · Children ---------------------------------------- */}
      {mode === "library" && (
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("pvv_choose_category")}
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? null : c)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                  category === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                {t(CATEGORY_KEY[c])}
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {voices.filter((v) => voiceCategory(v) === c).length}
                </span>
              </button>
            ))}
          </div>

          {category && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {library.isLoading && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("pvv_preview_working")}
                </p>
              )}
              {!library.isLoading && byCategory.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("pvv_no_voices")}</p>
              )}
              {byCategory.map((voice) => (
                <div
                  key={voice.id}
                  className="rounded-2xl border border-border/60 bg-background/60 p-3"
                >
                  <p className="text-sm font-medium">{voice.name}</p>
                  {voice.description && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {voice.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void playSample(sampleOf(voice))}
                      disabled={samplingId !== null}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/50 disabled:opacity-60"
                    >
                      {samplingId === voice.externalVoiceId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Headphones className="h-3 w-3" />
                      )}
                      {t("pvv_preview")}
                    </button>
                    <button
                      type="button"
                      onClick={() => choose(voice)}
                      disabled={disabled}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gold-gradient px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
                    >
                      <Check className="h-3 w-3" />
                      {t("pvv_select")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{t("pvv_preview_stored")}</p>
        </div>
      )}

      {/* Who should this voice be assigned to? --------------------------- */}
      {pending && (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              {t("pvv_assign_title")}
            </p>
            <button
              type="button"
              onClick={() => setPending(null)}
              aria-label={t("pvv_cancel")}
              className="rounded-full p-1 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {pending.displayName || pending.name}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {participants.map((person, index) => (
              <button
                key={person.id}
                type="button"
                onClick={() => void give(person, pending)}
                className="rounded-2xl border border-border/60 bg-background/70 px-4 py-2.5 text-left text-sm font-medium transition hover:border-primary/50"
              >
                {participantLabel(person, index)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected voices -------------------------------------------------- */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("pvv_selected_voices")}
        </p>
        <ul className="mt-3 space-y-2">
          {participants.map((person, index) => {
            const chosen = assignments[person.id];
            return (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 px-3 py-2"
              >
                <span className="text-sm">
                  <span className="font-medium">{participantLabel(person, index)}</span>
                  <span className="text-muted-foreground"> — </span>
                  <span className={chosen ? "font-medium text-primary" : "text-muted-foreground"}>
                    {chosen ? chosen.name : t("pvv_no_voice")}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {chosen && (
                    <button
                      type="button"
                      onClick={() => {
                        const found = voices.find((v) => v.externalVoiceId === chosen.id);
                        void playSample(
                          found ? sampleOf(found) : { id: chosen.id, previewUrl: null },
                        );
                      }}
                      disabled={samplingId !== null}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-[11px] transition hover:border-primary/50 disabled:opacity-60"
                    >
                      {samplingId === chosen.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Headphones className="h-3 w-3" />
                      )}
                      {t("pvv_preview")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setMode("library");
                      if (!category) setCategory("female");
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-[11px] transition hover:border-primary/50 disabled:opacity-60"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {chosen ? t("pvv_replace") : t("pvv_select")}
                  </button>
                  {chosen && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void take(person)}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-[11px] text-destructive transition hover:border-destructive/60 disabled:opacity-60"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t("pvv_remove")}
                    </button>
                  )}
                </span>
              </li>
            );
          })}
          {participants.length === 0 && (
            <li className="text-xs text-muted-foreground">{t("pvv_no_participants")}</li>
          )}
        </ul>
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
          disabled={busy || disabled || !primary}
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

      <p className="mt-3 text-[11px] text-muted-foreground">{t("pvv_free_note")}</p>
    </div>
  );
}

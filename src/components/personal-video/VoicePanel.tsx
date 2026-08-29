import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  assignPvgPersonVoice,
  generatePvgVoiceover,
  getPvgVoiceover,
  previewPvgVoice,
  savePvgPersonVoiceChoice,
  savePvgSpeechSettings,
} from "@/lib/personal-video/voice.functions";
import type { PvgVoiceover } from "@/lib/personal-video/voice/catalog";
import type { PvgPerson } from "@/lib/personal-video/types";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { validateVoiceSetup, voiceIssueText } from "@/lib/personal-video/voice/recordings";
import { voiceFailureKey, voiceFailureOf } from "@/lib/personal-video/voice/errors";
import {
  isPlayablePvgVoiceover,
  pvgVoiceQueryKey,
} from "@/lib/personal-video/voice/voice-asset";
import { ensureVoicePreview, listStudioVoices } from "@/lib/voice-library/library.functions";
import {
  previewFor,
  voiceCategory,
  type LibraryVoice,
  type VoiceCategory,
} from "@/lib/voice-library/types";
import {
  assignPersonalVoice,
  listProjectPersonalVoices,
} from "@/lib/personal-video/voice/personal-voices.functions";
import { VoiceProfileStudio } from "./voice/VoiceProfileStudio";
import {
  SELF_RECORDING_PROVIDER,
  SelfRecordingPanel,
} from "./voice/SelfRecordingPanel";
import {
  PERSONAL_VOICE_STYLES,
  personalVoiceRef,
} from "@/lib/personal-video/voice/personal-voices";

type VoiceMode = "library" | "mine" | "add" | "self";

const CATEGORIES: VoiceCategory[] = ["female", "male", "children"];

const CATEGORY_KEY: Record<VoiceCategory, string> = {
  female: "pvv_cat_female",
  male: "pvv_cat_male",
  children: "pvv_cat_children",
};

interface Assignment {
  id: string;
  name: string;
}

/** One participant's voice, wherever it comes from. */
interface ChosenVoice {
  /** The id used for speaking: a library voice id or `personal:<uuid>`. */
  speakId: string;
  /** The plain id of the voice itself. */
  id: string;
  name: string;
  personal: boolean;
}

/**
 * The voice of one greeting. Exactly one participant speaks the whole
 * greeting; everyone else stays in the picture and only reacts. The voice is
 * a reusable one — a Project Joy voice or a saved personal voice.
 */
export function VoicePanel({
  projectId,
  people,
  greeting,
  language,
  videoSeconds,
  disabled,
  speakerPersonId: savedSpeakerId,
  onAssigned,
}: {
  projectId: string;
  people: PvgPerson[];
  greeting: string;
  language: string;
  videoSeconds?: number;
  disabled?: boolean;
  /** The saved participant who speaks the whole greeting. */
  speakerPersonId?: string | null;
  onAssigned?: () => void;
}) {
  const { t } = useI18n();
  const load = useServerFn(getPvgVoiceover);
  const create = useServerFn(generatePvgVoiceover);
  const preview = useServerFn(previewPvgVoice);
  const ensurePreview = useServerFn(ensureVoicePreview);
  const assign = useServerFn(assignPvgPersonVoice);
  const saveChoice = useServerFn(savePvgPersonVoiceChoice);
  const loadVoices = useServerFn(listStudioVoices);
  const saveSpeech = useServerFn(savePvgSpeechSettings);
  const applyPersonalVoice = useServerFn(assignPersonalVoice);
  const loadPersonalVoices = useServerFn(listProjectPersonalVoices);

  /** The person's own voices: saved permanently or kept in this project. */
  const personalVoices = useQuery({
    queryKey: ["pvg", "personal-voices", projectId],
    queryFn: () => loadPersonalVoices({ data: { projectId } }),
  });

  const library = useQuery({
    queryKey: ["voice-library", "active"],
    queryFn: () => loadVoices({ data: undefined }),
  });

  const [mode, setMode] = useState<VoiceMode | null>(null);
  /**
   * The single participant who speaks. This is the only place the speaker is
   * kept, and it is saved with the draft.
   */
  const [speakerId, setSpeakerId] = useState<string | null>(savedSpeakerId ?? null);
  const [category, setCategory] = useState<VoiceCategory | null>(null);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  /** The participant whose library is being opened right now (button feedback). */
  const [openingFor, setOpeningFor] = useState<string | null>(null);
  /** Short golden glow on the library header right after it opens. */
  const [libraryGlow, setLibraryGlow] = useState(false);
  /** Short glow on the participant card that just received a new voice. */
  const [cardGlow, setCardGlow] = useState<string | null>(null);
  /** The message that stays on screen after a replacement, good or bad. */
  const [replaceNotice, setReplaceNotice] = useState<{
    kind: "done" | "error";
    text: string;
  } | null>(null);
  /** The speaking style chosen for one participant, for this greeting only. */
  const [styles, setStyles] = useState<Record<string, string>>({});
  /** The style the next personal voice is given when it is assigned. */
  const [pendingStyle, setPendingStyle] = useState<string>("natural");
  const [voiceover, setVoiceover] = useState<PvgVoiceover | null>(null);
  const [busy, setBusy] = useState(false);
  const [samplingId, setSamplingId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  /** The voice from "My voices" one participant speaks with, when they have one. */
  const [personalAssigned, setPersonalAssigned] = useState<Record<string, Assignment>>({});
  /** The voice group every participant belongs to: female, male or children. */
  const [categories, setCategories] = useState<Record<string, VoiceCategory>>({});
  /** Voices the person has listened to and kept. Nothing else may be used. */
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [issues, setIssues] = useState<{ key: string; name?: string }[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sampleRef = useRef<HTMLAudioElement | null>(null);
  const libraryRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});
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
    const nextVoices: Record<string, Assignment> = {};
    const nextPersonal: Record<string, Assignment> = {};
    const nextCategories: Record<string, VoiceCategory> = {};
    const nextConfirmed: Record<string, boolean> = {};
    for (const person of participants) {
      if (person.voiceId)
        nextVoices[person.id] = { id: person.voiceId, name: person.voiceName ?? person.voiceId };
      if (person.personalVoiceId)
        nextPersonal[person.id] = {
          id: person.personalVoiceId,
          name: person.voiceName ?? person.personalVoiceId,
        };
      if (person.voiceCategory) nextCategories[person.id] = person.voiceCategory;
      nextConfirmed[person.id] = Boolean(person.voiceConfirmed);
    }
    setAssignments(nextVoices);
    setPersonalAssigned(nextPersonal);
    setCategories((old) => ({ ...nextCategories, ...old }));
    setConfirmed((old) => ({ ...nextConfirmed, ...old }));
  }, [participants]);

  /**
   * Exactly one speaker: the participant the person picked. With a single
   * participant in the scene that is always them.
   */
  const speaker =
    participants.find((p) => p.id === speakerId) ??
    (participants.length === 1 ? (participants[0] ?? null) : null);

  /**
   * No person was specially added: the greeting is a voice-over over the
   * scene. The single invisible carrier still holds the chosen voice.
   */
  const voiceOverOnly =
    participants.length === 1 && (participants[0]?.role ?? "speaker") === "narrator";

  const saved = useQuery({
    queryKey: pvgVoiceQueryKey(projectId),
    queryFn: () => load({ data: { projectId } }),
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const found = saved.data?.voiceover ?? null;
    if (found) setVoiceover(found);
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

  const persistSpeech = useCallback(
    (next: { speakerPersonId?: string | null }) => {
      void saveSpeech({
        data: {
          projectId,
          speechMode: "single" as const,
          syncMode: "simultaneous" as const,
          chorusVoiceIds: [],
          speakerPersonId: next.speakerPersonId !== undefined ? next.speakerPersonId : speakerId,
        },
      }).catch(() => undefined);
    },
    [saveSpeech, projectId, speakerId],
  );

  function participantLabel(person: PvgPerson, index: number): string {
    return person.name.trim() || `${t("pvv_participant")} ${index + 1}`;
  }

  /**
   * The voice group of one participant. When it was never chosen, the group of
   * the voice they already speak with is kept — never a group of another kind.
   */
  function categoryOf(person: PvgPerson): VoiceCategory | null {
    const stored = categories[person.id];
    if (stored) return stored;
    const current = assignments[person.id];
    const voice = current ? voices.find((v) => v.externalVoiceId === current.id) : undefined;
    return voice ? voiceCategory(voice) : null;
  }

  /** The group a participant is put in. Only the person ever changes it. */
  function setPersonCategory(person: PvgPerson, next: VoiceCategory) {
    setCategories((prev) => ({ ...prev, [person.id]: next }));
    void saveChoice({ data: { projectId, personId: person.id, category: next } }).catch(
      () => undefined,
    );
    // A voice from another group may never stay: it has to be chosen again.
    const current = assignments[person.id];
    const voice = current ? voices.find((v) => v.externalVoiceId === current.id) : undefined;
    if (voice && voiceCategory(voice) !== next) {
      setConfirmed((prev) => ({ ...prev, [person.id]: false }));
      void saveChoice({ data: { projectId, personId: person.id, confirmed: false } }).catch(
        () => undefined,
      );
    }
  }

  /** The person listened to the suggested voice and keeps it. */
  function confirmVoice(person: PvgPerson) {
    setConfirmed((prev) => ({ ...prev, [person.id]: true }));
    void saveChoice({ data: { projectId, personId: person.id, confirmed: true } }).catch(
      () => undefined,
    );
    toast.success(t("pvv_confirmed_toast"));
  }

  /** Opens the voice library already filtered to this participant's group. */
  function openReplace(person: PvgPerson) {
    if (openingFor) return;
    setOpeningFor(person.id);
    setReplaceNotice(null);
    setReplaceFor(person.id);
    setMode("library");
    setCategory(categoryOf(person) ?? "female");
    // The library is brought into view by itself, so nobody has to look for it.
    window.setTimeout(() => {
      libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpeningFor(null);
      setLibraryGlow(true);
      window.setTimeout(() => setLibraryGlow(false), 1800);
    }, 220);
  }

  /** Brings one participant card back into view and marks it for a moment. */
  function returnToCard(personId: string) {
    window.setTimeout(() => {
      cardRefs.current[personId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setCardGlow(personId);
      window.setTimeout(() => setCardGlow((id) => (id === personId ? null : id)), 2200);
    }, 120);
  }

  /** The one participant chosen to speak everything keeps their choice. */
  function selectSpeaker(person: PvgPerson) {
    if (disabled) return;
    setSpeakerId(person.id);
    persistSpeech({ speakerPersonId: person.id });
  }

  /**
   * The one voice a participant speaks with, wherever it comes from. A voice
   * from "My voices" counts exactly like a Project Joy voice.
   */
  const chosenFor = useCallback(
    (person: PvgPerson): ChosenVoice | null => {
      const personal = personalAssigned[person.id];
      if (personal) {
        const found = (personalVoices.data?.voices ?? []).find((v) => v.id === personal.id);
        return {
          speakId: personalVoiceRef(personal.id),
          id: personal.id,
          name: found?.displayName ?? personal.name,
          personal: true,
        };
      }
      const library = assignments[person.id];
      if (library) {
        return { speakId: library.id, id: library.id, name: library.name, personal: false };
      }
      return null;
    },
    [assignments, personalAssigned, personalVoices.data],
  );

  /** The voice the single speaker uses, wherever it comes from. */
  const speakerVoice = speaker ? chosenFor(speaker) : null;

  /** The speaker still has to listen to a suggested voice and keep it. */
  const needsConfirmation = Boolean(speaker && speakerVoice && !confirmed[speaker.id]);

  /**
   * The voice id the saved recording carries. A personal voice is stored under
   * the id it has at the studio, so it is compared against that id and never
   * against the profile id shown on screen.
   */
  const speakerStoredVoiceId = speakerVoice
    ? speakerVoice.personal
      ? ((personalVoices.data?.voices ?? []).find((v) => v.id === speakerVoice.id)
          ?.providerVoiceId ?? null)
      : speakerVoice.id
    : null;

  /** The saved greeting is the customer's own recording, not a spoken voice. */
  const selfRecorded = voiceover?.provider === SELF_RECORDING_PROVIDER;

  const voiceChanged = Boolean(
    !selfRecorded &&
      voiceover &&
      speakerVoice &&
      speakerStoredVoiceId &&
      voiceover.voiceId !== speakerStoredVoiceId,
  );
  const textChanged = Boolean(voiceover && voiceover.greetingText.trim() !== greeting.trim());
  const outdated = voiceChanged || textChanged;

  /** Listening always uses the sample stored inside Project Joy. */
  async function playSample(voice: { id: string; previewUrl: string | null }) {
    if (samplingId) return;
    setSamplingId(voice.id);
    try {
      audioRef.current?.pause();
      sampleRef.current?.pause();
      let src = voice.previewUrl;
      if (!src) {
        // The sample of this exact language is missing or damaged: Project Joy
        // prepares it again and keeps it, so it is instant from now on.
        const stored = await ensurePreview({ data: { voiceId: voice.id, language } }).catch(() => ({
          url: null as string | null,
        }));
        src = stored.url;
        if (!src) {
          const res = await preview({ data: { voiceId: voice.id, language } });
          src = `data:${res.mimeType};base64,${res.audioBase64}`;
        }
        void library.refetch();
      }
      const audio = new Audio(src);
      sampleRef.current = audio;
      await audio.play();
    } catch (error) {
      toast.error(
        t(voiceFailureOf(error) === "voice_failed" ? "pvv_preview_failed" : voiceFailureKey(error)),
      );
    } finally {
      setSamplingId(null);
    }
  }

  function sampleOf(voice: LibraryVoice): { id: string; previewUrl: string | null } {
    return { id: voice.externalVoiceId, previewUrl: previewFor(voice, language)?.audioUrl ?? null };
  }

  async function give(person: PvgPerson, voice: LibraryVoice, viaReplace = false) {
    const name = voice.displayName || voice.name;
    const group = voiceCategory(voice);
    const index = participants.findIndex((p) => p.id === person.id);
    const label = participantLabel(person, index < 0 ? 0 : index);
    const previous = assignments[person.id] ?? null;
    setAssignments((prev) => ({ ...prev, [person.id]: { id: voice.externalVoiceId, name } }));
    // A Project Joy voice always replaces a personal one, never both at once.
    setPersonalAssigned((prev) => {
      const next = { ...prev };
      delete next[person.id];
      return next;
    });
    setCategories((prev) => ({ ...prev, [person.id]: group }));
    // A replaced voice always waits to be listened to and kept again.
    setConfirmed((prev) => ({ ...prev, [person.id]: !viaReplace }));
    try {
      await assign({
        data: {
          projectId,
          personId: person.id,
          voiceId: voice.externalVoiceId,
          voiceName: name,
          provider: voice.provider,
          category: group,
          confirmed: !viaReplace,
        },
      });
      setReplaceFor(null);
      if (viaReplace) {
        setMode(null);
        setReplaceNotice({
          kind: "done",
          text: t("pvv_replaced_notice").replace("{name}", label).replace("{voice}", name),
        });
        returnToCard(person.id);
      } else {
        toast.success(t("pvv_assigned_toast"));
      }
      onAssigned?.();
    } catch (e) {
      // Nothing is lost: the library stays open and the old voice is kept.
      setAssignments((prev) => {
        const next = { ...prev };
        if (previous) next[person.id] = previous;
        else delete next[person.id];
        return next;
      });
      const reason = e instanceof Error && e.message ? e.message : t("pvv_failed");
      if (viaReplace) {
        setReplaceNotice({
          kind: "error",
          text: t("pvv_replace_failed").replace("{reason}", reason),
        });
      } else {
        toast.error(t("pvv_failed"));
      }
    }
  }

  async function take(person: PvgPerson) {
    const wasPersonal = Boolean(personalAssigned[person.id]);
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[person.id];
      return next;
    });
    setPersonalAssigned((prev) => {
      const next = { ...prev };
      delete next[person.id];
      return next;
    });
    setConfirmed((prev) => ({ ...prev, [person.id]: false }));
    try {
      // The saved voice profile itself always stays in "My voices": only the
      // link to this participant is removed.
      if (wasPersonal) {
        await applyPersonalVoice({ data: { projectId, personId: person.id, voiceId: null } });
      } else {
        await assign({ data: { projectId, personId: person.id, voiceId: null } });
      }
      onAssigned?.();
    } catch {
      toast.error(t("pvv_failed"));
    }
  }

  /** A chosen voice always belongs to the one participant who speaks. */
  function choose(voice: LibraryVoice) {
    if (disabled) return;
    if (replaceFor) {
      const person = participants.find((p) => p.id === replaceFor);
      if (person) {
        void give(person, voice, true);
        return;
      }
      setReplaceFor(null);
    }
    if (speaker) void give(speaker, voice);
    else toast.error(t("pvv_err_no_speaker"));
  }

  /** Gives one participant a voice from "My voices". */
  async function givePersonal(
    person: PvgPerson,
    voice: { id: string; name: string },
    viaReplace = false,
  ) {
    const index = participants.findIndex((p) => p.id === person.id);
    const label = participantLabel(person, index < 0 ? 0 : index);
    try {
      await applyPersonalVoice({
        data: {
          projectId,
          personId: person.id,
          voiceId: voice.id,
          voiceName: voice.name,
          style: styles[person.id] ?? pendingStyle,
        },
      });
      setStyles((prev) => ({ ...prev, [person.id]: prev[person.id] ?? pendingStyle }));
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[person.id];
        return next;
      });
      setPersonalAssigned((prev) => ({ ...prev, [person.id]: voice }));
      // A personal voice is kept exactly like a Project Joy voice: it is
      // listened to first and only then confirmed.
      setConfirmed((prev) => ({ ...prev, [person.id]: false }));
      void saveChoice({ data: { projectId, personId: person.id, confirmed: false } }).catch(
        () => undefined,
      );
      setReplaceFor(null);
      if (viaReplace) {
        setMode(null);
        setReplaceNotice({
          kind: "done",
          text: t("pvv_replaced_notice").replace("{name}", label).replace("{voice}", voice.name),
        });
        returnToCard(person.id);
      } else {
        toast.success(t("mv_assigned"));
      }
      onAssigned?.();
    } catch {
      toast.error(t("pvv_failed"));
    }
  }

  /** A saved personal voice always goes to the one participant who speaks. */
  function pickPersonal(voice: { id: string; name: string }) {
    if (disabled) return;
    if (replaceFor) {
      const person = participants.find((p) => p.id === replaceFor);
      if (person) {
        void givePersonal(person, voice, true);
        return;
      }
      setReplaceFor(null);
    }
    if (speaker) void givePersonal(speaker, voice);
    else toast.error(t("pvv_err_no_speaker"));
  }

  async function generate() {
    if (running.current || busy || disabled) return;
    // A voice Project Joy suggested is never used before the person has
    // listened to it and kept it.
    if (speaker && needsConfirmation) {
      const waiting = [
        {
          key: "pvv_err_confirm_for",
          name: participantLabel(speaker, participants.indexOf(speaker)),
        },
      ];
      setIssues(waiting);
      toast.error(voiceIssueText(waiting[0]!, t));
      return;
    }
    const found = validateVoiceSetup({
      speechMode: "single",
      greeting,
      videoSeconds: videoSeconds ?? 0,
      chorusVoiceCount: 0,
      speakerId: speaker?.id ?? null,
      participants: participants.map((person, index) => ({
        id: person.id,
        label: participantLabel(person, index),
        voiceId: chosenFor(person)?.speakId ?? null,
        partText: "",
        personalVoiceId: personalAssigned[person.id]?.id ?? null,
      })),
    });
    setIssues(found);
    const first = found[0];
    if (first) {
      toast.error(voiceIssueText(first, t));
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      if (!speaker || !speakerVoice) {
        toast.error(t("pvv_need_voice"));
        return;
      }
      const text = greeting.trim();
      if (!text) {
        toast.error(t("pvv_err_no_greeting"));
        return;
      }
      const res = await create({
        data: { projectId, text, voiceId: speakerVoice.speakId, language },
      });
      // A greeting counts as spoken only when a real, playable recording came
      // back. Anything else is a failure, never a success.
      const made = res.voiceover;
      if (!isPlayablePvgVoiceover(made)) {
        throw new Error("voice_empty_response");
      }
      audioRef.current?.pause();
      setPlaying(false);
      setVoiceover(made);
      // The sound page reads the same saved greeting: it must learn about the
      // fresh recording at once, otherwise its check plays music only.
      queryClient.setQueryData(pvgVoiceQueryKey(projectId), { voiceover: made });
      toast.success(t("pvv_success"));
    } catch (error) {
      toast.error(t(voiceFailureKey(error)));
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
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }

  function renderReplaceBanner() {
    if (!replaceFor) return null;
    const index = participants.findIndex((p) => p.id === replaceFor);
    const person = participants[index] ?? participants[0];
    if (!person) return null;
    const label = participantLabel(person, index < 0 ? 0 : index);
    const current = chosenFor(person);
    return (
      <div
        className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-500 ${
          libraryGlow
            ? "border-primary bg-primary/15 shadow-warm ring-2 ring-primary/40"
            : "border-primary/40 bg-primary/5"
        }`}
      >
        <span className="flex items-center gap-3">
          <ParticipantAvatar photoUrl={person.photoUrl} label={label} size="md" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-primary">
              {t("pvv_replacing_for").replace("{name}", label)}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {t("pvv_participant_n").replace("{n}", String((index < 0 ? 0 : index) + 1))}
              {" · "}
              {t("pvv_sync_current_voice")}: {current ? current.name : t("pvv_no_voice")}
            </span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            setReplaceFor(null);
            setMode(null);
            returnToCard(person.id);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/50"
        >
          <X className="h-3 w-3" />
          {t("pvv_cancel_replacement")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
      <p className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <span className="text-primary">
          <Mic className="h-4 w-4" />
        </span>
        {t("pvv_title")}
      </p>

      {/* Who speaks the greeting ------------------------------------------ */}
      {voiceOverOnly ? (
        // Nobody was specially added, so the greeting is simply heard over the
        // scene. There is no speaking character to choose.
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("pvv_voiceover")}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {t("pvv_voiceover_hint")}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("pvv_single_title")}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("pvv_single_hint")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {participants.map((person, index) => {
              const isSpeaker = speaker?.id === person.id;
              return (
                <button
                  key={person.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectSpeaker(person)}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                    isSpeaker
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <ParticipantAvatar
                    photoUrl={person.photoUrl}
                    label={participantLabel(person, index)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {participantLabel(person, index)}
                    </span>
                    <span
                      className={`block text-[11px] ${
                        isSpeaker ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {isSpeaker ? t("pvv_single_speaks") : t("pvv_single_pick")}
                    </span>
                  </span>
                  {isSpeaker && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
          {!speaker && (
            <p className="mt-3 flex items-center gap-2 text-[11px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("pvv_err_no_speaker")}
            </p>
          )}
        </div>
      )}

      {/* Where the voice comes from --------------------------------------- */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode(mode === "library" ? null : "library")}
          className={`rounded-2xl border px-4 py-4 text-left transition disabled:opacity-60 ${
            mode === "library"
              ? "border-primary bg-primary/10"
              : "border-border/60 hover:border-primary/40"
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

        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode(mode === "mine" ? null : "mine")}
          className={`rounded-2xl border px-4 py-4 text-left transition disabled:opacity-60 ${
            mode === "mine"
              ? "border-primary bg-primary/10"
              : "border-border/60 hover:border-primary/40"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Mic className="h-4 w-4 text-primary" />
            {t("mv_tab_mine")}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t("mv_scope_library_note")}
          </span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode(mode === "add" ? null : "add")}
          className={`rounded-2xl border px-4 py-4 text-left transition disabled:opacity-60 ${
            mode === "add"
              ? "border-primary bg-primary/10"
              : "border-border/60 hover:border-primary/40"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Mic className="h-4 w-4 text-primary" />
            {t("mv_tab_add")}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t("mv_only_profiles")}
          </span>
        </button>
      </div>

      {/* Female · Male · Children ---------------------------------------- */}
      {mode === "library" && (
        <div className="mt-5 scroll-mt-24" ref={libraryRef}>
          {renderReplaceBanner()}
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("pvv_choose_category")}
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => voices.some((v) => voiceCategory(v) === c))
              // While one participant's voice is replaced, only their own group
              // is shown: no unrelated voices ever appear.
              .filter((c) => {
                if (!replaceFor) return true;
                const person = participants.find((p) => p.id === replaceFor);
                const group = person ? categoryOf(person) : null;
                return !group || group === c;
              })
              .map((c) => (
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
              {byCategory.map((voice) => {
                const inUse = speakerVoice?.id === voice.externalVoiceId;
                return (
                  <div
                    key={voice.id}
                    className={`rounded-2xl border bg-background/60 p-3 ${
                      inUse ? "border-primary/60" : "border-border/60"
                    }`}
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
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{t("pvv_preview_stored")}</p>
        </div>
      )}

      {/* Add your voice --------------------------------------------------- */}
      {mode === "add" && (
        <div className="mt-5">
          {renderReplaceBanner()}
          <VoiceProfileStudio
            language={language}
            projectId={projectId}
            allowProjectScope
            disabled={disabled}
            onSaved={(voice) => {
              void personalVoices.refetch();
              // A voice created through "Replace" goes straight back to the
              // participant it was started for.
              pickPersonal({ id: voice.id, name: voice.displayName });
            }}
          />
        </div>
      )}

      {/* My voices ------------------------------------------------------- */}
      {mode === "mine" && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
          {renderReplaceBanner()}
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("mv_tab_mine")}
          </p>
          {personalVoices.isLoading && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("mv_loading")}
            </p>
          )}
          {!personalVoices.isLoading && (personalVoices.data?.voices.length ?? 0) === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">{t("mv_no_saved")}</p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(personalVoices.data?.voices ?? []).map((voice) => (
              <div key={voice.id} className="rounded-2xl border border-border/60 bg-card/60 p-3">
                <p className="text-sm font-medium">{voice.displayName}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t(voice.scope === "project" ? "mv_project_only" : "mv_from_my_voices")} ·{" "}
                  {t(`mv_status_${voice.processingStatus}`)}
                </p>
                {voice.processedUrl && (
                  <audio
                    src={voice.processedUrl}
                    controls
                    preload="none"
                    className="mt-2 w-full"
                    aria-label={`${t("mv_preview")}: ${voice.displayName}`}
                  />
                )}
                <button
                  type="button"
                  disabled={disabled || voice.processingStatus !== "ready"}
                  onClick={() => pickPersonal({ id: voice.id, name: voice.displayName })}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold-gradient px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
                >
                  <Check className="h-3 w-3" />
                  {t("pvv_select")}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("mv_style_title")}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("mv_style_note")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PERSONAL_VOICE_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setPendingStyle(style)}
                className={`rounded-full border px-3 py-1 text-[11px] transition ${
                  pendingStyle === style
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t(`mv_style_${style}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The voice of the speaker ----------------------------------------- */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("pvv_selected_voices")}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("pvv_single_hint")}</p>

        {replaceNotice && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-2xl border p-3 text-xs ${
              replaceNotice.kind === "done"
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-destructive/50 bg-destructive/10 text-destructive"
            }`}
          >
            {replaceNotice.kind === "done" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="min-w-0 flex-1">{replaceNotice.text}</span>
            <button
              type="button"
              aria-label={t("pvv_cancel")}
              onClick={() => setReplaceNotice(null)}
              className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {/* Only the one participant who speaks needs a voice. */}
          {(speaker ? [speaker] : []).map((person) => {
            const index = participants.findIndex((p) => p.id === person.id);
            const chosen = chosenFor(person);
            const group = categoryOf(person);
            const waiting = Boolean(chosen) && !confirmed[person.id];
            return (
              <li
                key={person.id}
                ref={(el) => {
                  cardRefs.current[person.id] = el;
                }}
                className={`scroll-mt-24 rounded-xl border px-3 py-2 transition-all duration-500 ${
                  cardGlow === person.id
                    ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                    : waiting
                      ? "border-destructive bg-destructive/5"
                      : "border-border/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm">
                    <ParticipantAvatar
                      photoUrl={person.photoUrl}
                      label={participantLabel(person, index)}
                    />
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
                          if (chosen.personal) {
                            const profile = (personalVoices.data?.voices ?? []).find(
                              (v) => v.id === chosen.id,
                            );
                            const url = profile?.previewUrl ?? profile?.processedUrl ?? null;
                            if (!url) {
                              toast.error(t("pvv_preview_failed"));
                              return;
                            }
                            void playSample({ id: chosen.id, previewUrl: url });
                            return;
                          }
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
                    {waiting && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => confirmVoice(person)}
                        className="inline-flex items-center gap-1 rounded-full bg-gold-gradient px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
                      >
                        <Check className="h-3 w-3" />
                        {t("pvv_confirm")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={disabled || openingFor !== null}
                      onClick={() => openReplace(person)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition hover:border-primary/50 active:scale-95 disabled:opacity-60 ${
                        openingFor === person.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60"
                      }`}
                    >
                      {openingFor === person.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      {openingFor === person.id
                        ? t("pvv_opening_library")
                        : chosen
                          ? t("pvv_replace")
                          : t("pvv_select")}
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
                </div>

                {/* The group this participant's voice always comes from */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">{t("pvv_group")}:</span>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={disabled}
                      onClick={() => setPersonCategory(person, c)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition disabled:opacity-60 ${
                        group === c
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      {t(CATEGORY_KEY[c])}
                    </button>
                  ))}
                </div>

                {waiting && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {t("pvv_confirm_needed")}
                  </p>
                )}
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

      {issues.length > 0 && (
        <ul className="mt-4 space-y-1.5 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
          {issues.map((issue, index) => (
            <li key={`${issue.key}-${index}`} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{voiceIssueText(issue, t)}</span>
            </li>
          ))}
        </ul>
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

      <p className="mt-3 text-[11px] text-muted-foreground">{t("pvv_free_note")}</p>
    </div>
  );
}

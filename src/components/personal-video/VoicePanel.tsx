import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  assignPvgPersonVoice,
  generatePvgVoiceover,
  getPvgVoiceover,
  previewPvgVoice,
  savePvgMergedVoiceover,
  savePvgPersonPart,
  savePvgPersonVoiceChoice,
  savePvgSpeechSettings,
  synthesizePvgTrack,
} from "@/lib/personal-video/voice.functions";
import type { PvgVoiceover } from "@/lib/personal-video/voice/catalog";
import type { PvgPerson } from "@/lib/personal-video/types";
import { ParticipantAvatar } from "./ParticipantAvatar";
import {
  PVG_MAX_CHORUS_VOICES,
  PVG_MIN_CHORUS_VOICES,
  PVG_MIN_PART_GAP_SECONDS,
  PVG_MAX_SPEECH_SPEED,
  estimateSpeechSeconds,
  speechBudgetSeconds,
  splitGreeting,
  wordCount,
  type PvgSpeechMode,
  type PvgSyncMode,
} from "@/lib/personal-video/voice/speech";
import { hasMeasuredPace, rememberPace, secondsPerWord } from "@/lib/personal-video/voice/rates";
import { compatibilityKey } from "@/lib/personal-video/voice/compatibility";
import { comboKey, solveGroup, type GroupMember } from "@/lib/personal-video/voice/group-solver";
import { validateVoiceSetup, voiceIssueText } from "@/lib/personal-video/voice/recordings";
import { blendTogether, mergeInOrder, type MixSource } from "@/lib/personal-video/voice/mixdown";
import { voiceFailureKey, voiceFailureOf } from "@/lib/personal-video/voice/errors";
import { ensureVoicePreview, listStudioVoices } from "@/lib/voice-library/library.functions";
import {
  previewFor,
  voiceCategory,
  type LibraryVoice,
  type VoiceCategory,
} from "@/lib/voice-library/types";
import { autoAssignVoices, recommendVoices } from "@/lib/personal-video/voice/auto-assign";
import {
  assignPersonalVoice,
  listProjectPersonalVoices,
} from "@/lib/personal-video/voice/personal-voices.functions";
import { VoiceProfileStudio } from "./voice/VoiceProfileStudio";
import {
  PERSONAL_VOICE_STYLES,
  personalVoiceRef,
} from "@/lib/personal-video/voice/personal-voices";
import type { ChorusEntry } from "@/lib/personal-video/voice/chorus";

type VoiceMode = "library" | "mine" | "add";

const CATEGORIES: VoiceCategory[] = ["female", "male", "children"];

const CATEGORY_KEY: Record<VoiceCategory, string> = {
  female: "pvv_cat_female",
  male: "pvv_cat_male",
  children: "pvv_cat_children",
};

const SPEECH_MODES: { id: PvgSpeechMode; title: string; note: string }[] = [
  { id: "single", title: "pvv_mode_single", note: "pvv_mode_single_note" },
  { id: "parts", title: "pvv_mode_parts", note: "pvv_mode_parts_note" },
  { id: "chorus", title: "pvv_mode_chorus", note: "pvv_mode_chorus_note" },
];

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
 * The voices of one order: who speaks and how they speak together. Every
 * voice is a reusable one — a Project Joy voice or a saved personal voice.
 */
export function VoicePanel({
  projectId,
  people,
  greeting,
  language,
  videoSeconds,
  disabled,
  speechMode: savedSpeechMode,
  chorusVoiceIds: savedChorus,
  speakerPersonId: savedSpeakerId,
  onAssigned,
}: {
  projectId: string;
  people: PvgPerson[];
  greeting: string;
  language: string;
  videoSeconds?: number;
  disabled?: boolean;
  speechMode?: PvgSpeechMode;
  syncMode?: PvgSyncMode;
  chorusVoiceIds?: string[];
  /** The saved participant who speaks the whole greeting in "one voice" mode. */
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
  const savePart = useServerFn(savePvgPersonPart);
  const speakTrack = useServerFn(synthesizePvgTrack);
  const saveMerged = useServerFn(savePvgMergedVoiceover);
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
  const [speechMode, setSpeechMode] = useState<PvgSpeechMode>(savedSpeechMode ?? "single");
  /**
   * "One voice reads the entire greeting": the single participant who speaks.
   * This is the only place the speaker is kept, and it is saved with the draft.
   */
  const [speakerId, setSpeakerId] = useState<string | null>(savedSpeakerId ?? null);
  // Voices speaking together always begin, speak and end as one.
  const syncMode: PvgSyncMode = "simultaneous";
  const [category, setCategory] = useState<VoiceCategory | null>(null);
  const [pending, setPending] = useState<LibraryVoice | null>(null);
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
  /** A saved personal voice waiting for the participant it belongs to. */
  const [pendingPersonal, setPendingPersonal] = useState<{ id: string; name: string } | null>(null);
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
  const [askReplaceConfirmed, setAskReplaceConfirmed] = useState(false);
  const [issues, setIssues] = useState<{ key: string; name?: string }[]>([]);
  const [parts, setParts] = useState<Record<string, string>>({});
  /**
   * The one voice that could not be brought in step with the others. It stays
   * visible — marked on its card and in a dialog that never closes by itself —
   * until the person chooses another voice or closes it.
   */
  const [syncIssue, setSyncIssue] = useState<{
    personId: string;
    index: number;
    voiceId: string;
    voiceName: string;
    /** Natural length of that voice and the length the others agreed on. */
    spokenSeconds?: number;
    targetSeconds?: number;
  } | null>(null);
  const [showRecommended, setShowRecommended] = useState(false);
  /**
   * Voices that were recommended, chosen, and still could not keep step with
   * this exact greeting. They are set aside only for this greeting and this
   * video length — with other words or another duration they may be perfect.
   */
  const [incompatible, setIncompatible] = useState<{ key: string; ids: string[] }>({
    key: "",
    ids: [],
  });
  /**
   * Complete voice combinations that already failed for exactly this greeting
   * and this video length. Project Joy never walks the same circle twice.
   */
  const [failedCombos, setFailedCombos] = useState<{ key: string; combos: string[] }>({
    key: "",
    combos: [],
  });
  /** True while Project Joy is looking for a whole combination that works. */
  const [applyingPlan, setApplyingPlan] = useState(false);
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
    const nextParts: Record<string, string> = {};
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
      if (person.partText) nextParts[person.id] = person.partText;
      if (person.voiceCategory) nextCategories[person.id] = person.voiceCategory;
      nextConfirmed[person.id] = Boolean(person.voiceConfirmed);
    }
    setAssignments(nextVoices);
    setPersonalAssigned(nextPersonal);
    setCategories((old) => ({ ...nextCategories, ...old }));
    setConfirmed((old) => ({ ...nextConfirmed, ...old }));
    setParts((old) => ({ ...nextParts, ...old }));
  }, [participants]);

  /**
   * "One voice reads the entire greeting" has exactly one speaker: the
   * participant the person picked. With a single participant that is them.
   */
  const speaker =
    participants.find((p) => p.id === speakerId) ??
    (participants.length === 1 ? (participants[0] ?? null) : null);

  const saved = useQuery({
    queryKey: ["pvg", "voice", projectId],
    queryFn: () => load({ data: { projectId } }),
  });

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
    (next: {
      speechMode?: PvgSpeechMode;
      chorusVoiceIds?: string[];
      speakerPersonId?: string | null;
    }) => {
      void saveSpeech({
        data: {
          projectId,
          speechMode: next.speechMode ?? speechMode,
          syncMode,
          chorusVoiceIds: next.chorusVoiceIds ?? [],
          speakerPersonId: next.speakerPersonId !== undefined ? next.speakerPersonId : speakerId,
        },
      }).catch(() => undefined);
    },
    [saveSpeech, projectId, speechMode, syncMode, speakerId],
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
    setPending(null);
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

  /** Participants speaking in this mode whose voice still needs a decision. */
  const speakingParticipants = useMemo(
    () => (speechMode === "single" ? (speaker ? [speaker] : []) : participants),
    [speechMode, participants, speaker],
  );

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

  /**
   * Everyone who truly has a voice when all participants speak together. There
   * is only ever one list: the participants and the voice each of them keeps.
   */
  const chorusMembers = useMemo(
    () =>
      participants
        .map((person, index) => ({ person, index, voice: chosenFor(person) }))
        .filter((m): m is { person: PvgPerson; index: number; voice: ChosenVoice } =>
          Boolean(m.voice),
        ),
    [participants, chosenFor],
  );

  const chorusEntries = useMemo<ChorusEntry[]>(
    () => chorusMembers.map((m) => ({ kind: "voice", id: m.voice.speakId, name: m.voice.name })),
    [chorusMembers],
  );

  const unconfirmed = useMemo(
    () =>
      speechMode === "chorus"
        ? []
        : speakingParticipants.filter(
            (person) =>
              Boolean(assignments[person.id] ?? personalAssigned[person.id]) &&
              !confirmed[person.id],
          ),
    [speechMode, speakingParticipants, assignments, personalAssigned, confirmed],
  );

  /** The voice the single speaker uses, wherever it comes from. */
  const speakerVoice = speaker ? chosenFor(speaker) : null;

  const voiceChanged = Boolean(
    voiceover && speechMode === "single" && speakerVoice && voiceover.voiceId !== speakerVoice.id,
  );
  const textChanged = Boolean(voiceover && voiceover.greetingText.trim() !== greeting.trim());
  const outdated = voiceChanged || textChanged;

  /**
   * A suitable voice for every participant that still needs one, always from
   * the participant's own group. Nothing is final: each suggestion waits to be
   * listened to and kept.
   */
  async function autoAssign(includeConfirmed: boolean) {
    setAskReplaceConfirmed(false);
    if (disabled || participants.length === 0) return;
    const budget = speechBudgetSeconds(videoSeconds ?? 0);
    const suggestions = autoAssignVoices({
      participants: participants.map((person, index) => ({
        id: person.id,
        category: categoryOf(person),
        confirmed: Boolean(confirmed[person.id]) && Boolean(assignments[person.id]),
        voiceId: assignments[person.id]?.id ?? null,
        words: wordCount(speechMode === "parts" ? partOf(person, index) : greeting),
      })),
      voices,
      language,
      budgetSeconds: budget,
      secondsPerWord: (voiceId) => secondsPerWord(voiceId, language),
      includeConfirmed,
    });
    if (suggestions.length === 0) {
      toast.error(t("pvv_auto_nothing"));
      return;
    }
    setAssignments((prev) => {
      const next = { ...prev };
      for (const s of suggestions) next[s.personId] = { id: s.voiceId, name: s.voiceName };
      return next;
    });
    setConfirmed((prev) => {
      const next = { ...prev };
      for (const s of suggestions) next[s.personId] = false;
      return next;
    });
    for (const s of suggestions) {
      await assign({
        data: {
          projectId,
          personId: s.personId,
          voiceId: s.voiceId,
          voiceName: s.voiceName,
          provider: s.provider,
          category: s.category,
          confirmed: false,
        },
      }).catch(() => undefined);
    }
    toast.success(t("pvv_auto_done"));
    onAssigned?.();
  }

  function startAutoAssign() {
    const hasConfirmed = participants.some((p) => confirmed[p.id] && assignments[p.id]);
    if (hasConfirmed) {
      setAskReplaceConfirmed(true);
      return;
    }
    void autoAssign(false);
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

  /** The name Project Joy shows for the voice that stands in a chorus place. */
  function chorusLabel(index: number): string {
    const person = participants[index];
    return person ? participantLabel(person, index) : `${t("pvv_participant")} ${index + 1}`;
  }

  /**
   * Voices of the very same category as the one that cannot keep step: never a
   * male voice instead of a female one, and only voices with a ready sample
   * that are not already singing along.
   */
  /**
   * The whole answer, not a single voice: Project Joy searches complete
   * combinations, keeps every voice it can — personal voices first of all —
   * and proposes the smallest change that lets everyone speak together. Only a
   * combination checked as a whole is ever shown to the person.
   */
  const plan = useMemo(() => {
    if (!syncIssue) return null;
    const words = wordCount(greeting);
    const key = compatibilityKey({
      projectId,
      greeting,
      language,
      videoSeconds: videoSeconds ?? 0,
      speechMode,
      // The memory belongs to this greeting and this length, not to one
      // particular set of voices — otherwise every change would forget it.
      otherVoiceIds: [],
    });
    const members: GroupMember[] = chorusMembers.map(({ person, index, voice }) => {
      const library = voices.find((v) => v.externalVoiceId === voice.speakId);
      return {
        personId: person.id,
        label: participantLabel(person, index),
        voiceId: voice.speakId,
        voiceName: voice.name,
        category: categories[person.id] ?? (library ? voiceCategory(library) : null) ?? null,
        // A voice from "My voices" is the person's own: it is held on to
        // longest and only ever exchanged when nothing else can help.
        preservation: voice.personal ? "personal" : "manual",
      };
    });
    return solveGroup(
      members,
      voices,
      language,
      {
        words,
        budgetSeconds: speechBudgetSeconds(videoSeconds ?? 0),
        secondsPerWord: (voiceId) => secondsPerWord(voiceId, language),
        measured: (voiceId) => hasMeasuredPace(voiceId, language),
        blocked: new Set(incompatible.key === key ? incompatible.ids : []),
        failedCombos: new Set(failedCombos.key === key ? failedCombos.combos : []),
      },
      { failingPersonId: syncIssue.personId, maxChanges: 2, alternatives: 3 },
    );
  }, [
    syncIssue,
    voices,
    chorusMembers,
    language,
    participants,
    categories,
    greeting,
    videoSeconds,
    speechMode,
    projectId,
    incompatible,
    failedCombos,
  ]);

  /**
   * Only the highlighted place in the chorus receives the new voice. Everyone
   * else keeps the voice the person chose, and the synchronisation is tried
   * again straight away.
   */
  function replaceChorusVoice(voice: LibraryVoice) {
    if (!syncIssue) return;
    const person = participants.find((p) => p.id === syncIssue.personId);
    if (!person) return;
    setSyncIssue(null);
    setShowRecommended(false);
    void give(person, voice, true);
  }

  /**
   * The proposed combination as a whole. Nothing is ever changed silently: the
   * person sees every keep and every replacement first, and only then confirms.
   */
  async function applyPlan() {
    if (!plan || plan.changes.length === 0) return;
    setApplyingPlan(true);
    try {
      for (const change of plan.changes) {
        const person = participants.find((p) => p.id === change.personId);
        if (person) await give(person, change.to, true);
      }
      setSyncIssue(null);
      setShowRecommended(false);
    } finally {
      setApplyingPlan(false);
    }
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
    // A voice the person picks themselves is kept straight away.
    setCategories((prev) => ({ ...prev, [person.id]: group }));
    // A replaced voice always waits to be listened to and kept again.
    setConfirmed((prev) => ({ ...prev, [person.id]: !viaReplace }));
    setPending(null);
    if (syncIssue?.personId === person.id) {
      setSyncIssue(null);
      setShowRecommended(false);
    }
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
    if (syncIssue?.personId === person.id) {
      setSyncIssue(null);
      setShowRecommended(false);
    }
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

  function choose(voice: LibraryVoice) {
    if (disabled) return;
    // A voice is being replaced for one exact participant: nobody else changes.
    if (replaceFor) {
      const person = participants.find((p) => p.id === replaceFor);
      if (person) {
        void give(person, voice, true);
        return;
      }
      setReplaceFor(null);
    }
    // One voice reads everything: the voice always belongs to the speaker.
    if (speechMode === "single") {
      if (speaker) void give(speaker, voice);
      else toast.error(t("pvv_err_no_speaker"));
      return;
    }
    const only = participants[0];
    if (participants.length === 1 && only) {
      void give(only, voice);
      return;
    }
    setPending(voice);
  }

  /** Gives one participant a voice from "My voices". */
  async function givePersonal(
    person: PvgPerson,
    voice: { id: string; name: string },
    viaReplace = false,
  ) {
    setPendingPersonal(null);
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
      if (syncIssue?.personId === person.id) {
        setSyncIssue(null);
        setShowRecommended(false);
      }
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

  function partOf(person: PvgPerson, index: number): string {
    const stored = parts[person.id];
    if (stored !== undefined) return stored;
    return splitGreeting(greeting, participants.length)[index] ?? "";
  }

  function autoSplit() {
    const shared = splitGreeting(greeting, participants.length);
    const next: Record<string, string> = {};
    participants.forEach((person, index) => {
      next[person.id] = shared[index] ?? "";
    });
    setParts(next);
    participants.forEach((person) => {
      void savePart({
        data: { projectId, personId: person.id, partText: next[person.id] ?? "" },
      }).catch(() => undefined);
    });
  }

  function editPart(person: PvgPerson, text: string) {
    setParts((prev) => ({ ...prev, [person.id]: text }));
    void savePart({ data: { projectId, personId: person.id, partText: text } }).catch(
      () => undefined,
    );
  }

  /** Each participant as the length estimate sees them, with their own pace. */
  function partEstimates() {
    return participants.map((person, index) => {
      return {
        words: wordCount(partOf(person, index)),
        secondsPerWord: secondsPerWord(chosenFor(person)?.id ?? null, language),
      };
    });
  }

  /** Speaks one piece of text with one Project Joy voice. */
  async function speak(
    text: string,
    voiceId: string,
    speed = 1,
  ): Promise<MixSource & { seconds: number }> {
    const res = await speakTrack({ data: { projectId, text, voiceId, language, speed } });
    return { base64: res.audioBase64, mimeType: res.mimeType, seconds: res.durationSeconds };
  }

  async function generate() {
    if (running.current || busy || disabled) return;
    const chorusList = chorusEntries;
    // Every new synchronisation check starts with a clean slate.
    setSyncIssue(null);
    setShowRecommended(false);
    // A voice Project Joy suggested is never used before the person has
    // listened to it and kept it.
    if (unconfirmed.length > 0) {
      const waiting = unconfirmed.map((person) => ({
        key: "pvv_err_confirm_for",
        name: participantLabel(person, participants.indexOf(person)),
      }));
      setIssues(waiting);
      toast.error(voiceIssueText(waiting[0]!, t));
      return;
    }
    const found = validateVoiceSetup({
      speechMode,
      greeting,
      videoSeconds: videoSeconds ?? 0,
      chorusVoiceCount: chorusList.length,
      speakerId: speaker?.id ?? null,
      participants: participants.map((person, index) => ({
        id: person.id,
        label: participantLabel(person, index),
        voiceId: chosenFor(person)?.speakId ?? null,
        partText: partOf(person, index),
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
      if (speechMode === "single") {
        if (speaker && speakerVoice) {
          const res = await create({
            data: { projectId, text: greeting, voiceId: speakerVoice.speakId, language },
          });
          audioRef.current?.pause();
          setPlaying(false);
          setVoiceover(res.voiceover);
        } else {
          toast.error(t("pvv_need_voice"));
          return;
        }
      } else if (speechMode === "parts") {
        // The video always opens and ends in silence, so the speech itself is
        // given a little less time than the video lasts.
        const budget = speechBudgetSeconds(videoSeconds ?? 0);

        // The lines belong to the people who wrote them: they are spoken
        // exactly as they stand, never moved, shortened or rewritten.
        const texts = participants.map((person, index) => partOf(person, index).trim());

        // Only the pace of the voices is adjusted, and only as much as the
        // remaining time truly needs.
        const estimate = estimateSpeechSeconds(partEstimates());
        const speed =
          budget > 0 && estimate > budget
            ? Math.min(
                PVG_MAX_SPEECH_SPEED,
                Math.max(1, Math.round((estimate / budget) * 100) / 100),
              )
            : 1;

        const sources: MixSource[] = [];
        const summary: { label: string; durationSeconds: number; source: string }[] = [];
        // Every participant with a line must have a voice: the exact voice the
        // person sees next to their name is the voice that speaks.
        const missing = participants.find(
          (person, index) => Boolean(texts[index]) && !chosenFor(person),
        );
        if (missing) {
          const index = participants.indexOf(missing);
          const waiting = [
            { key: "pvv_err_no_voice_for", name: participantLabel(missing, index) },
          ];
          setIssues(waiting);
          toast.error(voiceIssueText(waiting[0]!, t));
          return;
        }
        for (let index = 0; index < participants.length; index += 1) {
          const person = participants[index]!;
          const text = texts[index] ?? "";
          const voice = chosenFor(person);
          if (!text || !voice) continue;
          const track = await speak(text, voice.speakId, speed);
          rememberPace(voice.id, language, wordCount(text), track.seconds, speed);
          sources.push(track);
          summary.push({
            label: `${participantLabel(person, index)} — ${voice.name}`,
            durationSeconds: track.seconds,
            source: "voice",
          });
        }
        if (sources.length === 0) {
          toast.error(t("pvv_parts_missing"));
          return;
        }
        // Quiet edges are removed and the pauses stay at their shortest, but
        // nothing is ever squeezed: the words themselves remain untouched.
        const merged = await mergeInOrder(sources, {
          maxSeconds: budget,
          gapSeconds: PVG_MIN_PART_GAP_SECONDS,
          compress: false,
        });
        if (merged.overflow) {
          toast.error(t("pvv_parts_too_long"));
          return;
        }
        const res = await saveMerged({
          data: {
            projectId,
            audioBase64: merged.base64,
            mimeType: merged.mimeType,
            durationSeconds: merged.durationSeconds,
            characterCount: greeting.trim().length,
            language,
            greetingText: greeting.trim(),
            voiceId: "several-voices",
            voiceName: summary.map((s) => s.label).join(" · "),
            provider: "project-joy",
            speechMode,
            syncMode: null,
            trackSummary: summary,
          },
        });
        audioRef.current?.pause();
        setPlaying(false);
        setVoiceover(res.voiceover);
      } else {
        if (chorusList.length < PVG_MIN_CHORUS_VOICES) {
          toast.error(t("pvv_chorus_min"));
          return;
        }
        const sources: MixSource[] = [];
        const summary: { label: string; durationSeconds: number; source: string }[] = [];
        // The same voice chosen for several participants is spoken once and
        // that single recording is used for each of them, so identical voices
        // are always perfectly in step with one another.
        const spoken = new Map<string, MixSource & { seconds: number }>();
        for (const entry of chorusList) {
          if (entry.kind === "audio") {
            // A recording or a personal voice already carries the whole
            // greeting: it is used exactly as the person kept it.
            sources.push({ url: entry.url });
            summary.push({
              label: entry.name,
              durationSeconds: entry.seconds,
              source: "recording",
            });
            continue;
          }
          let track = spoken.get(entry.id);
          if (!track) {
            track = await speak(greeting, entry.id);
            rememberPace(entry.id, language, wordCount(greeting), track.seconds);
            spoken.set(entry.id, track);
          }
          sources.push(track);
          summary.push({ label: entry.name, durationSeconds: track.seconds, source: "voice" });
        }
        // Every chosen voice speaks the whole greeting, word for word. Only the
        // pace is brought in step; no voice and no word is ever exchanged.
        const merged = await blendTogether(sources, {
          maxSeconds: speechBudgetSeconds(videoSeconds ?? 0),
        });
        if (merged.unsyncable !== undefined) {
          const member = chorusMembers[merged.unsyncable];
          if (member) {
            setSyncIssue({
              personId: member.person.id,
              index: merged.unsyncable,
              voiceId: member.voice.personal ? "" : member.voice.id,
              voiceName: member.voice.name,
              spokenSeconds: merged.unsyncableDetail?.spokenSeconds,
              targetSeconds: merged.unsyncableDetail?.targetSeconds,
            });
            // A voice that truly failed for this greeting is never offered
            // again as a recommendation for these exact words and this exact
            // video length — but it stays perfectly good for another greeting.
            const key = compatibilityKey({
              projectId,
              greeting,
              language,
              videoSeconds: videoSeconds ?? 0,
              speechMode,
              otherVoiceIds: [],
            });
            setIncompatible((prev) =>
              prev.key === key
                ? { key, ids: [...new Set([...prev.ids, member.voice.speakId])] }
                : { key, ids: [member.voice.speakId] },
            );
            // The complete combination is remembered as well, so Project Joy
            // never proposes a set of voices it has already seen fail.
            const whole = comboKey(chorusMembers.map((m) => m.voice.speakId));
            const groupKey = compatibilityKey({
              projectId,
              greeting,
              language,
              videoSeconds: videoSeconds ?? 0,
              speechMode,
              otherVoiceIds: [],
            });
            setFailedCombos((prev) =>
              prev.key === groupKey
                ? { key: groupKey, combos: [...new Set([...prev.combos, whole])] }
                : { key: groupKey, combos: [whole] },
            );
            // Project Joy looks for a whole working combination right away,
            // instead of sending the person from one voice to the next.
            setShowRecommended(true);
          }
          toast.error(`${t("pvv_chorus_unsyncable")}${member ? ` (${member.voice.name})` : ""}`);
          return;
        }
        if (merged.overflow) {
          // The real, measured length of the spoken greeting is the reason —
          // never an estimate, and never a particular voice.
          const needed = merged.neededSeconds;
          toast.error(
            needed
              ? `${t("pvv_chorus_too_long")} (${needed}s / ${merged.allowedSeconds ?? 0}s)`
              : t("pvv_chorus_too_long"),
          );
          return;
        }
        const res = await saveMerged({
          data: {
            projectId,
            audioBase64: merged.base64,
            mimeType: merged.mimeType,
            durationSeconds: merged.durationSeconds,
            characterCount: greeting.trim().length,
            language,
            greetingText: greeting.trim(),
            voiceId: "all-together",
            voiceName: chorusList.map((v) => v.name).join(" · "),
            provider: "project-joy",
            speechMode,
            syncMode,
            trackSummary: summary,
          },
        });
        audioRef.current?.pause();
        setPlaying(false);
        setVoiceover(res.voiceover);
      }
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

  /**
   * The participant a voice is being chosen for right now. It is shown above
   * every voice source, so it is always clear who is being edited.
   */
  function pickPersonal(voice: { id: string; name: string }) {
    if (disabled) return;
    // The participant chosen through "Replace" always keeps the voice.
    if (replaceFor) {
      const person = participants.find((p) => p.id === replaceFor);
      if (person) {
        void givePersonal(person, voice, true);
        return;
      }
      setReplaceFor(null);
    }
    // One voice reads everything: the voice always belongs to the speaker.
    if (speechMode === "single") {
      if (speaker) void givePersonal(speaker, voice);
      else toast.error(t("pvv_err_no_speaker"));
      return;
    }
    const only = participants[0];
    if (participants.length === 1 && only) {
      void givePersonal(only, voice);
      return;
    }
    setPendingPersonal(voice);
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

      {/* How the greeting is spoken ------------------------------------- */}
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("pvv_mode_title")}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {SPEECH_MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              setSpeechMode(option.id);
              persistSpeech({ speechMode: option.id });
            }}
            className={`rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60 ${
              speechMode === option.id
                ? "border-primary bg-primary/10"
                : "border-border/60 hover:border-primary/40"
            }`}
          >
            <span className="block text-sm font-semibold">{t(option.title)}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{t(option.note)}</span>
          </button>
        ))}
      </div>

      {/* One voice reads the entire greeting ----------------------------- */}
      {speechMode === "single" && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
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

      {/* Each participant speaks their own part -------------------------- */}
      {speechMode === "parts" && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("pvv_parts_title")}
            </p>
            <button
              type="button"
              disabled={disabled || greeting.trim().length < 2}
              onClick={autoSplit}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/50 disabled:opacity-60"
            >
              <Wand2 className="h-3 w-3" />
              {t("pvv_parts_auto")}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("pvv_parts_hint")}</p>
          <div className="mt-3 space-y-3">
            {participants.map((person, index) => {
              // One single assignment per participant, wherever the voice came
              // from: Project Joy voices, My Voices or a newly added voice.
              const chosen = chosenFor(person);
              const needsVoice = !chosen && partOf(person, index).trim().length > 0;
              return (
              <div key={person.id}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <ParticipantAvatar
                    photoUrl={person.photoUrl}
                    label={participantLabel(person, index)}
                    size="sm"
                  />
                  <p className="text-xs font-medium">
                    {participantLabel(person, index)}
                    <span
                      className={`ml-2 text-[11px] font-normal ${
                        chosen
                          ? "font-medium text-primary"
                          : needsVoice
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {chosen ? chosen.name : t("pvv_no_voice")}
                    </span>
                  </p>
                  <button
                    type="button"
                    disabled={disabled || openingFor !== null}
                    onClick={() => openReplace(person)}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] transition hover:border-primary/50 disabled:opacity-60"
                  >
                    {openingFor === person.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    {chosen ? t("pvv_replace") : t("pvv_select")}
                  </button>
                </div>
                <textarea
                  value={partOf(person, index)}
                  disabled={disabled}
                  rows={2}
                  onChange={(event) => editPart(person, event.target.value)}
                  className={`w-full rounded-2xl border bg-background/70 p-3 text-sm outline-none transition focus:border-primary/60 ${
                    needsVoice ? "border-destructive/60" : "border-border/60"
                  }`}
                />
                {needsVoice && (
                  <p className="mt-1 text-[11px] font-medium text-destructive">
                    {t("pvv_err_no_voice_for").replace(
                      "{name}",
                      participantLabel(person, index),
                    )}
                  </p>
                )}
              </div>
              );
            })}
            {participants.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("pvv_no_participants")}</p>
            )}
          </div>
          {participants.length > 0 && videoSeconds
            ? (() => {
                const budget = speechBudgetSeconds(videoSeconds);
                const estimate = estimateSpeechSeconds(partEstimates());
                const fastest = estimateSpeechSeconds(partEstimates(), PVG_MAX_SPEECH_SPEED);
                const fits = fastest <= budget;
                return (
                  <div
                    className={`mt-4 rounded-2xl border p-3 text-[11px] ${
                      fits
                        ? "border-border/60 text-muted-foreground"
                        : "border-destructive/50 text-destructive"
                    }`}
                  >
                    <p>
                      {t("pvv_parts_estimate")}: {estimate.toFixed(1)}s / {budget.toFixed(1)}s
                    </p>
                    {!fits && <p className="mt-1 font-medium">{t("pvv_parts_too_long")}</p>}
                  </div>
                );
              })()
            : null}
        </div>
      )}

      {/* All participants speak together --------------------------------- */}
      {speechMode === "chorus" && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("pvv_chorus_title")}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("pvv_chorus_hint")}</p>
          <p className="mt-2 text-xs font-medium text-primary">
            {t("pvv_chorus_count")}: {chorusEntries.length} / {PVG_MAX_CHORUS_VOICES}
          </p>
          {chorusMembers.length > 0 && (
            <ul className="mt-2 grid gap-2">
              {chorusMembers.map(({ person, index, voice }) => {
                const broken = syncIssue?.personId === person.id;
                const label = participantLabel(person, index);
                return (
                  <li
                    key={person.id}
                    className={`rounded-2xl border px-3 py-2 ${
                      broken
                        ? "border-destructive bg-destructive/5"
                        : "border-primary/40 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ParticipantAvatar photoUrl={person.photoUrl} label={label} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] text-muted-foreground">{label}</span>
                        <span
                          className={`block truncate text-xs font-medium ${
                            broken ? "text-destructive" : "text-primary"
                          }`}
                        >
                          {voice.name}
                        </span>
                      </span>
                      {broken && (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                      )}
                      <button
                        type="button"
                        disabled={disabled || openingFor !== null}
                        onClick={() => openReplace(person)}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] transition hover:border-primary/50 disabled:opacity-60"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t("pvv_replace")}
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={t("pvv_remove")}
                        className="rounded-full p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-60"
                        onClick={() => void take(person)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {broken && (
                      <p className="mt-1.5 text-[11px] font-medium text-destructive">
                        {t("pvv_sync_badge")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* The voice that cannot keep step, explained and never closed by itself */}
          {syncIssue && (
            <div className="mt-3 rounded-2xl border border-destructive/60 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <ParticipantAvatar
                  photoUrl={participants.find((p) => p.id === syncIssue.personId)?.photoUrl ?? null}
                  label={chorusLabel(syncIssue.index)}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {chorusLabel(syncIssue.index)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t("pvv_sync_current_voice")}: {syncIssue.voiceName}
                  </p>
                  <p className="mt-2 text-xs text-foreground">
                    {t("pvv_sync_dialog_body").replace("{name}", chorusLabel(syncIssue.index))}
                  </p>
                  {syncIssue.spokenSeconds !== undefined &&
                    syncIssue.targetSeconds !== undefined && (
                      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                        {syncIssue.spokenSeconds.toFixed(1)}s → {syncIssue.targetSeconds.toFixed(1)}
                        s{videoSeconds ? ` · ${speechBudgetSeconds(videoSeconds).toFixed(1)}s` : ""}
                      </p>
                    )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSyncIssue(null);
                    setShowRecommended(false);
                  }}
                  className="rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/50"
                >
                  {t("pvv_sync_close")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecommended(true)}
                  className="rounded-full bg-gold-gradient px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-warm"
                >
                  {t("pvv_sync_recommend")}
                </button>
              </div>

              {showRecommended && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {plan && plan.changes.length > 0
                      ? t(
                          plan.changes.length > 1
                            ? "pvv_sync_plan_title_many"
                            : "pvv_sync_plan_title_one",
                        )
                      : t("pvv_sync_recommended_title")}
                  </p>
                  {!plan || plan.impossible || plan.changes.length === 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] text-muted-foreground">
                        {t("pvv_sync_no_combination")}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("pvv_sync_no_combination_hint")}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* The whole group at once: what is kept and what changes */}
                      <ul className="mt-2 grid gap-1.5">
                        {chorusMembers.map(({ person, index, voice }) => {
                          const change = plan.changes.find((c) => c.personId === person.id);
                          return (
                            <li
                              key={person.id}
                              className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-[11px]"
                            >
                              <ParticipantAvatar
                                photoUrl={person.photoUrl}
                                label={participantLabel(person, index)}
                                size="sm"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-muted-foreground">
                                  {participantLabel(person, index)}
                                </span>
                                <span className="block truncate font-medium">
                                  {change
                                    ? `${voice.name} → ${change.to.displayName || change.to.name}`
                                    : voice.name}
                                </span>
                              </span>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                                  change
                                    ? "bg-primary/15 text-primary"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {t(change ? "pvv_sync_plan_replace" : "pvv_sync_plan_keep")}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {plan.changes.map((change) => (
                          <button
                            key={change.to.id}
                            type="button"
                            onClick={() => void playSample(sampleOf(change.to))}
                            disabled={samplingId !== null}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/50 disabled:opacity-60"
                          >
                            {samplingId === change.to.externalVoiceId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Headphones className="h-3 w-3" />
                            )}
                            {change.to.displayName || change.to.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={disabled || applyingPlan}
                          onClick={() => void applyPlan()}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gold-gradient px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
                        >
                          {applyingPlan ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          {t("pvv_sync_plan_confirm")}
                        </button>
                      </div>

                      {plan.alternatives.length > 0 && (
                        <>
                          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t("pvv_sync_recommended_title")}
                          </p>
                          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                            {plan.alternatives.map((voice) => (
                              <li
                                key={voice.id}
                                className="rounded-2xl border border-border/60 bg-background/60 p-3"
                              >
                                <p className="text-sm font-medium">
                                  {voice.displayName || voice.name}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {t("pvv_sync_recommended_note")}
                                </p>
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
                                    disabled={disabled}
                                    onClick={() => replaceChorusVoice(voice)}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-gold-gradient px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
                                  >
                                    <Check className="h-3 w-3" />
                                    {t("pvv_select")}
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* The ways a greeting can be spoken ------------------------------- */}
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
                const inUse = chorusMembers.some((m) => m.voice.id === voice.externalVoiceId);
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
        </div>
      )}

      {/* Who should this saved voice be assigned to? --------------------- */}
      {pendingPersonal && (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              {t("mv_assign_title")}
            </p>
            <button
              type="button"
              onClick={() => setPendingPersonal(null)}
              aria-label={t("pvv_cancel")}
              className="rounded-full p-1 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {participants.map((person, index) => (
              <button
                key={person.id}
                type="button"
                onClick={() => void givePersonal(person, pendingPersonal)}
                className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-2.5 text-left text-sm font-medium transition hover:border-primary/50"
              >
                <ParticipantAvatar
                  photoUrl={person.photoUrl}
                  label={participantLabel(person, index)}
                  size="sm"
                />
                {participantLabel(person, index)}
              </button>
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
                className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-2.5 text-left text-sm font-medium transition hover:border-primary/50"
              >
                <ParticipantAvatar
                  photoUrl={person.photoUrl}
                  label={participantLabel(person, index)}
                  size="sm"
                />
                {participantLabel(person, index)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected voices -------------------------------------------------- */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("pvv_selected_voices")}
          </p>
          <button
            type="button"
            disabled={disabled || participants.length === 0 || voices.length === 0}
            onClick={startAutoAssign}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
          >
            <Wand2 className="h-3 w-3" />
            {t("pvv_auto_assign")}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("pvv_auto_assign_note")}</p>

        {askReplaceConfirmed && (
          <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs font-medium">{t("pvv_auto_replace_question")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void autoAssign(false)}
                className="rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/50"
              >
                {t("pvv_auto_only_missing")}
              </button>
              <button
                type="button"
                onClick={() => void autoAssign(true)}
                className="rounded-full bg-gold-gradient px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-warm"
              >
                {t("pvv_auto_replace_all")}
              </button>
              <button
                type="button"
                onClick={() => setAskReplaceConfirmed(false)}
                className="rounded-full border border-border/60 px-3 py-1.5 text-[11px] transition hover:border-primary/50"
              >
                {t("pvv_cancel")}
              </button>
            </div>
          </div>
        )}
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
          {/* One voice reads everything: only the speaker needs a voice. */}
          {(speechMode === "single" ? (speaker ? [speaker] : []) : participants).map((person) => {
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

                {/* The line this participant reads, exactly as it was written */}
                {speechMode === "parts" && (
                  <p className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                    {partOf(person, index).trim() || t("pvv_no_text")}
                  </p>
                )}

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

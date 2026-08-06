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
  confirmPvgRecordingPermission,
  deletePvgPersonRecording,
  generatePvgVoiceover,
  getPvgVoiceover,
  listPvgPersonRecordings,
  previewPvgVoice,
  savePvgMergedVoiceover,
  savePvgPersonPart,
  savePvgPersonVoiceChoice,
  savePvgPersonRecording,
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
import { rememberPace, secondsPerWord } from "@/lib/personal-video/voice/rates";
import {
  validateVoiceSetup,
  voiceIssueText,
  type PvgVoiceRecording,
} from "@/lib/personal-video/voice/recordings";
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
  RecordingStudio,
  type PendingRecording,
  type RecordingChoice,
} from "./voice/RecordingStudio";
import {
  assignPersonalVoice,
  listProjectPersonalVoices,
  savePersonalVoice as savePersonalVoiceFn,
} from "@/lib/personal-video/voice/personal-voices.functions";
import { PERSONAL_VOICE_STYLES } from "@/lib/personal-video/voice/personal-voices";
import {
  chorusEntriesFor,
  type ChorusEntry,
} from "@/lib/personal-video/voice/chorus";

type VoiceMode = "library" | "own" | "mine";

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

/** One place in the chorus: a Project Joy voice, or a person's own sound. */
type ChorusEntry =
  | { kind: "voice"; id: string; name: string }
  | { kind: "audio"; url: string; name: string; seconds: number };

/**
 * The voices of one order: who speaks, how they speak together, and the
 * recordings people bring with their own voice.
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
  const saveRecording = useServerFn(savePvgPersonRecording);
  const dropRecording = useServerFn(deletePvgPersonRecording);
  const loadRecordings = useServerFn(listPvgPersonRecordings);
  const confirmPermission = useServerFn(confirmPvgRecordingPermission);
  const keepPersonalVoice = useServerFn(savePersonalVoiceFn);
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
  // Voices speaking together always begin, speak and end as one.
  const syncMode: PvgSyncMode = "simultaneous";
  const [chorus, setChorus] = useState<Assignment[]>([]);
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
  const [pendingRecording, setPendingRecording] = useState<PendingRecording | null>(null);
  /** What the person decided about the recording waiting to be assigned. */
  const [recordingChoice, setRecordingChoice] = useState<RecordingChoice | null>(null);
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
  /** The voice group every participant belongs to: female, male or children. */
  const [categories, setCategories] = useState<Record<string, VoiceCategory>>({});
  /** Voices the person has listened to and kept. Nothing else may be used. */
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [askReplaceConfirmed, setAskReplaceConfirmed] = useState(false);
  const [recordings, setRecordings] = useState<Record<string, PvgVoiceRecording>>({});
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [permissionForPending, setPermissionForPending] = useState(false);
  const [issues, setIssues] = useState<{ key: string; name?: string }[]>([]);
  const [parts, setParts] = useState<Record<string, string>>({});
  /**
   * The one voice that could not be brought in step with the others. It stays
   * visible — marked on its card and in a dialog that never closes by itself —
   * until the person chooses another voice or closes it.
   */
  const [syncIssue, setSyncIssue] = useState<{
    index: number;
    voiceId: string;
    voiceName: string;
  } | null>(null);
  const [showRecommended, setShowRecommended] = useState(false);
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
    const nextParts: Record<string, string> = {};
    const nextCategories: Record<string, VoiceCategory> = {};
    const nextConfirmed: Record<string, boolean> = {};
    for (const person of participants) {
      if (person.voiceId)
        nextVoices[person.id] = { id: person.voiceId, name: person.voiceName ?? person.voiceId };
      if (person.partText) nextParts[person.id] = person.partText;
      if (person.voiceCategory) nextCategories[person.id] = person.voiceCategory;
      nextConfirmed[person.id] = Boolean(person.voiceConfirmed);
    }
    setAssignments(nextVoices);
    setCategories((old) => ({ ...nextCategories, ...old }));
    setConfirmed((old) => ({ ...nextConfirmed, ...old }));
    setParts((old) => ({ ...nextParts, ...old }));
  }, [participants]);

  // Everything a person recorded before is restored exactly as they left it.
  const storedRecordings = useQuery({
    queryKey: ["pvg", "recordings", projectId],
    queryFn: () => loadRecordings({ data: { projectId } }),
  });

  useEffect(() => {
    const list = storedRecordings.data?.recordings;
    if (!list) return;
    const next: Record<string, PvgVoiceRecording> = {};
    for (const recording of list) next[recording.personId] = recording;
    setRecordings(next);
  }, [storedRecordings.data]);

  useEffect(() => {
    if (!savedChorus?.length || chorus.length) return;
    const found = savedChorus
      .map((id) => voices.find((v) => v.externalVoiceId === id))
      .filter((v): v is LibraryVoice => Boolean(v))
      .map((v) => ({ id: v.externalVoiceId, name: v.displayName || v.name }));
    if (found.length) setChorus(found);
  }, [savedChorus, voices, chorus.length]);

  const primary = participants[0] ? assignments[participants[0].id] : undefined;

  const saved = useQuery({
    queryKey: ["pvg", "voice", projectId],
    queryFn: () => load({ data: { projectId } }),
  });

  useEffect(() => {
    const found = saved.data?.voiceover ?? null;
    if (found) setVoiceover(found);
  }, [saved.data]);

  const voiceChanged = Boolean(
    voiceover && speechMode === "single" && primary && voiceover.voiceId !== primary.id,
  );
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

  const persistSpeech = useCallback(
    (next: { speechMode?: PvgSpeechMode; chorusVoiceIds?: string[] }) => {
      void saveSpeech({
        data: {
          projectId,
          speechMode: next.speechMode ?? speechMode,
          syncMode,
          chorusVoiceIds: next.chorusVoiceIds ?? chorus.map((c) => c.id),
        },
      }).catch(() => undefined);
    },
    [saveSpeech, projectId, speechMode, syncMode, chorus],
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
    () => (speechMode === "single" ? participants.slice(0, 1) : participants),
    [speechMode, participants],
  );

  /**
   * Every participant that truly has a voice when all of them speak together,
   * no matter where that voice comes from: a Project Joy voice, a voice from
   * "My voices" or a recording kept for this greeting only.
   */
  const buildChorusEntries = useCallback(
    (list: Assignment[]): ChorusEntry[] => {
      return chorusEntriesFor({
        participants: participants.map((person, index) => ({
          id: person.id,
          label: person.name.trim() || `${t("pvv_participant")} ${index + 1}`,
          personalVoiceId: person.personalVoiceId,
        })),
        assignments,
        recordings,
        personalVoices: personalVoices.data?.voices ?? [],
        chosen: list,
      });
    },
    [participants, recordings, assignments, personalVoices.data, t],
  );

  const chorusEntries = useMemo(() => buildChorusEntries(chorus), [buildChorusEntries, chorus]);

  const unconfirmed = useMemo(
    () =>
      speechMode === "chorus"
        ? []
        : speakingParticipants.filter(
            (person) =>
              Boolean(assignments[person.id]) && !recordings[person.id] && !confirmed[person.id],
          ),
    [speechMode, speakingParticipants, assignments, recordings, confirmed],
  );

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
  const recommended = useMemo(() => {
    if (!syncIssue) return [] as LibraryVoice[];
    const current = voices.find((v) => v.externalVoiceId === syncIssue.voiceId);
    // The group of the participant standing in this place always wins, so a
    // male participant is never offered a female voice.
    const person = participants[syncIssue.index];
    const chosenGroup = person ? categories[person.id] : undefined;
    const wanted = chosenGroup ?? (current ? voiceCategory(current) : null);
    if (!wanted) return [] as LibraryVoice[];
    return recommendVoices(voices, wanted, language, {
      exclude: [syncIssue.voiceId, ...chorus.map((c) => c.id)],
      limit: 5,
    });
  }, [syncIssue, voices, chorus, language, participants, categories]);

  /**
   * Only the highlighted place in the chorus receives the new voice. Everyone
   * else keeps the voice the person chose, and the synchronisation is tried
   * again straight away.
   */
  function replaceChorusVoice(voice: LibraryVoice) {
    if (!syncIssue) return;
    const next = chorus.map((entry, index) =>
      index === syncIssue.index
        ? { id: voice.externalVoiceId, name: voice.displayName || voice.name }
        : entry,
    );
    setChorus(next);
    persistSpeech({ chorusVoiceIds: next.map((v) => v.id) });
    setSyncIssue(null);
    setShowRecommended(false);
    void generate(next);
  }

  async function give(person: PvgPerson, voice: LibraryVoice, viaReplace = false) {
    const name = voice.displayName || voice.name;
    const group = voiceCategory(voice);
    const index = participants.findIndex((p) => p.id === person.id);
    const label = participantLabel(person, index < 0 ? 0 : index);
    const previous = assignments[person.id] ?? null;
    setAssignments((prev) => ({ ...prev, [person.id]: { id: voice.externalVoiceId, name } }));
    // A voice the person picks themselves is kept straight away.
    setCategories((prev) => ({ ...prev, [person.id]: group }));
    // A replaced voice always waits to be listened to and kept again.
    setConfirmed((prev) => ({ ...prev, [person.id]: !viaReplace }));
    setRecordings((prev) => {
      const next = { ...prev };
      delete next[person.id];
      return next;
    });
    setPending(null);
    // Voices speaking together: only this participant's place changes.
    if (speechMode === "chorus" && index >= 0) {
      const nextChorus = [...chorus];
      const entry = { id: voice.externalVoiceId, name };
      if (index < nextChorus.length) nextChorus[index] = entry;
      else nextChorus.push(entry);
      setChorus(nextChorus);
      persistSpeech({ chorusVoiceIds: nextChorus.map((v) => v.id) });
      if (syncIssue?.index === index) {
        setSyncIssue(null);
        setShowRecommended(false);
      }
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
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[person.id];
      return next;
    });
    setConfirmed((prev) => ({ ...prev, [person.id]: false }));
    setRecordings((prev) => {
      const next = { ...prev };
      delete next[person.id];
      return next;
    });
    try {
      await assign({ data: { projectId, personId: person.id, voiceId: null } });
      await dropRecording({ data: { projectId, personId: person.id } });
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
    if (speechMode === "chorus") {
      setChorus((prev) => {
        const exists = prev.some((v) => v.id === voice.externalVoiceId);
        const next = exists
          ? prev.filter((v) => v.id !== voice.externalVoiceId)
          : prev.length >= PVG_MAX_CHORUS_VOICES
            ? prev
            : [...prev, { id: voice.externalVoiceId, name: voice.displayName || voice.name }];
        persistSpeech({ chorusVoiceIds: next.map((v) => v.id) });
        return next;
      });
      return;
    }
    const only = participants[0];
    if (participants.length === 1 && only) {
      void give(only, voice);
      return;
    }
    setPending(voice);
  }

  /**
   * A recording a person made or brought is prepared by Project Joy and kept
   * with one participant. Nothing here is ever chosen by the person: the whole
   * preparation simply happens.
   */
  async function keepRecording(
    person: PvgPerson,
    recording: PendingRecording,
    choice: RecordingChoice,
  ) {
    setPendingRecording(null);
    setPrepared(false);
    setPreparing(true);
    try {
      // Project Joy levels and tidies the recording before it is stored.
      const ready = await mergeInOrder([
        { base64: recording.base64, mimeType: recording.mimeType },
      ]);
      const res = await saveRecording({
        data: {
          projectId,
          personId: person.id,
          language,
          originalBase64: recording.base64,
          originalMime: recording.mimeType,
          extension: recording.extension,
          processedBase64: ready.base64,
          processedMime: ready.mimeType,
          durationSeconds: ready.durationSeconds || recording.durationSeconds,
          permissionConfirmed: choice.permissionConfirmed,
        },
      });

      // The very same recording also becomes a named voice: kept with this
      // greeting only, or saved to "My voices" for every future greeting.
      const saved = await keepPersonalVoice({
        data: {
          projectId,
          scope: choice.scope,
          displayName: choice.displayName,
          language,
          originalBase64: recording.base64,
          originalMime: recording.mimeType,
          extension: recording.extension,
          processedBase64: ready.base64,
          processedMime: ready.mimeType,
          durationSeconds: ready.durationSeconds || recording.durationSeconds,
          consentConfirmed: choice.permissionConfirmed,
        },
      });
      await applyPersonalVoice({
        data: {
          projectId,
          personId: person.id,
          voiceId: saved.voice.id,
          voiceName: saved.voice.displayName,
          style: styles[person.id] ?? "natural",
        },
      });
      void personalVoices.refetch();

      setAssignments((prev) => {
        const next = { ...prev };
        delete next[person.id];
        return next;
      });
      setRecordings((prev) => ({ ...prev, [person.id]: res.recording }));
      setPrepared(true);
      toast.success(t("pvv_recording_assigned"));
      onAssigned?.();
      void storedRecordings.refetch();
    } catch {
      toast.error(t("pvv_failed"));
    } finally {
      setPreparing(false);
    }
  }

  function acceptRecording(recording: PendingRecording, choice: RecordingChoice) {
    const only = participants[0];
    if (participants.length === 1 && only) {
      void keepRecording(only, recording, choice);
      return;
    }
    setPermissionForPending(choice.permissionConfirmed);
    setRecordingChoice(choice);
    setPendingRecording(recording);
  }

  /** Gives one participant a voice from "My voices". */
  async function givePersonal(person: PvgPerson, voice: { id: string; name: string }) {
    setPendingPersonal(null);
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
      setConfirmed((prev) => ({ ...prev, [person.id]: true }));
      toast.success(t("mv_assigned"));
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
      const recording = recordings[person.id];
      if (recording) return { recordedSeconds: recording.durationSeconds };
      return {
        words: wordCount(partOf(person, index)),
        secondsPerWord: secondsPerWord(assignments[person.id]?.id ?? null, language),
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

  async function generate(chorusOverride?: Assignment[]) {
    if (running.current || busy || disabled) return;
    const chorusList = chorusOverride ? buildChorusEntries(chorusOverride) : chorusEntries;
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
      participants: participants.map((person, index) => ({
        id: person.id,
        label: participantLabel(person, index),
        voiceId: assignments[person.id]?.id ?? null,
        partText: partOf(person, index),
        recording: recordings[person.id] ?? null,
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
        const first = participants[0];
        const ownRecording = first ? recordings[first.id] : undefined;
        if (primary) {
          const res = await create({
            data: { projectId, text: greeting, voiceId: primary.id, language },
          });
          audioRef.current?.pause();
          setPlaying(false);
          setVoiceover(res.voiceover);
        } else if (ownRecording?.activeUrl && first) {
          const merged = await mergeInOrder([{ url: ownRecording.activeUrl }]);
          const res = await saveMerged({
            data: {
              projectId,
              audioBase64: merged.base64,
              mimeType: merged.mimeType,
              durationSeconds: merged.durationSeconds,
              characterCount: greeting.trim().length,
              language,
              greetingText: greeting.trim(),
              voiceId: "personal-recording",
              voiceName: t("pvv_recording_own"),
              provider: "project-joy",
              speechMode,
              syncMode: null,
              trackSummary: [
                {
                  label: participantLabel(first, 0),
                  durationSeconds: merged.durationSeconds,
                  source: "recording",
                },
              ],
            },
          });
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
        for (let index = 0; index < participants.length; index += 1) {
          const person = participants[index]!;
          const text = texts[index] ?? "";
          const recording = recordings[person.id];
          if (recording?.activeUrl) {
            sources.push({ url: recording.activeUrl });
            summary.push({
              label: participantLabel(person, index),
              durationSeconds: recording.durationSeconds,
              source: "recording",
            });
            continue;
          }
          const voice = assignments[person.id];
          if (!text || !voice) continue;
          const track = await speak(text, voice.id, speed);
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
          const track = await speak(greeting, entry.id);
          sources.push(track);
          summary.push({ label: entry.name, durationSeconds: track.seconds, source: "voice" });
        }
        // Every chosen voice speaks the whole greeting, word for word. Only the
        // pace is brought in step; no voice and no word is ever exchanged.
        const merged = await blendTogether(sources, {
          maxSeconds: speechBudgetSeconds(videoSeconds ?? 0),
        });
        if (merged.unsyncable !== undefined) {
          const entry = chorusList[merged.unsyncable];
          setSyncIssue({
            index: merged.unsyncable,
            voiceId: entry && entry.kind === "voice" ? entry.id : "",
            voiceName: entry?.name ?? "",
          });
          toast.error(`${t("pvv_chorus_unsyncable")}${entry ? ` (${entry.name})` : ""}`);
          return;
        }
        if (merged.overflow) {
          toast.error(t("pvv_chorus_too_long"));
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
            {participants.map((person, index) => (
              <div key={person.id}>
                <div className="mb-1 flex items-center gap-2">
                  <ParticipantAvatar
                    photoUrl={person.photoUrl}
                    label={participantLabel(person, index)}
                    size="sm"
                  />
                  <p className="text-xs font-medium">
                    {participantLabel(person, index)}
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                      {recordings[person.id]
                        ? t("pvv_recording_own")
                        : (assignments[person.id]?.name ?? t("pvv_no_voice"))}
                    </span>
                  </p>
                </div>
                <textarea
                  value={partOf(person, index)}
                  disabled={disabled}
                  rows={2}
                  onChange={(event) => editPart(person, event.target.value)}
                  className="w-full rounded-2xl border border-border/60 bg-background/70 p-3 text-sm outline-none transition focus:border-primary/60"
                />
              </div>
            ))}
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
          {chorusEntries.length > 0 && (
            <ul className="mt-2 grid gap-2">
              {chorusEntries.map((voice, index) => {
                const broken = syncIssue?.index === index;
                return (
                  <li
                    key={`${voice.kind}-${voice.kind === "voice" ? voice.id : voice.url}-${index}`}
                    className={`rounded-2xl border px-3 py-2 ${
                      broken
                        ? "border-destructive bg-destructive/5"
                        : "border-primary/40 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ParticipantAvatar
                        photoUrl={participants[index]?.photoUrl ?? null}
                        label={chorusLabel(index)}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] text-muted-foreground">
                          {chorusLabel(index)}
                        </span>
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
                      {voice.kind === "voice" && (
                      <button
                        type="button"
                        aria-label={t("pvv_remove")}
                        className="rounded-full p-1 text-muted-foreground transition hover:text-foreground"
                        onClick={() => {
                          const next = chorus.filter((v) => v.id !== voice.id);
                          setChorus(next);
                          persistSpeech({ chorusVoiceIds: next.map((v) => v.id) });
                          if (broken) {
                            setSyncIssue(null);
                            setShowRecommended(false);
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      )}
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
                  photoUrl={participants[syncIssue.index]?.photoUrl ?? null}
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
                    {t("pvv_sync_recommended_title")}
                  </p>
                  {recommended.length === 0 ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {t("pvv_sync_no_recommendations")}
                    </p>
                  ) : (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {recommended.map((voice) => (
                        <li
                          key={voice.id}
                          className="rounded-2xl border border-border/60 bg-background/60 p-3"
                        >
                          <p className="text-sm font-medium">{voice.displayName || voice.name}</p>
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
          onClick={() => setMode(mode === "own" ? null : "own")}
          className={`rounded-2xl border px-4 py-4 text-left transition disabled:opacity-60 ${
            mode === "own"
              ? "border-primary bg-primary/10"
              : "border-border/60 hover:border-primary/40"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Mic className="h-4 w-4 text-primary" />
            {t("pvv_option_own")}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t("pvv_option_own_note")}
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
      </div>

      {/* Female · Male · Children ---------------------------------------- */}
      {mode === "library" && (
        <div className="mt-5 scroll-mt-24" ref={libraryRef}>
          {replaceFor &&
            (() => {
              const index = participants.findIndex((p) => p.id === replaceFor);
              const person = participants[index] ?? participants[0]!;
              const label = participantLabel(person, index < 0 ? 0 : index);
              const current = assignments[person.id];
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
            })()}
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
                const inChorus = chorus.some((v) => v.id === voice.externalVoiceId);
                return (
                  <div
                    key={voice.id}
                    className={`rounded-2xl border bg-background/60 p-3 ${
                      inChorus ? "border-primary/60" : "border-border/60"
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
                        {speechMode === "chorus"
                          ? inChorus
                            ? t("pvv_remove")
                            : t("pvv_select")
                          : t("pvv_select")}
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

      {/* Record the greeting with your own voice -------------------------- */}
      {mode === "own" && (
        <RecordingStudio greeting={greeting} disabled={disabled} onReady={acceptRecording} />
      )}

      {/* My voices ------------------------------------------------------- */}
      {mode === "mine" && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
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
                  onClick={() => {
                    const only = participants[0];
                    const entry = { id: voice.id, name: voice.displayName };
                    if (participants.length === 1 && only) {
                      void givePersonal(only, entry);
                      return;
                    }
                    setPendingPersonal(entry);
                  }}
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

      {/* Who should this recording be assigned to? ----------------------- */}
      {pendingRecording && (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              {t("pvv_assign_recording_title")}
            </p>
            <button
              type="button"
              onClick={() => setPendingRecording(null)}
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
                onClick={() =>
                  void keepRecording(
                    person,
                    pendingRecording,
                    recordingChoice ?? {
                      permissionConfirmed: permissionForPending,
                      scope: "project",
                      displayName: participantLabel(person, index),
                    },
                  )
                }
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
          {participants.map((person, index) => {
            const chosen = assignments[person.id];
            const recording = recordings[person.id];
            const group = categoryOf(person);
            const waiting = Boolean(chosen) && !recording && !confirmed[person.id];
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
                    <span
                      className={
                        chosen || recording ? "font-medium text-primary" : "text-muted-foreground"
                      }
                    >
                      {recording
                        ? t("pvv_recording_own")
                        : chosen
                          ? chosen.name
                          : t("pvv_no_voice")}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {recording?.activeUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          void new Audio(recording.activeUrl!).play().catch(() => undefined)
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-[11px] transition hover:border-primary/50"
                      >
                        <Headphones className="h-3 w-3" />
                        {t("pvv_preview")}
                      </button>
                    )}
                    {recording && !recording.permissionConfirmed && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setRecordings((prev) => {
                            const current = prev[person.id];
                            if (!current) return prev;
                            return {
                              ...prev,
                              [person.id]: { ...current, permissionConfirmed: true },
                            };
                          });
                          void confirmPermission({
                            data: { projectId, personId: person.id, confirmed: true },
                          }).catch(() => undefined);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/50 px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/10 disabled:opacity-60"
                      >
                        <Check className="h-3 w-3" />
                        {t("pvv_permission_button")}
                      </button>
                    )}
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
                        : chosen || recording
                          ? t("pvv_replace")
                          : t("pvv_select")}
                    </button>
                    {(chosen || recording) && (
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

      {preparing && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>{t("pvv_processing")}</span>
        </div>
      )}
      {!preparing && prepared && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-xs">
          <Check className="h-4 w-4 text-primary" />
          <span>{t("pvv_processed")}</span>
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

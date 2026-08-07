// Client-safe rules for the recordings people speak themselves: what Project
// Joy keeps for every recording, how it is prepared, and everything that must
// be true before a greeting may be created.

import { speechBudgetSeconds, type PvgSpeechMode } from "./speech";

/** How far Project Joy has come with preparing one recording. */
export type PvgRecordingProcessing = "pending" | "processing" | "ready" | "failed";

/** Reserved for the personal voice of a participant, prepared for later. */
export type PvgVoiceModelStatus = "not_requested" | "queued" | "creating" | "ready" | "failed";

/** Which saved version of a recording is used in the finished greeting. */
export type PvgRecordingVersion = "original" | "processed" | "enhanced";

/** Everything Project Joy keeps about one participant's own recording. */
export interface PvgVoiceRecording {
  personId: string;
  language: string;
  durationSeconds: number;
  activeVersion: PvgRecordingVersion;
  /** The version currently used, ready to listen to. */
  activeUrl: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  enhancedUrl: string | null;
  processingStatus: PvgRecordingProcessing;
  processingError: string | null;
  voiceModelStatus: PvgVoiceModelStatus;
  voiceModelId: string | null;
  permissionConfirmed: boolean;
  permissionConfirmedAt: string | null;
}

/** One precise reason a greeting cannot be created yet. */
export interface PvgVoiceIssue {
  /** Translation key of the exact sentence shown to the person. */
  key: string;
  /** The participant the sentence speaks about. */
  name?: string;
}

export interface PvgVoiceCheckInput {
  speechMode: PvgSpeechMode | null;
  greeting: string;
  videoSeconds: number;
  chorusVoiceCount: number;
  /**
   * "One voice reads the entire greeting": the participant chosen to speak.
   * Nobody else needs a voice in that mode.
   */
  speakerId?: string | null;
  participants: {
    id: string;
    label: string;
    voiceId: string | null;
    partText: string;
    /** A voice from "My voices" counts exactly like a Project Joy voice. */
    personalVoiceId?: string | null;
  }[];
}

/**
 * Everything that must be true before Project Joy speaks a greeting. Each
 * failure is one exact sentence, naming the participant it belongs to.
 */
export function validateVoiceSetup(input: PvgVoiceCheckInput): PvgVoiceIssue[] {
  const issues: PvgVoiceIssue[] = [];
  const mode = input.speechMode;

  if (!mode) {
    issues.push({ key: "pvv_err_no_mode" });
    return issues;
  }
  if (input.greeting.trim().length < 2) {
    issues.push({ key: "pvv_err_no_greeting" });
  }
  if (input.participants.length === 0) {
    issues.push({ key: "pvv_err_no_participants" });
    return issues;
  }

  if (mode === "chorus") {
    if (input.chorusVoiceCount < 2) issues.push({ key: "pvv_err_chorus_min" });
    if (input.chorusVoiceCount > 5) issues.push({ key: "pvv_err_chorus_max" });
  }

  let speakers = input.participants;
  if (mode === "chorus") {
    speakers = [];
  } else if (mode === "single") {
    const only = input.participants.length === 1 ? input.participants : [];
    const chosen = input.participants.filter((p) => p.id === input.speakerId);
    speakers = chosen.length > 0 ? chosen : only;
    if (speakers.length === 0) {
      issues.push({ key: "pvv_err_no_speaker" });
      return issues;
    }
  }

  for (const person of speakers) {
    if (!person.voiceId && !person.personalVoiceId) {
      issues.push({ key: "pvv_err_no_voice_for", name: person.label });
    }
    const text = mode === "parts" ? person.partText.trim() : input.greeting.trim();
    if (!text) issues.push({ key: "pvv_err_no_text_for", name: person.label });
  }

  return issues;
}

/** Turns one issue into the exact sentence a person reads. */
export function voiceIssueText(issue: PvgVoiceIssue, t: (key: string) => string): string {
  return t(issue.key).replace("{name}", issue.name ?? "");
}

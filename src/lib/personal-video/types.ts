// Client-safe types and rules of the Personal Video Greeting section.

import type { PvsVideoSetup } from "./video-setup";
import type { PvgSpeechMode, PvgSyncMode, PvgVoiceSource } from "./voice/speech";
import type { PvgMusicSettings } from "@/lib/music/types";

/** Stored limit of the table. Older orders may still hold several people. */
export const PVG_MAX_PEOPLE = 5;
/**
 * A Personal Video Greeting has at most ONE specially added person — the one
 * who later speaks the greeting. Everybody else visible in the picture simply
 * belongs to the described scene.
 */
export const PVG_MAX_ADDED_PEOPLE = 1;
/** No project ever includes more than five free starting-scene creations. */
export const PVG_MAX_GENERATIONS = 5;
/** Cost of one additional starting scene beyond the included ones. */
export const PVG_EXTRA_SCENE_CREDITS = 1;

/** One paid package of starting-scene attempts unlocks three generations. */
export const PVG_SCENE_ATTEMPTS_PER_PACK = 3;
/** Price of one package of starting-scene attempts, in credits. */
export const PVG_SCENE_PACK_CREDITS = 5;

export interface PvgSceneAttempts {
  used: number;
  packs: number;
  allowed: number;
  remaining: number;
}

/** How many starting-scene attempts of the current package are still left. */
export function pvgSceneAttempts(used: number, packs: number): PvgSceneAttempts {
  const allowed = Math.max(0, packs) * PVG_SCENE_ATTEMPTS_PER_PACK;
  return { used, packs, allowed, remaining: Math.max(0, allowed - used) };
}

/**
 * Included starting scenes: one more than the number of people, never more
 * than five.
 */
export function pvgIncludedGenerations(peopleCount: number): number {
  return Math.min(PVG_MAX_GENERATIONS, Math.max(1, peopleCount) + 1);
}

export type PvgFaceQuality = "good" | "low" | "unknown";

/**
 * "speaker" — the one person the customer specially added; they deliver the
 * greeting in the finished film. "narrator" — no person was added, so the
 * greeting is only heard as a voice-over over the scene.
 */
export type PvgPersonRole = "speaker" | "narrator";

export interface PvgPerson {
  /** Internal reference only — never shown to the person using the site. */
  id: string;
  name: string;
  position: number;
  /** Specially added person, or the invisible voice of the greeting. */
  role: PvgPersonRole;
  /** Words describing the person when no photo was uploaded. */
  appearanceDescription: string;
  photoUrl: string | null;
  faceQuality: PvgFaceQuality;
  source: "individual" | "group";
  extraPhotoCount: number;
  /** The exact voice that speaks for this participant, kept with the order. */
  voiceId: string | null;
  voiceName: string | null;
  /** A Project Joy voice or the participant's own recording. */
  voiceSource: PvgVoiceSource | null;
  /**
   * The voice group this participant belongs to. Project Joy only ever
   * suggests and assigns voices from this very group.
   */
  voiceCategory: "female" | "male" | "children" | null;
  /** True once the person has listened to the voice and kept it. */
  voiceConfirmed: boolean;
  /** The personal voice ("My voices" or this project only) assigned here. */
  personalVoiceId: string | null;
  /** The part of the greeting this participant speaks. */
  partText: string;
  recordingUrl: string | null;
  recordingDurationSeconds: number;
}

export type PvgSceneStatus = "pending" | "processing" | "ready" | "failed";

export interface PvgScene {
  id: string;
  variationIndex: number;
  status: PvgSceneStatus;
  imageUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface PvgProject {
  id: string;
  recipientName: string;
  occasion: string;
  sceneDescription: string;
  /** "What happens in the video?" — the actions during the finished film. */
  actionDescription: string;
  status: string;
  generationsUsed: number;
  generationsLimit: number;
  creditsCharged: number;
  /** Paid packages of three starting-scene attempts bought for this order. */
  scenePacks: number;
  selectedSceneId: string | null;
  updatedAt: string;
  createdAt: string;
  /** Which page of the workflow the person stopped on. */
  workflowStep: "scene" | "video";
  orderCost: number;
  /** Number of the latest successful automatic save. */
  version: number;
  lastSavedAt: string;
  creditHistory: { at: string; amount: number; reason: string; balanceAfter?: number }[];
  /** Settings of the second page: length and greeting of the future video. */
  videoSetup: PvsVideoSetup;
  /** How the greeting is spoken and, when several voices speak, their timing. */
  speechMode: PvgSpeechMode;
  syncMode: PvgSyncMode;
  chorusVoiceIds: string[];
  /** The one participant who speaks the whole greeting in "one voice" mode. */
  speakerPersonId: string | null;
  /** Background music of the whole video. It never costs a credit. */
  music: PvgMusicSettings;
  /** Optional quiet life of the picture: wind, water, a room, a street. */
  sceneSounds: boolean;
  people: PvgPerson[];
  scenes: PvgScene[];
}

/** Pricing depends only on the number of people: one person, one credit. */
export function pvgPriceCredits(peopleCount: number): number {
  return Math.min(PVG_MAX_PEOPLE, Math.max(1, peopleCount));
}

/** Only the specially added people — never the invisible voice of a scene. */
export function addedPeople<T extends { role?: PvgPersonRole }>(people: T[]): T[] {
  return people.filter((p) => (p.role ?? "speaker") === "speaker");
}

export type PvgIssueField =
  | "recipientName"
  | "occasion"
  | "sceneDescription"
  | "people"
  | "generations"
  | "credits";

export interface PvgIssue {
  field: PvgIssueField;
  /** Translation key of the message shown next to the field. */
  key: string;
}

/**
 * The project is checked continuously — on the page after every change and
 * again on the server before a paid request ever leaves the building.
 */
export function validatePvgProject(
  project: {
    recipientName: string;
    occasion: string;
    sceneDescription: string;
    generationsUsed: number;
    generationsLimit: number;
    creditsCharged: number;
    scenePacks?: number;
    people: {
      name: string;
      photoUrl: string | null;
      faceQuality: PvgFaceQuality;
      role?: PvgPersonRole;
      appearanceDescription?: string;
    }[];
  },
  balance: number,
): PvgIssue[] {
  const issues: PvgIssue[] = [];
  // Only the specially added person is checked here. People who merely appear
  // because the customer described them are part of the scene, not of this list.
  const people = addedPeople(project.people);
  // The name of the person receiving the greeting and the occasion are
  // optional: the starting scene is built from the scene description alone.
  if (project.sceneDescription.trim().length < 15) {
    issues.push({ field: "sceneDescription", key: "pvg_err_description" });
  }
  if (people.length > PVG_MAX_ADDED_PEOPLE) {
    issues.push({ field: "people", key: "pvg_err_people_max" });
  }
  // A specially added person is either a photo or a description — never neither.
  if (people.some((p) => !p.photoUrl && !(p.appearanceDescription ?? "").trim())) {
    issues.push({ field: "people", key: "pvg_err_people_photo" });
  }
  if (people.some((p) => p.photoUrl && p.faceQuality === "low")) {
    issues.push({ field: "people", key: "pvg_err_people_quality" });
  }
  // Starting scenes are paid for in packages of three. A generation itself is
  // free while the current package still holds an attempt.
  const attempts = pvgSceneAttempts(project.generationsUsed, project.scenePacks ?? 0);
  if (attempts.remaining <= 0) {
    issues.push({ field: "generations", key: "pvg_attempts_empty" });
    if (balance < PVG_SCENE_PACK_CREDITS) {
      issues.push({ field: "credits", key: "pvg_err_credits" });
    }
  }
  return issues;
}

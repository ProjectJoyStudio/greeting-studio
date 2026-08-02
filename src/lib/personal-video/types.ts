// Client-safe types and rules of the Personal Video Greeting section.

import type { PvsVideoSetup } from "./video-setup";

/** Standard projects hold up to five people. Premium raises this later. */
export const PVG_MAX_PEOPLE = 5;
/** No project ever includes more than five free starting-scene creations. */
export const PVG_MAX_GENERATIONS = 5;
/** Cost of one additional starting scene beyond the included ones. */
export const PVG_EXTRA_SCENE_CREDITS = 1;

/**
 * Included starting scenes: one more than the number of people, never more
 * than five.
 */
export function pvgIncludedGenerations(peopleCount: number): number {
  return Math.min(PVG_MAX_GENERATIONS, Math.max(1, peopleCount) + 1);
}

export type PvgFaceQuality = "good" | "low" | "unknown";

export interface PvgPerson {
  /** Internal reference only — never shown to the person using the site. */
  id: string;
  name: string;
  position: number;
  photoUrl: string | null;
  faceQuality: PvgFaceQuality;
  source: "individual" | "group";
  extraPhotoCount: number;
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
  status: string;
  generationsUsed: number;
  generationsLimit: number;
  creditsCharged: number;
  selectedSceneId: string | null;
  updatedAt: string;
  /** Settings of the second page: length and greeting of the future video. */
  videoSetup: PvsVideoSetup;
  people: PvgPerson[];
  scenes: PvgScene[];
}

/** Pricing depends only on the number of people: one person, one credit. */
export function pvgPriceCredits(peopleCount: number): number {
  return Math.min(PVG_MAX_PEOPLE, Math.max(1, peopleCount));
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
    people: { name: string; photoUrl: string | null; faceQuality: PvgFaceQuality }[];
  },
  balance: number,
): PvgIssue[] {
  const issues: PvgIssue[] = [];
  if (project.recipientName.trim().length < 2) {
    issues.push({ field: "recipientName", key: "pvg_err_recipient" });
  }
  if (project.occasion.trim().length < 2) {
    issues.push({ field: "occasion", key: "pvg_err_occasion" });
  }
  if (project.sceneDescription.trim().length < 15) {
    issues.push({ field: "sceneDescription", key: "pvg_err_description" });
  }
  if (project.people.length < 1) {
    issues.push({ field: "people", key: "pvg_err_people_min" });
  }
  if (project.people.length > PVG_MAX_PEOPLE) {
    issues.push({ field: "people", key: "pvg_err_people_max" });
  }
  if (project.people.some((p) => !p.photoUrl)) {
    issues.push({ field: "people", key: "pvg_err_people_photo" });
  }
  if (project.people.some((p) => p.faceQuality === "low")) {
    issues.push({ field: "people", key: "pvg_err_people_quality" });
  }
  const included = pvgIncludedGenerations(project.people.length);
  const needsExtra = project.generationsUsed >= included;
  const price =
    (project.creditsCharged === 0 ? pvgPriceCredits(project.people.length) : 0) +
    (needsExtra ? PVG_EXTRA_SCENE_CREDITS : 0);
  if (price > 0 && balance < price) {
    issues.push({ field: "credits", key: "pvg_err_credits" });
  }
  return issues;
}
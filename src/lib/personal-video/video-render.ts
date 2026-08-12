// Client-safe shapes of the finished personal video greeting.

export type PvgVideoStatus =
  | "pending"
  | "processing"
  | "lipsync"
  | "assets"
  | "ready"
  | "failed"
  | "lipsync_failed";

/** Which of the two stages one film is in. */
export type PvgVideoStage = "silent_video" | "lipsync" | "done";

/** Technical facts about one film — shown only in Admin / Test Mode. */
export interface PvgVideoTech {
  stage: PvgVideoStage;
  videoGenerator: string | null;
  videoModel: string | null;
  videoPredictionId: string | null;
  videoResolution: string | null;
  videoAudioEnabled: boolean;
  videoCostUsd: number;
  lipsyncGenerator: string | null;
  lipsyncModel: string | null;
  lipsyncPredictionId: string | null;
  lipsyncActiveSpeaker: boolean | null;
  lipsyncCostUsd: number;
  totalCostUsd: number;
}

/** Every further film of the same order costs this fixed number of credits. */
export const PVR_REGENERATION_CREDITS = 5;

export interface PvgVideoJob {
  id: string;
  status: PvgVideoStatus;
  durationSeconds: number;
  sceneSounds: boolean;
  creditsCharged: number;
  videoUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  /** Variant 1, 2, 3 … of the very same personal video greeting. */
  variantIndex: number;
  /** True for the variant the customer currently prefers. */
  isSelected: boolean;
  /** The "what happens in the video?" words this variant was made from. */
  actionDescription: string;
  /** Only for administrators and technical testing. */
  tech: PvgVideoTech;
}

/** True while the film is still being made somewhere in the background. */
export function isPvgVideoRunning(job: PvgVideoJob | null): boolean {
  return Boolean(
    job &&
      (job.status === "pending" ||
        job.status === "processing" ||
        job.status === "lipsync" ||
        job.status === "assets"),
  );
}

/** Translation key of the plain sentence shown under the picture. */
export function pvgVideoStatusKey(status: PvgVideoStatus): string {
  switch (status) {
    case "pending":
      return "pvr_status_preparing";
    case "processing":
      return "pvr_status_generating";
    case "lipsync":
      return "pvr_status_lipsync";
    case "assets":
      return "pvr_status_assets";
    case "ready":
      return "pvr_status_ready";
    case "lipsync_failed":
      return "pvr_status_lipsync_failed";
    default:
      return "pvr_status_failed";
  }
}
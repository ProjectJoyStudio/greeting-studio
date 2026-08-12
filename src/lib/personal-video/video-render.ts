// Client-safe shapes of the finished personal video greeting.

export type PvgVideoStatus = "pending" | "processing" | "assets" | "ready" | "failed";

/** Technical facts about one film — shown only in Admin / Test Mode. */
export interface PvgVideoTech {
  generator: string | null;
  model: string | null;
  predictionId: string | null;
  /** Length of the finished greeting voice the engine animated, in seconds. */
  audioSeconds: number;
  /** The one participant who speaks in this film. */
  speakerPersonId: string | null;
  costUsd: number;
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
    job && (job.status === "pending" || job.status === "processing" || job.status === "assets"),
  );
}

/** Translation key of the plain sentence shown under the picture. */
export function pvgVideoStatusKey(status: PvgVideoStatus): string {
  switch (status) {
    case "pending":
      return "pvr_status_preparing";
    case "processing":
      return "pvr_status_generating";
    case "assets":
      return "pvr_status_assets";
    case "ready":
      return "pvr_status_ready";
    default:
      return "pvr_status_failed";
  }
}

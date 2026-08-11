// Client-safe shapes of the finished personal video greeting.

export type PvgVideoStatus = "pending" | "processing" | "assets" | "ready" | "failed";

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
}

/** True while the film is still being made somewhere in the background. */
export function isPvgVideoRunning(job: PvgVideoJob | null): boolean {
  return Boolean(job && (job.status === "pending" || job.status === "processing" || job.status === "assets"));
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
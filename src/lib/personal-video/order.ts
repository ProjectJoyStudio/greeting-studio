// Client-safe rules of the single Personal Video Greeting order: statuses,
// retention window and the wording of the save indicator.

export type PvgOrderStatus =
  | "creating_scene"
  | "preparing_video"
  | "draft"
  | "video_generation"
  | "completed"
  | "deleted_by_user"
  | "restored_by_admin"
  | "permanently_deleted";

export const PVG_STATUS_KEY: Record<PvgOrderStatus, string> = {
  creating_scene: "pvo_status_creating_scene",
  preparing_video: "pvo_status_preparing_video",
  draft: "pvo_status_draft",
  video_generation: "pvo_status_video_generation",
  completed: "pvo_status_completed",
  deleted_by_user: "pvo_status_deleted_by_user",
  restored_by_admin: "pvo_status_restored_by_admin",
  permanently_deleted: "pvo_status_permanently_deleted",
};

export function normalizeStatus(value: string | null | undefined): PvgOrderStatus {
  return value && value in PVG_STATUS_KEY ? (value as PvgOrderStatus) : "draft";
}

export type PvgWorkflowStep = "scene" | "video";

export function normalizeStep(value: string | null | undefined): PvgWorkflowStep {
  return value === "video" ? "video" : "scene";
}

/** Administrators may keep deleted drafts for one, two or three days. */
export const PVG_RETENTION_OPTIONS = [1, 2, 3] as const;
export const PVG_DEFAULT_RETENTION_DAYS = 3;

export function clampRetentionDays(value: unknown): number {
  const n = Number(value);
  return PVG_RETENTION_OPTIONS.includes(Math.round(n) as 1 | 2 | 3)
    ? Math.round(n)
    : PVG_DEFAULT_RETENTION_DAYS;
}

/** "2 days 4 hours" — the live countdown next to every deleted draft. */
export function countdown(
  purgeAfter: string | null,
  now = Date.now(),
): { days: number; hours: number; expired: boolean } {
  if (!purgeAfter) return { days: 0, hours: 0, expired: true };
  const ms = new Date(purgeAfter).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return { days: 0, hours: 0, expired: true };
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    expired: false,
  };
}

export type SaveState = "idle" | "saving" | "saved" | "failed";

/** One entry of the permanent credit history kept inside the order. */
export interface PvgCreditEntry {
  at: string;
  amount: number;
  reason: string;
  balanceAfter?: number;
}

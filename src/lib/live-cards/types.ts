// Client-safe types shared by the Live Greeting Cards section.

export type LiveCardSource = "generated" | "upload";

export interface LiveCardAsset {
  id: string;
  status: string;
  prompt: string;
  /** English wording actually sent to the engine — never shown to the person. */
  promptEnglish: string | null;
  /** Groups every version created in one live greeting card session. */
  sessionId: string | null;
  aspectRatio: string | null;
  generatorKey: string | null;
  /** True when this is the chosen source picture for the animation step. */
  selected: boolean;
  source: LiveCardSource;
  createdAt: string;
  /** Signed, renderable URL resolved at read time. */
  imageUrl: string | null;
  /** Reserved for the animation phase. */
  durationSeconds: number | null;
  priceCredits: number | null;
  videoUrl: string | null;
  videoStatus: string | null;
}

export type LiveCardResult =
  | { ok: true; card: LiveCardAsset }
  | { ok: false; errorCode: string; errorMessage: string };

/** Aspect ratios offered by the Live Greeting Cards composer. */
export const LIVE_CARD_RATIOS = ["1:1", "4:5", "9:16", "16:9"] as const;
export type LiveCardRatio = (typeof LIVE_CARD_RATIOS)[number];

/** Reserved for the next phase — durations are shown but not selectable yet. */
export const PLANNED_VIDEO_DURATIONS = [5, 10, 15] as const;
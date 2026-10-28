/** One live engine, one clock. Never advance a busy, hidden or enlarged reader. */
export function autoTurnAction(state: {
  position: number;
  faceCount: number;
  ready: boolean;
  turning: boolean;
  frozen: boolean;
  hidden: boolean;
}): "wait" | "stop" | "next" {
  if (state.position >= state.faceCount - 1) return "stop";
  if (!state.ready || state.turning || state.frozen || state.hidden) return "wait";
  return "next";
}

export function viewerPageWidth(width: number, height: number, portrait: boolean): number {
  const widthLimit = Math.min(portrait ? width : Math.floor(width / 2), portrait ? 420 : 460);
  const heightLimit = height > 0 ? Math.floor(height * 3 / 4) : widthLimit;
  return Math.max(1, Math.min(widthLimit, heightLimit));
}
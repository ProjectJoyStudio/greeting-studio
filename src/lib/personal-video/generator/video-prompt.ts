// The words Project Joy sends to the silent-video stage together with the
// approved starting scene.
//
// Stage one only brings the picture to life: no voice is sent to it and no
// speech is asked for. The lip movement of the person who really speaks is
// added afterwards by the lip-sync stage, which works on faces, not on words.

export type PvgPromptSpeechMode = "single" | "parts" | "chorus";

export interface PvgVideoPromptInput {
  /** "What happens in the video?" — the actions during the film. */
  actionDescription: string;
  occasion: string;
  speechMode: PvgPromptSpeechMode;
  /** Names in speaking order; for one voice, the single chosen speaker. */
  speakerNames: string[];
  /** Everyone in the picture who does not speak in this mode. */
  silentNames: string[];
}

/** The natural way a greeting film behaves unless the customer says otherwise. */
export const PVG_DEFAULT_ACTION_DESCRIPTION =
  "All participants look toward the camera and warmly congratulate the viewer. They smile and make natural small gestures. They are speaking to the viewer, not to each other.";

function list(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

function speakingRule(input: PvgVideoPromptInput): string {
  const speakers = list(input.speakerNames);
  const silent = list(input.silentNames);
  const quiet = silent
    ? ` ${silent} listen warmly: they smile, blink, breathe and react with small natural movements.`
    : "";
  const attention = speakers
    ? `${speakers} face the camera with a warm, lively expression.`
    : "The people face the camera with warm, lively expressions.";
  return `${attention}${quiet}`;
}

/** One plain instruction for the silent stage, built from the customer's words. */
export function buildVideoPrompt(input: PvgVideoPromptInput): string {
  const action = input.actionDescription.trim() || PVG_DEFAULT_ACTION_DESCRIPTION;
  const occasion = input.occasion.trim();
  return [
    action,
    occasion ? `A warm, premium celebration film for ${occasion}.` : "",
    speakingRule(input),
    "The people are congratulating the viewer watching the video: they look toward the camera while speaking and never treat another person inside the picture as the person receiving the greeting.",
    "Everyone keeps the exact face, identity, clothing, position and setting of the picture. Natural blinking, subtle head movement, gentle hand and body gestures, soft background and camera motion.",
    "No talking, no lip movement, no speech, no singing, no music, no text on screen.",
  ]
    .filter(Boolean)
    .join(" ");
}

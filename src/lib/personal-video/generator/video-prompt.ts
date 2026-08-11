// The words Project Joy sends to the moving-picture engine together with the
// approved starting scene and the greeting audio.
//
// OmniHuman 1.5 accepts one picture, one speech recording and one written
// instruction. It offers no separate control for individual speakers, so the
// speaking behaviour of several people can only be asked for in words.

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
    ? ` ${silent} do not speak and do not move their lips: they only smile, blink, breathe and react with small natural movements.`
    : "";
  switch (input.speechMode) {
    case "parts":
      return speakers
        ? `The greeting is spoken in turn: ${speakers}, in this order. Only the person whose voice is heard at that moment moves their lips; everyone else keeps their mouth closed and simply listens warmly.${quiet}`
        : `Only the person whose voice is heard moves their lips; everyone else keeps their mouth closed.${quiet}`;
    case "chorus":
      return speakers
        ? `${speakers} speak the greeting together, at the same time, with matching lip movement.${quiet}`
        : `The chosen participants speak the greeting together.${quiet}`;
    default:
      return speakers
        ? `Only ${speakers} speaks the whole greeting and moves their lips.${quiet}`
        : `Only one person speaks the whole greeting and moves their lips.${quiet}`;
  }
}

/** One plain instruction for the engine, built from the customer's own words. */
export function buildVideoPrompt(input: PvgVideoPromptInput): string {
  const action = input.actionDescription.trim() || PVG_DEFAULT_ACTION_DESCRIPTION;
  const occasion = input.occasion.trim();
  return [
    action,
    occasion ? `A warm, premium celebration film for ${occasion}.` : "",
    speakingRule(input),
    "The people are congratulating the viewer watching the video: they look toward the camera while speaking and never treat another person inside the picture as the person receiving the greeting.",
    "Everyone keeps the exact appearance, clothing and setting of the picture. The lips follow the given speech recording precisely. Gentle natural motion, cinematic lighting, no text on screen, no invented speech, no singing.",
  ]
    .filter(Boolean)
    .join(" ");
}

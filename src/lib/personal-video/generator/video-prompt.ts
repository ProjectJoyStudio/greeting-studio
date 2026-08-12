// The English scene control Project Joy sends to the final-video engine
// together with the approved starting scene and the finished greeting voice.
//
// The engine never writes the greeting and never speaks it: it only animates
// the picture so that the ONE chosen participant delivers the voice it was
// given. Everyone else stays in the scene and only reacts. The control text is
// always written in English, whatever language the greeting itself is in.

export interface PvgVideoPromptInput {
  /** "What happens in the video?" — the actions during the film. */
  actionDescription: string;
  occasion: string;
  /** The single participant who speaks the whole greeting. */
  speakerName: string;
  /** Everyone else in the picture; they never speak. */
  silentNames: string[];
}

/** The natural way a greeting film behaves unless the customer says otherwise. */
export const PVG_DEFAULT_ACTION_DESCRIPTION =
  "The participants look toward the camera and warmly congratulate the viewer. They smile and make natural small gestures. They are speaking to the viewer, not to each other.";

function list(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

/** One plain English instruction, built from the customer's own words. */
export function buildVideoPrompt(input: PvgVideoPromptInput): string {
  const action = input.actionDescription.trim() || PVG_DEFAULT_ACTION_DESCRIPTION;
  const occasion = input.occasion.trim();
  const speaker = input.speakerName.trim() || "the person in the foreground";
  const others = list(input.silentNames);
  return [
    action,
    occasion ? `A warm, premium celebration film for ${occasion}.` : "",
    `Only ${speaker} speaks. ${speaker} delivers the entire spoken greeting, with lip movement matching the given audio exactly.`,
    others
      ? `${others} remain completely silent: their mouths stay naturally closed apart from a natural smile, they never mouth or repeat the spoken words, and they never speak. They may smile, blink, breathe, move their heads and bodies naturally and react warmly to the greeting.`
      : "",
    "The greeting is addressed to the viewer watching the video: the participants look toward the camera and never treat another person inside the picture as the person receiving the greeting, unless the described scene requires otherwise.",
    "Everyone keeps the exact face, identity, clothing, position and setting of the picture. Soft, natural camera and background motion.",
    "No text on screen, no subtitles, no added music.",
  ]
    .filter(Boolean)
    .join(" ");
}

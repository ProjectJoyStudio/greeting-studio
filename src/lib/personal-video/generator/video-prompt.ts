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
  /** The single participant who speaks the whole greeting. */
  speakerName: string;
  /** Everyone else in the picture; they never speak. */
  silentNames: string[];
  /** Where the speaker stands, counted from the left, starting at 0. */
  speakerIndex?: number;
  /** How many participants are visible in the approved picture. */
  totalPeople?: number;
}

/** The natural way a greeting film behaves unless the customer says otherwise. */
export const PVG_DEFAULT_ACTION_DESCRIPTION =
  "The participants look toward the camera and warmly congratulate the viewer. They smile and make natural small gestures. They are speaking to the viewer, not to each other.";

// Kling documents `prompt` as a positive prompt. Mentioning captions, letters,
// logos or other writing there — even to negate them — can make those visual
// concepts appear in the generated frames. Keep writing-related requests out
// of this field; the approved source image remains the visual source of truth.
const WRITING_DIRECTION =
  /\b(text|caption|subtitle|translation|title|lettering|letters?|words?|writing|inscription|sign|banner|poster|label|logo|watermark)\b|текст|надпис|подпис|букв|слова|плакат|баннер|банер|вывеск|вивіск|літер|логотип|schrift|beschriftung|aufschrift|buchstaben|texte|lettres|affiche|pancarte|tekst|napis|litery/i;

function motionOnly(description: string): string {
  return description
    .split(/(?<=[.!?;])\s+|\s*[,;]\s*/u)
    .filter((part) => !WRITING_DIRECTION.test(part))
    .join(". ")
    .trim();
}

function list(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

/** Where the chosen participant is standing, in plain English. */
export function positionPhrase(index: number, total: number): string {
  if (total <= 1 || index < 0 || index >= total) return "";
  if (index === 0) return "the person on the left";
  if (index === total - 1) return "the person on the right";
  if (total === 3) return "the person in the centre";
  return `the ${index + 1}${index + 1 === 2 ? "nd" : index + 1 === 3 ? "rd" : "th"} person from the left`;
}

/** One plain English instruction, built from the customer's own words. */
export function buildVideoPrompt(input: PvgVideoPromptInput): string {
  const action = motionOnly(input.actionDescription.trim()) || PVG_DEFAULT_ACTION_DESCRIPTION;
  const total = input.totalPeople ?? input.silentNames.length + 1;
  const where = positionPhrase(input.speakerIndex ?? -1, total);
  // A personal name can be interpreted as a request to render that name.
  // Position alone identifies the speaker without introducing printable text.
  const speaker = where || "the person in the foreground";
  const others = list(input.silentNames);
  return [
    action,
    `Only ${speaker} moves their lips, and only while the given audio contains speech. Their lip movement matches that speech exactly. When the speech ends, they close their mouth and stop speaking, while the same scene continues naturally and calmly to the very end of the video: they keep smiling, blinking, breathing, looking toward the camera and making small natural head and body movements. The video never freezes, never cuts and never ends early.`,
    others
      ? `${others} remain completely silent: their mouths stay naturally closed apart from a natural smile, they never mouth or repeat the spoken words, and they never speak. They may smile, blink, breathe, move their heads and bodies naturally and react warmly to the greeting.`
      : "",
    "The performance is directed toward the viewer watching the video: the participants look toward the camera and never treat another person inside the picture as the audience, unless the described scene requires otherwise.",
    "Preserve every visual element of the approved source picture exactly. Animate only natural lip movement, facial expression, breathing, small body gestures, and subtle camera or background motion. The frame remains a faithful moving version of the source picture from beginning to end, with no new visual elements.",
    "No added music.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The English scene control for a film whose picture contains no added
 * speaking participant. The scene itself is animated and the finished
 * greeting is simply heard over it; nobody in the picture speaks.
 */
export function buildScenePrompt(actionDescription: string): string {
  const action = motionOnly(actionDescription.trim()) || PVG_DEFAULT_SCENE_ACTION_DESCRIPTION;
  return [
    action,
    "Animate the approved source picture gently and naturally: soft camera motion, light, air, water, foliage, fabric and other elements of the scene move calmly and believably from beginning to end. The video never freezes, never cuts and never ends early.",
    "Nobody in the picture speaks and no mouth moves as if speaking. The audio is a voice heard over the scene, not spoken by anyone visible.",
    "Preserve every visual element of the approved source picture exactly, with no new visual elements.",
    "No added music.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** How a picture without a speaking participant behaves by default. */
export const PVG_DEFAULT_SCENE_ACTION_DESCRIPTION =
  "The scene comes gently to life with calm, natural movement and a slow, subtle camera motion.";

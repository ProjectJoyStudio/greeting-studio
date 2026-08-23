// Server-only helpers of the video preparation page: Project Joy writes and
// re-shapes greetings so they comfortably fit the chosen video length.

import { greetingFit, safeWordLimit, clampDuration } from "./video-setup";
import { PVG_VOICE_MAX_CHARS } from "./voice/catalog";

export type GreetingTask = "compose" | "shorten" | "expand";

interface ComposeArgs {
  task: GreetingTask;
  text: string;
  keywords: string;
  recipientName: string;
  occasion: string;
  durationSeconds: number;
  language: string;
}

const INSTRUCTION: Record<GreetingTask, string> = {
  compose:
    "Write one warm, personal spoken greeting from the given details. Natural, heartfelt, never generic filler.",
  shorten:
    "Shorten the given greeting so it can be spoken calmly within the time limit. Keep the warmest wording and every name.",
  expand:
    "Gently expand the given greeting so it fills the time limit. Keep the same voice, add warmth and detail, never repeat sentences.",
};

/** Every language Project Joy speaks, by code and by name. */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
  de: "German",
  uk: "Ukrainian",
  fr: "French",
  pl: "Polish",
};

/** Accepts either a language code ("ru") or a language name ("Russian"). */
function languageName(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "English";
  const code = raw.slice(0, 2).toLowerCase();
  if (raw.length <= 5 && LANGUAGE_NAMES[code]) return LANGUAGE_NAMES[code]!;
  return raw;
}

/** The greeting never exceeds what one voice request can carry. */
function capLength(text: string): string {
  return text.length > PVG_VOICE_MAX_CHARS ? text.slice(0, PVG_VOICE_MAX_CHARS).trim() : text;
}

/** Simple, dependable fallback when no writing service is reachable. */
function localFallback(args: ComposeArgs): string {
  const target = safeWordLimit(clampDuration(args.durationSeconds));
  const base =
    args.text.trim() ||
    [args.recipientName && `${args.recipientName},`, args.occasion, args.keywords]
      .filter(Boolean)
      .join(" ");
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length > target) return words.slice(0, target).join(" ");
  return base;
}

export async function writeGreeting(args: ComposeArgs): Promise<string> {
  const duration = clampDuration(args.durationSeconds);
  const fit = greetingFit(args.text, duration);
  const language = languageName(args.language);

  const system =
    "You are the writer of Project Joy. You write greetings that are spoken aloud in a personal video. " +
    "Reply with the greeting text only — no quotes, no titles, no notes, no emoji. " +
    `Write the whole greeting in this language only: ${language}. ` +
    "Use the natural script and punctuation of that language, and never mix languages. " +
    `The greeting must take about ${duration} seconds to speak aloud, which is roughly ${fit.target} words ` +
    `(between ${fit.min} and ${fit.max} words), and must stay under ${PVG_VOICE_MAX_CHARS} characters.`;

  const details = [
    args.recipientName ? `Recipient: ${args.recipientName}` : "",
    args.occasion ? `Occasion: ${args.occasion}` : "",
    args.keywords ? `Keywords, wishes and emotions: ${args.keywords}` : "",
    args.text ? `Current greeting: ${args.text}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { completeText } = await import("@/lib/ai/text-engine.server");
    const out = (
      await completeText(
        {
          functionId: "personal_video.greeting_text",
          system: `${system}\n${INSTRUCTION[args.task]}`,
          user: details || "Write a warm general greeting.",
        },
        [
          "gemini_25_flash",
          "replicate_gemini_25_flash",
          "rw_gemini_3_flash",
          "rw_gemini_31_flash_lite",
        ],
      )
    ).trim();
    return capLength(out && out.length > 0 ? out : localFallback(args));
  } catch {
    return capLength(localFallback(args));
  }
}

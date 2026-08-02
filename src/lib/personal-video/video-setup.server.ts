// Server-only helpers of the video preparation page: Project Joy writes and
// re-shapes greetings so they comfortably fit the chosen video length.

import { greetingFit, PVS_WORDS_PER_SECOND, clampDuration } from "./video-setup";

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

/** Simple, dependable fallback when no writing service is reachable. */
function localFallback(args: ComposeArgs): string {
  const target = Math.round(clampDuration(args.durationSeconds) * PVS_WORDS_PER_SECOND);
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
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) return localFallback(args);

  const system =
    "You are the writer of Project Joy. You write greetings that are spoken aloud in a personal video. " +
    "Reply with the greeting text only — no quotes, no titles, no notes, no emoji. " +
    `Write in this language: ${args.language}. ` +
    `The greeting must take about ${duration} seconds to speak aloud, which is roughly ${fit.target} words ` +
    `(between ${fit.min} and ${fit.max} words).`;

  const details = [
    args.recipientName ? `Recipient: ${args.recipientName}` : "",
    args.occasion ? `Occasion: ${args.occasion}` : "",
    args.keywords ? `Keywords, wishes and emotions: ${args.keywords}` : "",
    args.text ? `Current greeting: ${args.text}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `${system}\n${INSTRUCTION[args.task]}` },
          { role: "user", content: details || "Write a warm general greeting." },
        ],
      }),
    });
    if (!res.ok) return localFallback(args);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = json.choices?.[0]?.message?.content?.trim();
    return out && out.length > 0 ? out : localFallback(args);
  } catch {
    return localFallback(args);
  }
}

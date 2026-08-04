// Server-only helper: a greeting that would take longer to speak than the
// video allows is quietly shortened, keeping its meaning and every name.

import { PVS_WORDS_PER_SECOND } from "../video-setup";

/** Words that comfortably fit into the time left for speech. */
function wordBudget(budgetSeconds: number): number {
  return Math.max(4, Math.floor(budgetSeconds * PVS_WORDS_PER_SECOND));
}

function trimWords(text: string, words: number): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= words) return text.trim();
  return `${parts.slice(0, words).join(" ").replace(/[,;:—-]$/, "")}.`;
}

export async function shortenToBudget(
  text: string,
  budgetSeconds: number,
  language: string,
): Promise<string> {
  const clean = text.trim();
  const words = wordBudget(budgetSeconds);
  if (!clean || clean.split(/\s+/).length <= words) return clean;

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return trimWords(clean, words);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You shorten spoken greetings for Project Joy. Keep the meaning, the warmth and every name. " +
              `Answer with the greeting only, in the same language as the input (${language}), ` +
              `using at most ${words} words.`,
          },
          { role: "user", content: clean },
        ],
      }),
    });
    if (!res.ok) return trimWords(clean, words);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = json.choices?.[0]?.message?.content?.trim();
    return trimWords(out && out.length > 1 ? out : clean, words);
  } catch {
    return trimWords(clean, words);
  }
}
// Greeting-card entry point into the universal Project Joy translation layer.
// Kept as a thin wrapper so existing callers stay unchanged.

import { translatePromptToEnglish } from "@/lib/ai/prompt-translate.server";

/** Returns an English prompt suitable for the image engine. */
export async function toEnglishImagePrompt(prompt: string): Promise<string> {
  return (await translatePromptToEnglish(prompt, "image")).english;
}

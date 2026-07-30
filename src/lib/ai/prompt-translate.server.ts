// ---------------------------------------------------------------------------
// Project Joy — universal prompt translation layer.
//
// Every generator (pictures today, animation / voice / video later) sends its
// user-written instruction through this module first. The person always writes
// and always sees their own language; generators only ever receive English.
// The English text is never shown in the interface.
// ---------------------------------------------------------------------------

export type PromptKind = "image" | "animation" | "text";

export interface TranslatedPrompt {
  /** Exactly what the person typed, untouched. */
  original: string;
  /** English text handed to the generator. */
  english: string;
  /** True when a translation round-trip actually happened. */
  translated: boolean;
}

const LATIN_ONLY = /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]*$/u;
const NON_ENGLISH_LATIN_HINT =
  /\b(ein|eine|der|die|das|und|mit|auf|über|le|la|les|des|une|dans|sur|avec|który|która|jest|nad|oraz|dla|zdjęcie|obraz|błękitne|góra)\b|[äöüßàâçéèêëîïôùûœąćęłńóśźż]/i;

const SYSTEM: Record<PromptKind, string> = {
  image:
    "You convert a picture description written in any language (Russian, Ukrainian, German, French, Polish, English, others) into one precise English image prompt. Translate faithfully: keep every subject, object, colour, action and setting exactly as described, never swap or invent subjects. Keep it visual and concise. Reply with the English prompt only — no quotes, no notes, no preamble. If the text is already English, repeat it unchanged.",
  animation:
    "You convert an animation instruction written in any language into one precise English motion prompt for an image-to-video generator. Preserve every described movement: camera moves, wind, water, falling snow or petals, flames, people and object motion, speed and mood. Never invent new elements and never describe the still picture itself beyond what is needed for the motion. Reply with the English prompt only — no quotes, no notes.",
  text:
    "You translate the given text into natural, high-quality English, preserving meaning, tone and detail. Reply with the English text only — no quotes, no notes.",
};

/** True when the text can safely be treated as English already. */
export function looksEnglish(text: string): boolean {
  return LATIN_ONLY.test(text) && !NON_ENGLISH_LATIN_HINT.test(text);
}

/**
 * Detects the language and returns the English wording for any generator.
 * Falls back to the original text when translation is unavailable, so a
 * generation request is never lost.
 */
export async function translatePromptToEnglish(
  prompt: string,
  kind: PromptKind = "image",
): Promise<TranslatedPrompt> {
  const original = prompt.trim();
  if (!original) return { original, english: original, translated: false };
  if (looksEnglish(original)) return { original, english: original, translated: false };

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { original, english: original, translated: false };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM[kind] },
          { role: "user", content: original },
        ],
      }),
    });
    if (!res.ok) return { original, english: original, translated: false };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return { original, english: original, translated: false };
    return {
      original,
      english: text.replace(/^["'`]+|["'`]+$/g, "").slice(0, 1000),
      translated: true,
    };
  } catch {
    return { original, english: original, translated: false };
  }
}

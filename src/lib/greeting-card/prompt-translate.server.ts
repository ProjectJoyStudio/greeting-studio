// Server-only helper: turns a description written in any supported language
// into a clean English image prompt. Invisible to the user.

const LATIN_ONLY = /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]*$/u;
const NON_ENGLISH_LATIN_HINT =
  /\b(ein|eine|der|die|das|und|mit|auf|über|le|la|les|des|une|dans|sur|avec|który|która|jest|nad|oraz|dla|zdjęcie|obraz|błękitne|góra)\b|[äöüßàâçéèêëîïôùûœąćęłńóśźż]/i;

/** Returns an English prompt suitable for the image engine. */
export async function toEnglishImagePrompt(prompt: string): Promise<string> {
  const source = prompt.trim();
  if (!source) return source;

  // Plain English input goes straight through, no round-trip.
  if (LATIN_ONLY.test(source) && !NON_ENGLISH_LATIN_HINT.test(source)) return source;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return source;

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
              "You convert a picture description written in any language (Russian, Ukrainian, German, French, Polish, English, others) into one precise English image prompt. Translate faithfully: keep every subject, object, colour, action and setting exactly as described, never swap or invent subjects. Keep it visual and concise. Reply with the English prompt only — no quotes, no notes, no preamble. If the text is already English, repeat it unchanged.",
          },
          { role: "user", content: source },
        ],
      }),
    });
    if (!res.ok) return source;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return source;
    return text.replace(/^["'`]+|["'`]+$/g, "").slice(0, 1000);
  } catch {
    return source;
  }
}

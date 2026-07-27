// ---------------------------------------------------------------------------
// Server-only DeepL client. The API key is read from the server environment
// inside the call and never leaves this module.
// ---------------------------------------------------------------------------

import type { TranslationErrorCode } from "./types";

export class TranslationError extends Error {
  code: TranslationErrorCode;
  constructor(code: TranslationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function endpoint(key: string): string {
  // Free-tier keys end with ":fx" and use a separate host.
  return key.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

/**
 * Translate a batch of strings into one target language.
 * Order of the returned array matches the input order.
 */
export async function deeplTranslate(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) {
    throw new TranslationError("not_configured", "DeepL API key is not configured.");
  }
  if (texts.length === 0) return [];

  let res: Response;
  try {
    res = await fetch(endpoint(key), {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: texts,
        source_lang: sourceLang,
        target_lang: targetLang,
        preserve_formatting: true,
      }),
    });
  } catch {
    throw new TranslationError("network", "Could not reach the translation service.");
  }

  if (!res.ok) {
    if (res.status === 456) throw new TranslationError("quota_exceeded", "Translation quota exceeded.");
    if (res.status === 401 || res.status === 403) {
      throw new TranslationError("not_configured", "The translation service rejected the credentials.");
    }
    if (res.status === 429 || res.status >= 500) {
      throw new TranslationError("unavailable", "The translation service is temporarily unavailable.");
    }
    throw new TranslationError("unknown", `Translation request failed (${res.status}).`);
  }

  const json = (await res.json()) as { translations?: Array<{ text: string }> };
  const out = json.translations?.map((t) => t.text) ?? [];
  if (out.length !== texts.length) {
    throw new TranslationError("unknown", "Unexpected response from the translation service.");
  }
  return out;
}
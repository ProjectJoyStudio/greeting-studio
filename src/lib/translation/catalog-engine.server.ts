// ---------------------------------------------------------------------------
// Project Joy — Catalog Text Translation execution layer.
//
// The catalog editor asks for a batch of texts in one target language; this
// module decides which engine serves the request, following the Admin ->
// Generators configuration for "translation.catalog_text".
//
// Every engine implements the very same contract:
//   texts[] in source language  ->  texts[] in target language, same order.
// Downstream catalog code never learns which provider answered.
//
// The instructions below belong to catalog translation only. No other Project
// Joy function shares this prompt or this execution path.
// ---------------------------------------------------------------------------

import { generatorOrder, withGeneratorSlot } from "@/lib/admin/generators/runtime.server";
import { findGenerator } from "@/lib/admin/generators/registry";
import type { Lang } from "@/lib/i18n";
import { DEEPL_SOURCE, DEEPL_TARGET } from "./types";
import { TranslationError } from "./deepl.server";

/** Engines allowed to serve catalog text translation. */
export const CATALOG_TRANSLATION_CANDIDATES = ["deepl", "rw_gemini_31_flash_lite"];

const LANGUAGE_NAME: Record<Lang, string> = {
  en: "English",
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
  de: "German",
  fr: "French",
};

/** Catalog-specific, strict-translation instructions. Used nowhere else. */
function catalogSystemPrompt(source: Lang, target: Lang): string {
  return [
    `You are a strict catalog text translator for a greeting-card catalog.`,
    `Translate the user message from ${LANGUAGE_NAME[source] ?? source} into ${LANGUAGE_NAME[target] ?? target}.`,
    `Rules: translate the complete text; preserve meaning, tone, names, numbers, dates,`,
    `paragraph structure, line breaks, punctuation and formatting.`,
    `Never summarize, shorten, expand, rewrite, improve, comment, explain, add a preamble`,
    `such as "Here is the translation", invent information, change names, or answer the text`,
    `instead of translating it.`,
    `Reply with the translated text only.`,
  ].join(" ");
}

function stripWrapper(text: string): string {
  return text.replace(/^\s*["'`]+|["'`]+\s*$/g, "").trim();
}

async function viaDeepl(texts: string[], source: Lang, target: Lang): Promise<string[]> {
  const { deeplTranslate } = await import("./deepl.server");
  return deeplTranslate(texts, DEEPL_SOURCE[source] ?? "RU", DEEPL_TARGET[target] ?? target.toUpperCase());
}

async function viaRunware(
  generatorKey: string,
  texts: string[],
  source: Lang,
  target: Lang,
): Promise<string[]> {
  const { runwareGenerateText } = await import("@/lib/runware/runware.server");
  const system = catalogSystemPrompt(source, target);
  const out: string[] = [];
  // One field at a time keeps the mapping between input and output exact.
  for (const text of texts) {
    const answer = await runwareGenerateText({ generatorKey, system, user: text });
    const clean = stripWrapper(answer);
    if (!clean) throw new Error("The translation engine returned no text.");
    out.push(clean);
  }
  return out;
}

/**
 * Translates one batch into one language with the engine an administrator
 * selected. A backup engine is used only after a genuine technical failure of
 * the engine before it, and each engine is asked at most once per batch.
 */
export async function translateCatalogTexts(
  texts: string[],
  source: Lang,
  target: Lang,
): Promise<string[]> {
  if (texts.length === 0) return [];

  const order = await generatorOrder("translation.catalog_text", CATALOG_TRANSLATION_CANDIDATES);
  if (order.length === 0) {
    throw new TranslationError("not_configured", "No translation engine is configured.");
  }

  let lastError: unknown = null;
  for (const key of order) {
    const generator = findGenerator(key);
    if (!generator) continue;
    try {
      return await withGeneratorSlot(key, () =>
        generator.provider === "Runware"
          ? viaRunware(key, texts, source, target)
          : viaDeepl(texts, source, target),
      );
    } catch (err) {
      lastError = err;
      console.error(`Catalog translation engine "${key}" failed for ${target}:`, err);
    }
  }

  if (lastError instanceof TranslationError) throw lastError;
  throw new TranslationError(
    "unavailable",
    lastError instanceof Error ? lastError.message : "Translation failed.",
  );
}

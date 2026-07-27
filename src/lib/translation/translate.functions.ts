// ---------------------------------------------------------------------------
// Reusable multilingual translation service (server function).
// Entity-agnostic: any Project Joy content type (cards, songs, clips,
// voiceovers, videos, cartoons) can call this with its own field keys.
// ---------------------------------------------------------------------------

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lang } from "@/lib/i18n";
import {
  DEEPL_SOURCE,
  DEEPL_TARGET,
  type TranslationLocaleResult,
  type TranslationRequestField,
} from "./types";

export interface TranslateFieldsInput {
  sourceLocale: Lang;
  targetLocales: Lang[];
  fields: TranslationRequestField[];
}

export const translateFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TranslateFieldsInput) => {
    if (!input || typeof input !== "object") throw new Error("Invalid input");
    if (!Array.isArray(input.targetLocales) || input.targetLocales.length === 0) {
      throw new Error("targetLocales is required");
    }
    if (!Array.isArray(input.fields)) throw new Error("fields is required");
    return {
      sourceLocale: input.sourceLocale,
      targetLocales: input.targetLocales.slice(0, 12),
      fields: input.fields
        .filter((f) => f && typeof f.key === "string" && typeof f.text === "string")
        .slice(0, 20)
        .map((f) => ({ key: f.key, text: f.text.slice(0, 5000) })),
    } satisfies TranslateFieldsInput;
  })
  .handler(async ({ data, context }): Promise<{ results: TranslationLocaleResult[] }> => {
    // Only editors and above may spend translation quota.
    const { data: allowed, error: roleError } = await context.supabase.rpc("is_editor_or_above", {
      _user_id: context.userId,
    });
    if (roleError || !allowed) {
      return {
        results: data.targetLocales.map((locale) => ({
          locale,
          ok: false,
          fields: [],
          errorCode: "forbidden" as const,
          errorMessage: "You do not have permission to run translations.",
        })),
      };
    }

    const { deeplTranslate, TranslationError } = await import("./deepl.server");

    const nonEmpty = data.fields.filter((f) => f.text.trim().length > 0);
    const source = DEEPL_SOURCE[data.sourceLocale] ?? "RU";

    const results = await Promise.all(
      data.targetLocales.map(async (locale): Promise<TranslationLocaleResult> => {
        if (locale === data.sourceLocale) {
          return { locale, ok: true, fields: data.fields };
        }
        if (nonEmpty.length === 0) {
          return { locale, ok: true, fields: [] };
        }
        try {
          const translated = await deeplTranslate(
            nonEmpty.map((f) => f.text),
            source,
            DEEPL_TARGET[locale] ?? locale.toUpperCase(),
          );
          return {
            locale,
            ok: true,
            fields: nonEmpty.map((f, i) => ({ key: f.key, text: translated[i] })),
          };
        } catch (err) {
          const code =
            err instanceof TranslationError ? err.code : ("unknown" as const);
          return {
            locale,
            ok: false,
            fields: [],
            errorCode: code,
            errorMessage: err instanceof Error ? err.message : "Translation failed.",
          };
        }
      }),
    );

    return { results };
  });
// ---------------------------------------------------------------------------
// Project Joy — Multilingual foundation (client-safe types).
//
// This module is deliberately entity-agnostic: it is used by the catalog card
// editor today and will be reused for songs, clips, voiceovers, videos and
// cartoons. Nothing here knows about a specific table.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

/** The six languages every Project Joy content item must support. */
export const REQUIRED_LOCALES: Lang[] = ["ru", "en", "de", "uk", "fr", "pl"];

/** The single source language authors write in. */
export const SOURCE_LOCALE: Lang = "ru";

/** Per-language review state. */
export type TranslationState = "empty" | "auto" | "confirmed";

/** DeepL language codes for the six supported locales. */
export const DEEPL_TARGET: Record<Lang, string> = {
  ru: "RU",
  en: "EN-US",
  de: "DE",
  uk: "UK",
  fr: "FR",
  pl: "PL",
};

export const DEEPL_SOURCE: Record<Lang, string> = {
  ru: "RU",
  en: "EN",
  de: "DE",
  uk: "UK",
  fr: "FR",
  pl: "PL",
};

/** Generic payload accepted by the translation service. */
export interface TranslationRequestField {
  /** Caller-defined field key, echoed back in the response. */
  key: string;
  text: string;
}

export interface TranslationResultField {
  key: string;
  text: string;
}

export interface TranslationLocaleResult {
  locale: Lang;
  ok: boolean;
  fields: TranslationResultField[];
  /** Machine-readable failure reason — mapped to a localized message in the UI. */
  errorCode?: TranslationErrorCode;
  errorMessage?: string;
}

export type TranslationErrorCode =
  | "not_configured"
  | "unauthorized"
  | "forbidden"
  | "quota_exceeded"
  | "unavailable"
  | "network"
  | "unknown";

/** Map DB enum (`translation_status`) → UI state. */
export function dbStatusToState(status: string | null | undefined): TranslationState {
  switch (status) {
    case "approved":
    case "published":
      return "confirmed";
    case "machine_translated":
    case "needs_review":
    case "draft":
      return "auto";
    default:
      return "empty";
  }
}

/** Map UI state → DB enum value. */
export function stateToDbStatus(state: TranslationState, hasContent: boolean): string {
  if (!hasContent) return "missing";
  if (state === "confirmed") return "approved";
  return "machine_translated";
}
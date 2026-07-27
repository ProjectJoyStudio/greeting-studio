// ---------------------------------------------------------------------------
// Publish-time validation of the rendered text for every required language.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";
import type { TextDesign, Translation } from "@/lib/admin/catalog-mgmt/types";
import { resolveTextDesign } from "@/lib/admin/catalog-mgmt/types";
import { REQUIRED_LOCALES } from "@/lib/translation/types";
import { layoutCardText, refHeightFor, type FitResult } from "./engine";

export type TextFitIssue = "overflow" | "too_small" | "outside_safe_area";

export interface LangFitReport {
  locale: Lang;
  fit: FitResult;
  issues: TextFitIssue[];
}

export function reportForLang(
  locale: Lang,
  translation: Translation | undefined,
  base: TextDesign,
  aspectRatio: string | undefined,
): LangFitReport {
  const design = resolveTextDesign(base, translation);
  const refHeight = refHeightFor(aspectRatio);
  const fit = layoutCardText({
    text: translation?.textOnCard ?? "",
    design,
    refHeight,
    autoFit: translation?.autoFit !== false,
  });
  const issues: TextFitIssue[] = [];
  if (fit.lines.length > 0) {
    if (fit.overflow) issues.push(translation?.autoFit === false ? "outside_safe_area" : "overflow");
    if (fit.tooSmall) issues.push("too_small");
  }
  return { locale, fit, issues };
}

export function reportAllLangs(
  translations: Partial<Record<Lang, Translation>>,
  base: TextDesign,
  aspectRatio: string | undefined,
): LangFitReport[] {
  return REQUIRED_LOCALES.map((l) => reportForLang(l, translations[l], base, aspectRatio));
}
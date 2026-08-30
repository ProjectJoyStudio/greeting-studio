import type { Lang } from "@/lib/i18n/types";

const BONUS_CREDITS: Record<Lang, string> = {
  en: "Bonus Credits",
  ru: "бонусных кредитов",
  de: "Bonus-Credits",
  uk: "бонусних кредитів",
  fr: "crédits bonus",
  pl: "kredytów bonusowych",
};

/** The word shown after a balance — bonus wallets are always marked as such. */
export function creditWord(lang: Lang, isTest: boolean, realWord: string): string {
  return isTest ? BONUS_CREDITS[lang] ?? BONUS_CREDITS.en : realWord;
}

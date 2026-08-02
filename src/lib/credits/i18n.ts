import type { Lang } from "@/lib/i18n/types";

const TEST_CREDITS: Record<Lang, string> = {
  en: "Test Credits",
  ru: "тестовых кредитов",
  de: "Test-Kredits",
  uk: "тестових кредитів",
  fr: "crédits de test",
  pl: "kredytów testowych",
};

/** The word shown after a balance — test wallets are always marked as such. */
export function creditWord(lang: Lang, isTest: boolean, realWord: string): string {
  return isTest ? TEST_CREDITS[lang] ?? TEST_CREDITS.en : realWord;
}

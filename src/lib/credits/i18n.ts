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

const LABELS: Record<string, Record<Lang, string>> = {
  total: {
    en: "Total balance",
    ru: "Общий баланс",
    de: "Gesamtguthaben",
    uk: "Загальний баланс",
    fr: "Solde total",
    pl: "Saldo łączne",
  },
  yours: {
    en: "Your Credits",
    ru: "Ваши кредиты",
    de: "Deine Credits",
    uk: "Ваші кредити",
    fr: "Vos crédits",
    pl: "Twoje kredyty",
  },
  bonus: {
    en: "Bonus Credits",
    ru: "Бонусные кредиты",
    de: "Bonus-Credits",
    uk: "Бонусні кредити",
    fr: "Crédits bonus",
    pl: "Kredyty bonusowe",
  },
};

export function creditLabel(lang: Lang, key: "total" | "yours" | "bonus"): string {
  const row = LABELS[key];
  return row[lang] ?? row.en;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { LANGS, type Dict, type Lang } from "./types";
import en from "./locales/en";
import ru from "./locales/ru";
import de from "./locales/de";
import uk from "./locales/uk";
import fr from "./locales/fr";
import pl from "./locales/pl";
import { AUTH_DASHBOARD } from "./locales/auth-dashboard";
import { STUDIO } from "./locales/studio";
import { ADMIN_I18N } from "./locales/admin";
import { CATALOG_PAGES } from "./locales/catalog-pages";
import { SHOWCASE_I18N } from "./locales/showcase";
import { FIRST_FREE_I18N } from "./locales/first-free";
import { GREETING_CARDS_I18N } from "./locales/greeting-cards";
import { DELETED_CARDS_I18N } from "./locales/deleted-cards";
import { HERO_CREDITS_I18N } from "./locales/hero-credits";
import { CM_DICT } from "@/lib/admin/catalog-mgmt/i18n";

export { LANGS };
export type { Lang, Dict };

// Merge the auth/dashboard namespace into each locale so `t()` resolves
// every UI string from a single flat dictionary per language.
const DICTS: Record<Lang, Dict> = {
  en: { ...en, ...AUTH_DASHBOARD.en, ...STUDIO.en, ...ADMIN_I18N.en, ...CM_DICT.en, ...CATALOG_PAGES.en, ...SHOWCASE_I18N.en, ...FIRST_FREE_I18N.en, ...HERO_CREDITS_I18N.en, ...GREETING_CARDS_I18N.en, ...DELETED_CARDS_I18N.en },
  ru: { ...ru, ...AUTH_DASHBOARD.ru, ...STUDIO.ru, ...ADMIN_I18N.ru, ...CM_DICT.ru, ...CATALOG_PAGES.ru, ...SHOWCASE_I18N.ru, ...FIRST_FREE_I18N.ru, ...HERO_CREDITS_I18N.ru, ...GREETING_CARDS_I18N.ru, ...DELETED_CARDS_I18N.ru },
  de: { ...de, ...AUTH_DASHBOARD.de, ...STUDIO.de, ...ADMIN_I18N.de, ...CM_DICT.de, ...CATALOG_PAGES.de, ...SHOWCASE_I18N.de, ...FIRST_FREE_I18N.de, ...HERO_CREDITS_I18N.de, ...GREETING_CARDS_I18N.de, ...DELETED_CARDS_I18N.de },
  uk: { ...uk, ...AUTH_DASHBOARD.uk, ...STUDIO.uk, ...ADMIN_I18N.uk, ...CM_DICT.uk, ...CATALOG_PAGES.uk, ...SHOWCASE_I18N.uk, ...FIRST_FREE_I18N.uk, ...HERO_CREDITS_I18N.uk, ...GREETING_CARDS_I18N.uk, ...DELETED_CARDS_I18N.uk },
  fr: { ...fr, ...AUTH_DASHBOARD.fr, ...STUDIO.fr, ...ADMIN_I18N.fr, ...CM_DICT.fr, ...CATALOG_PAGES.fr, ...SHOWCASE_I18N.fr, ...FIRST_FREE_I18N.fr, ...HERO_CREDITS_I18N.fr, ...GREETING_CARDS_I18N.fr, ...DELETED_CARDS_I18N.fr },
  pl: { ...pl, ...AUTH_DASHBOARD.pl, ...STUDIO.pl, ...ADMIN_I18N.pl, ...CM_DICT.pl, ...CATALOG_PAGES.pl, ...SHOWCASE_I18N.pl, ...FIRST_FREE_I18N.pl, ...HERO_CREDITS_I18N.pl, ...GREETING_CARDS_I18N.pl, ...DELETED_CARDS_I18N.pl },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "pj_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && DICTS[stored]) setLangState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  const t = (k: string) => DICTS[lang][k] ?? DICTS.en[k] ?? k;

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
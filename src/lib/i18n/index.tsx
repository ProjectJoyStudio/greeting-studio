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

export { LANGS };
export type { Lang, Dict };

// Merge the auth/dashboard namespace into each locale so `t()` resolves
// every UI string from a single flat dictionary per language.
const DICTS: Record<Lang, Dict> = {
  en: { ...en, ...AUTH_DASHBOARD.en, ...STUDIO.en },
  ru: { ...ru, ...AUTH_DASHBOARD.ru, ...STUDIO.ru },
  de: { ...de, ...AUTH_DASHBOARD.de, ...STUDIO.de },
  uk: { ...uk, ...AUTH_DASHBOARD.uk, ...STUDIO.uk },
  fr: { ...fr, ...AUTH_DASHBOARD.fr, ...STUDIO.fr },
  pl: { ...pl, ...AUTH_DASHBOARD.pl, ...STUDIO.pl },
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
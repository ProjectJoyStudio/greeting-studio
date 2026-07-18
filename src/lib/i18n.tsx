// Backwards-compatible shim. The i18n module lives at src/lib/i18n/ with
// per-language files under src/lib/i18n/locales/. Import from "@/lib/i18n"
// continues to work.
export { I18nProvider, useI18n, LANGS } from "./i18n/index";
export type { Lang, Dict } from "./i18n/types";

export type Dict = Record<string, string>;

export type Lang = "en" | "ru" | "de" | "uk" | "fr" | "pl";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "EN" },
  { code: "ru", label: "Русский", flag: "RU" },
  { code: "de", label: "Deutsch", flag: "DE" },
  { code: "uk", label: "Українська", flag: "UA" },
  { code: "fr", label: "Français", flag: "FR" },
  { code: "pl", label: "Polski", flag: "PL" },
];
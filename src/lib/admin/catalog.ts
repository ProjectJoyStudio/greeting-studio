// ---------------------------------------------------------------------------
// Project Joy — Admin Catalog module.
//
// Frontend demonstration only. No backend, storage or generation systems
// are connected. All records are placeholders.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n/types";

export type CatalogType =
  | "card"
  | "animated"
  | "song"
  | "video-clip"
  | "cartoon"
  | "premium"
  | "template";

export const CATALOG_TYPES: CatalogType[] = [
  "card",
  "animated",
  "song",
  "video-clip",
  "cartoon",
  "premium",
  "template",
];

export type CatalogCategory =
  | "birthday"
  | "wedding"
  | "anniversary"
  | "good_morning"
  | "good_night"
  | "love"
  | "friendship"
  | "apology"
  | "congratulations"
  | "religious"
  | "christmas"
  | "new_year"
  | "travel"
  | "children"
  | "universal";

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  "birthday",
  "wedding",
  "anniversary",
  "good_morning",
  "good_night",
  "love",
  "friendship",
  "apology",
  "congratulations",
  "religious",
  "christmas",
  "new_year",
  "travel",
  "children",
  "universal",
];

export type CatalogStatus = "draft" | "published" | "hidden" | "archived";

export const CATALOG_STATUSES: CatalogStatus[] = [
  "draft",
  "published",
  "hidden",
  "archived",
];

/** Includes derived statuses used only for display / filtering. */
export type DisplayStatus = CatalogStatus | "scheduled" | "expired";

export const CATALOG_STATUS_TONE: Record<CatalogStatus, string> = {
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30",
  hidden: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30",
  archived: "bg-rose-500/15 text-rose-700 dark:text-rose-200 border-rose-500/30",
};

export const DISPLAY_STATUS_TONE: Record<DisplayStatus, string> = {
  ...CATALOG_STATUS_TONE,
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-200 border-sky-500/30",
  expired: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-200 border-zinc-500/30",
};

/** Preview gradients used as placeholder cover art. */
export const CATALOG_GRADIENTS: string[] = [
  "linear-gradient(160deg, oklch(0.9 0.09 55), oklch(0.6 0.15 30))",
  "linear-gradient(160deg, oklch(0.86 0.11 20), oklch(0.5 0.15 10))",
  "linear-gradient(160deg, oklch(0.9 0.08 90), oklch(0.6 0.13 65))",
  "linear-gradient(160deg, oklch(0.85 0.08 340), oklch(0.5 0.12 340))",
  "linear-gradient(160deg, oklch(0.88 0.09 150), oklch(0.5 0.11 165))",
  "linear-gradient(160deg, oklch(0.85 0.07 240), oklch(0.4 0.09 260))",
  "linear-gradient(160deg, oklch(0.9 0.07 45), oklch(0.42 0.11 30))",
  "linear-gradient(160deg, oklch(0.88 0.1 75), oklch(0.55 0.14 55))",
  "linear-gradient(160deg, oklch(0.85 0.05 200), oklch(0.5 0.08 220))",
];

/** Frontend-only content flags shown as badges. */
export interface CatalogFlags {
  featured: boolean;
  recommended: boolean;
  premium: boolean;
  newBadge: boolean;
  popular: boolean;
  seasonal: boolean;
  pinToTop: boolean;
}

export const DEFAULT_FLAGS: CatalogFlags = {
  featured: false,
  recommended: false,
  premium: false,
  newBadge: false,
  popular: false,
  seasonal: false,
  pinToTop: false,
};

/** One localized content version. */
export interface CatalogTranslation {
  title: string;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  searchKeywords: string[];
}

export function emptyTranslation(): CatalogTranslation {
  return { title: "", shortDescription: "", longDescription: "", tags: [], searchKeywords: [] };
}

export type TranslationStatus = "complete" | "incomplete" | "missing";

export function translationStatus(t: CatalogTranslation | undefined): TranslationStatus {
  if (!t) return "missing";
  const hasTitle = t.title.trim().length > 0;
  const hasShort = t.shortDescription.trim().length > 0;
  const hasLong = t.longDescription.trim().length > 0;
  const filled = [hasTitle, hasShort, hasLong].filter(Boolean).length;
  if (filled === 0) return "missing";
  if (hasTitle && hasShort && hasLong) return "complete";
  return "incomplete";
}

/** Frontend media placeholders. Filenames only — no real files stored. */
export interface CatalogMedia {
  mainPreview: string;
  thumbnail: string;
  audio: string;
  video: string;
  cover: string;
  additional: string[];
}

export function emptyMedia(): CatalogMedia {
  return { mainPreview: "", thumbnail: "", audio: "", video: "", cover: "", additional: [] };
}

export interface CatalogVersion {
  version: number;
  date: string;
  admin: string;
  changedFields: string[];
  status: CatalogStatus;
}

export interface CatalogStats {
  views: number;
  opens: number;
  uses: number;
  favorites: number;
  shares: number;
  conversion: number; // percent 0-100
  lastUsed: string; // ISO
}

export function demoStats(seed: number): CatalogStats {
  const r = (n: number, min: number) => Math.max(min, Math.round((Math.sin(seed * 13.37 + n) * 0.5 + 0.5) * 5000));
  const views = r(1, 40);
  const opens = Math.round(views * 0.6);
  const uses = Math.round(opens * 0.35);
  const favorites = Math.round(uses * 0.4);
  const shares = Math.round(uses * 0.2);
  const conversion = views > 0 ? Math.round((uses / views) * 1000) / 10 : 0;
  const daysAgo = (seed % 14) + 1;
  const lastUsed = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return { views, opens, uses, favorites, shares, conversion, lastUsed };
}

export interface CatalogItem {
  id: string;
  internalName: string;
  category: CatalogCategory;
  type: CatalogType;
  /** Primary language for the item — used as the storefront default. */
  primaryLanguage: Lang;
  /** Localized copy per language. Absent entries are treated as missing. */
  translations: Partial<Record<Lang, CatalogTranslation>>;
  status: CatalogStatus;
  credits: number;
  internalNotes: string;
  createdAt: string; // ISO
  gradientIndex: number;
  flags: CatalogFlags;
  media: CatalogMedia;
  publishAt?: string; // ISO — scheduling
  hideAfter?: string; // ISO — hide after this date
  noEndDate: boolean;
  versions: CatalogVersion[];
  stats: CatalogStats;
}

/** Convenience — read the display title in a given language (falls back). */
export function displayTitle(it: CatalogItem, lang: Lang): string {
  return (
    it.translations[lang]?.title.trim() ||
    it.translations[it.primaryLanguage]?.title.trim() ||
    Object.values(it.translations).find((t) => t?.title.trim())?.title ||
    ""
  );
}

export function displayShort(it: CatalogItem, lang: Lang): string {
  return (
    it.translations[lang]?.shortDescription.trim() ||
    it.translations[it.primaryLanguage]?.shortDescription.trim() ||
    ""
  );
}

export function displayLong(it: CatalogItem, lang: Lang): string {
  return (
    it.translations[lang]?.longDescription.trim() ||
    it.translations[it.primaryLanguage]?.longDescription.trim() ||
    ""
  );
}

/** Compute the display status taking scheduling/hide dates into account. */
export function deriveDisplayStatus(it: CatalogItem, now: Date = new Date()): DisplayStatus {
  if (it.status === "archived") return "archived";
  if (it.status === "draft") return "draft";
  if (it.status === "hidden") return "hidden";
  // status === "published"
  if (it.publishAt) {
    const pub = new Date(it.publishAt);
    if (pub.getTime() > now.getTime()) return "scheduled";
  }
  if (!it.noEndDate && it.hideAfter) {
    const hide = new Date(it.hideAfter);
    if (hide.getTime() < now.getTime()) return "expired";
  }
  return "published";
}

let seq = 100;
function nextId() {
  seq += 1;
  return `JOY-C-${seq}`;
}

function mk(
  overrides: {
    title: string;
    category: CatalogCategory;
    type: CatalogType;
    language?: Lang;
    credits?: number;
    status?: CatalogStatus;
    tags?: string[];
    description?: string;
    createdAt?: string;
    flags?: Partial<CatalogFlags>;
    publishAt?: string;
    hideAfter?: string;
  },
): CatalogItem {
  const id = nextId();
  const language = overrides.language ?? "en";
  const translation: CatalogTranslation = {
    title: overrides.title,
    shortDescription: overrides.description ?? "Demonstration entry for the catalog module.",
    longDescription: "",
    tags: overrides.tags ?? [],
    searchKeywords: [],
  };
  const translations: Partial<Record<Lang, CatalogTranslation>> = {
    [language]: translation,
  };
  const gradientIndex = (seq - 100) % CATALOG_GRADIENTS.length;
  return {
    id,
    internalName: overrides.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    category: overrides.category,
    type: overrides.type,
    primaryLanguage: language,
    translations,
    status: overrides.status ?? "published",
    credits: overrides.credits ?? 3,
    internalNotes: "",
    createdAt: overrides.createdAt ?? "2026-06-01T09:00:00.000Z",
    gradientIndex,
    flags: { ...DEFAULT_FLAGS, ...(overrides.flags ?? {}) },
    media: emptyMedia(),
    publishAt: overrides.publishAt,
    hideAfter: overrides.hideAfter,
    noEndDate: !overrides.hideAfter,
    versions: [
      {
        version: 1,
        date: overrides.createdAt ?? "2026-06-01T09:00:00.000Z",
        admin: "system@projectjoy",
        changedFields: ["created"],
        status: overrides.status ?? "published",
      },
    ],
    stats: demoStats(seq),
  };
}

export const DEMO_CATALOG: CatalogItem[] = [
  mk({
    title: "Warm Birthday Wishes",
    category: "birthday",
    type: "card",
    language: "en",
    credits: 1,
    tags: ["birthday", "warm"],
    description: "A gentle birthday card with hand-picked wording.",
    createdAt: "2026-07-10T09:00:00.000Z",
  }),
  mk({
    title: "Golden Anniversary Song",
    category: "anniversary",
    type: "song",
    language: "en",
    credits: 12,
    tags: ["anniversary", "song"],
    createdAt: "2026-07-08T09:00:00.000Z",
  }),
  mk({
    title: "Wedding Toast Video",
    category: "wedding",
    type: "video-clip",
    language: "en",
    credits: 18,
    status: "published",
    tags: ["wedding"],
    createdAt: "2026-07-05T09:00:00.000Z",
  }),
  mk({
    title: "Good Morning Sunshine",
    category: "good_morning",
    type: "animated",
    language: "en",
    credits: 3,
    createdAt: "2026-07-04T09:00:00.000Z",
  }),
  mk({
    title: "Süße Träume",
    category: "good_night",
    type: "animated",
    language: "de",
    credits: 3,
    createdAt: "2026-07-03T20:00:00.000Z",
  }),
  mk({
    title: "С Днём Рождения, дорогой друг",
    category: "birthday",
    type: "card",
    language: "ru",
    credits: 1,
    tags: ["день рождения"],
    createdAt: "2026-06-30T09:00:00.000Z",
  }),
  mk({
    title: "Christmas Family Cartoon",
    category: "christmas",
    type: "cartoon",
    language: "en",
    credits: 22,
    status: "draft",
    createdAt: "2026-06-28T09:00:00.000Z",
  }),
  mk({
    title: "З Новим Роком",
    category: "new_year",
    type: "card",
    language: "uk",
    credits: 1,
    createdAt: "2026-06-25T09:00:00.000Z",
  }),
  mk({
    title: "Voeux d'amitié",
    category: "friendship",
    type: "card",
    language: "fr",
    credits: 1,
    createdAt: "2026-06-22T09:00:00.000Z",
  }),
  mk({
    title: "Przeprosiny z serca",
    category: "apology",
    type: "card",
    language: "pl",
    credits: 1,
    status: "hidden",
    createdAt: "2026-06-20T09:00:00.000Z",
  }),
  mk({
    title: "Graduation Congratulations",
    category: "congratulations",
    type: "animated",
    language: "en",
    credits: 4,
    createdAt: "2026-06-18T09:00:00.000Z",
  }),
  mk({
    title: "Blessings for the Journey",
    category: "religious",
    type: "card",
    language: "en",
    credits: 1,
    createdAt: "2026-06-15T09:00:00.000Z",
  }),
  mk({
    title: "Safe Travels",
    category: "travel",
    type: "card",
    language: "en",
    credits: 1,
    createdAt: "2026-06-12T09:00:00.000Z",
  }),
  mk({
    title: "Little Star Fairy Tale",
    category: "children",
    type: "cartoon",
    language: "en",
    credits: 16,
    createdAt: "2026-06-10T09:00:00.000Z",
  }),
  mk({
    title: "Universal Warm Wishes",
    category: "universal",
    type: "template",
    language: "en",
    credits: 0,
    status: "archived",
    createdAt: "2026-06-01T09:00:00.000Z",
  }),
  mk({
    title: "Premium Personal Story",
    category: "universal",
    type: "premium",
    language: "en",
    credits: 50,
    status: "draft",
    createdAt: "2026-05-28T09:00:00.000Z",
  }),
];

export interface CatalogValidation {
  title?: string;
  category?: string;
  type?: string;
  language?: string;
  credits?: string;
  translations?: string;
  publishAt?: string;
  hideAfter?: string;
  premium?: string;
  pin?: string;
  archivedPublished?: string;
}

export function validateCatalog(it: CatalogItem, L: (k: string) => string): CatalogValidation {
  const e: CatalogValidation = {};
  const primary = it.translations[it.primaryLanguage];
  if (!primary || !primary.title.trim()) e.title = L("v_title_required");
  if (!it.category) e.category = L("v_category_required");
  if (!it.type) e.type = L("v_type_required");
  if (!it.primaryLanguage) e.language = L("v_language_required");
  if (it.credits < 0 || !Number.isFinite(it.credits)) e.credits = L("v_credits_negative");
  // At least one complete language for publication
  if (it.status === "published") {
    const anyComplete = LANGS.some((l) => translationStatus(it.translations[l.code]) === "complete");
    if (!anyComplete) e.translations = L("v_needs_translation");
  }
  if (it.publishAt) {
    const p = new Date(it.publishAt).getTime();
    if (Number.isNaN(p)) e.publishAt = L("v_invalid_date");
    else if (it.status === "published" && p > Date.now() && !it.publishAt) {
      // handled by derived state
    }
  }
  if (!it.noEndDate && it.hideAfter) {
    const h = new Date(it.hideAfter).getTime();
    const p = it.publishAt ? new Date(it.publishAt).getTime() : 0;
    if (Number.isNaN(h)) e.hideAfter = L("v_invalid_date");
    else if (p && h < p) e.hideAfter = L("v_hide_before_publish");
  }
  if (it.status === "archived" && it.flags.featured) {
    // OK — archived items can retain flags for restore, but must not be Published
  }
  if (it.flags.premium && it.credits === 0) {
    // soft: Premium usually paid — not fatal
  }
  if (it.status === "archived" && it.status === ("published" as CatalogStatus)) {
    e.archivedPublished = L("v_archived_published");
  }
  if (it.flags.pinToTop && !it.category) e.pin = L("v_pin_needs_category");
  return e;
}

export function makeBlankCatalogItem(): CatalogItem {
  return {
    id: nextId(),
    internalName: "",
    category: "birthday",
    type: "card",
    primaryLanguage: "en",
    translations: { en: emptyTranslation() },
    status: "draft",
    credits: 1,
    internalNotes: "",
    createdAt: new Date().toISOString(),
    gradientIndex: Math.floor(Math.random() * CATALOG_GRADIENTS.length),
    flags: { ...DEFAULT_FLAGS },
    media: emptyMedia(),
    noEndDate: true,
    versions: [],
    stats: demoStats(Math.floor(Math.random() * 999)),
  };
}

export function duplicateCatalogItem(src: CatalogItem): CatalogItem {
  // Deep-copy translations to avoid shared references.
  const translations: Partial<Record<Lang, CatalogTranslation>> = {};
  for (const k of Object.keys(src.translations) as Lang[]) {
    const t = src.translations[k]!;
    translations[k] = { ...t, tags: [...t.tags], searchKeywords: [...t.searchKeywords] };
  }
  const primary = translations[src.primaryLanguage];
  if (primary) primary.title = `${primary.title} (copy)`;
  return {
    ...src,
    id: nextId(),
    translations,
    status: "draft",
    createdAt: new Date().toISOString(),
    versions: [],
    flags: { ...src.flags, pinToTop: false },
  };
}

/** Append a version-history entry (frontend only). */
export function appendVersion(it: CatalogItem, changedFields: string[], admin = "admin@projectjoy"): CatalogItem {
  const nextV = (it.versions[0]?.version ?? 0) + 1;
  const entry: CatalogVersion = {
    version: nextV,
    date: new Date().toISOString(),
    admin,
    changedFields,
    status: it.status,
  };
  return { ...it, versions: [entry, ...it.versions].slice(0, 20) };
}
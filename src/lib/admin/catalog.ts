// ---------------------------------------------------------------------------
// Project Joy — Admin Catalog module.
//
// Frontend demonstration only. No backend, storage or generation systems
// are connected. All records are placeholders.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

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

export const CATALOG_STATUS_TONE: Record<CatalogStatus, string> = {
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30",
  hidden: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30",
  archived: "bg-rose-500/15 text-rose-700 dark:text-rose-200 border-rose-500/30",
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

export interface CatalogItem {
  id: string;
  title: string;
  internalName: string;
  description: string;
  category: CatalogCategory;
  type: CatalogType;
  language: Lang;
  status: CatalogStatus;
  credits: number;
  tags: string[];
  internalNotes: string;
  createdAt: string; // ISO
  gradientIndex: number;
}

let seq = 100;
function nextId() {
  seq += 1;
  return `JOY-C-${seq}`;
}

function mk(
  overrides: Partial<CatalogItem> & Pick<CatalogItem, "title" | "category" | "type">,
): CatalogItem {
  const base: CatalogItem = {
    id: nextId(),
    title: overrides.title,
    internalName: overrides.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: "Demonstration entry for the catalog module.",
    category: overrides.category,
    type: overrides.type,
    language: "en",
    status: "published",
    credits: 3,
    tags: [],
    internalNotes: "",
    createdAt: "2026-06-01T09:00:00.000Z",
    gradientIndex: (seq - 100) % CATALOG_GRADIENTS.length,
  };
  return { ...base, ...overrides };
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
}

export function validateCatalog(
  it: Pick<CatalogItem, "title" | "category" | "type" | "language" | "credits">,
  L: (k: string) => string,
): CatalogValidation {
  const e: CatalogValidation = {};
  if (!it.title.trim()) e.title = L("v_title_required");
  if (!it.category) e.category = L("v_category_required");
  if (!it.type) e.type = L("v_type_required");
  if (!it.language) e.language = L("v_language_required");
  if (it.credits < 0 || !Number.isFinite(it.credits)) e.credits = L("v_credits_negative");
  return e;
}

export function makeBlankCatalogItem(): CatalogItem {
  return {
    id: nextId(),
    title: "",
    internalName: "",
    description: "",
    category: "birthday",
    type: "card",
    language: "en",
    status: "draft",
    credits: 1,
    tags: [],
    internalNotes: "",
    createdAt: new Date().toISOString(),
    gradientIndex: Math.floor(Math.random() * CATALOG_GRADIENTS.length),
  };
}

export function duplicateCatalogItem(src: CatalogItem): CatalogItem {
  return {
    ...src,
    id: nextId(),
    title: `${src.title} (copy)`,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}
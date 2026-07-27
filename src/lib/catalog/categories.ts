// Stable, language-independent catalog category resolution.
//
// A category is identified by its database slug (e.g. `good_morning`). URLs use
// a hyphenated form of the same slug (`/catalog/good-morning`) so the route is
// permanent and identical in every interface language.
import { slugLabel } from "@/lib/taxonomy-labels";
import type { Lang } from "@/lib/i18n";

/** Legacy / UI-side keys mapped onto the stable database slug. */
export const OCCASION_ALIASES: Record<string, string> = {
  love_you: "i_love_you",
  miss_you: "i_miss_you",
  sorry: "forgive_me",
  apology: "forgive_me",
  safe_trip: "safe_travels",
  great_weekend: "happy_weekend",
  morning: "good_morning",
  night: "good_night",
  support: "encouragement",
  newborn: "new_baby",
};

/** Normalizes any incoming key (URL segment, UI key, DB slug) to the DB slug. */
export function normalizeCategorySlug(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/^(ev|occ|cat)_/, "");
  return OCCASION_ALIASES[base] ?? base;
}

/** DB slug -> URL segment (`good_morning` -> `good-morning`). */
export const slugToParam = (slug: string) => slug.replace(/_/g, "-");

/** URL segment -> DB slug. */
export const paramToSlug = (param: string) => normalizeCategorySlug(param);

/**
 * Localized category label. Resolution order:
 * dictionary key `cat_<slug>` -> plain key -> taxonomy fallback dictionary.
 * Never derived from the visible label of another language.
 */
export function categoryLabel(slug: string, lang: Lang, t: (k: string) => string): string {
  const key = `cat_${slug}`;
  const translated = t(key);
  if (translated !== key) return translated;
  const alt = t(slug);
  if (alt !== slug) return alt;
  return slugLabel(slug, lang);
}

/** Slugs shown on the "Every Day" landing page, in display order. */
export const EVERYDAY_SLUGS = [
  "good_morning",
  "nice_day",
  "good_evening",
  "good_night",
  "happy_weekend",
  "good_luck",
  "safe_travels",
  "i_love_you",
  "i_miss_you",
  "thinking_of_you",
  "encouragement",
];
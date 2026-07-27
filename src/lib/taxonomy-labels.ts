// Central, language-independent taxonomy label resolver.
// Database rows keep their stable slug/ID; only the displayed label changes
// with the interface language. Rows created in the admin panel often carry an
// English name only — this module supplies the localized fallback so no
// occasion/category ever renders in English inside another language.
import { DEFAULT_TAXONOMY } from "@/lib/admin/catalog-mgmt/taxonomy";
import type { Lang } from "@/lib/i18n";

type Names = Partial<Record<Lang, string>> & { en: string };

const BY_SLUG: Record<string, Names> = {};
for (const items of Object.values(DEFAULT_TAXONOMY)) {
  for (const item of items) {
    if (!BY_SLUG[item.key]) BY_SLUG[item.key] = item.names as Names;
  }
}

const titleCase = (slug: string) =>
  slug.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/** Localized label for a taxonomy slug, with a built-in fallback dictionary. */
export function defaultTaxonomyName(slug: string, lang: Lang): string | undefined {
  return BY_SLUG[slug]?.[lang];
}

export function slugLabel(slug: string, lang: Lang): string {
  return BY_SLUG[slug]?.[lang] ?? BY_SLUG[slug]?.en ?? titleCase(slug);
}

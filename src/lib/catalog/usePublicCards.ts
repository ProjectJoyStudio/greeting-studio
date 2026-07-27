import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getPublicCatalogCards, type PublicCatalogCard } from "@/lib/public-catalog.functions";
import { normalizeCategorySlug } from "./categories";

export type CardRow = PublicCatalogCard;

/** Published official Project Joy catalog cards (customer cards never included). */
export function usePublicCards() {
  return useQuery({
    queryKey: ["public-catalog-cards"],
    queryFn: async (): Promise<CardRow[]> => getPublicCatalogCards(),
  });
}

/** Active occasion slugs, ordered as configured in the admin panel. */
export function usePublicOccasions() {
  return useQuery({
    queryKey: ["public-occasions"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("catalog_occasions")
        .select("slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => row.slug);
    },
  });
}

/** All stable category keys a card belongs to (occasions + facet ids/slugs). */
export function cardCategoryKeys(card: CardRow): string[] {
  const slugs = [card.primary_occasion?.slug, ...card.additional.map((a) => a.occasion?.slug)]
    .filter(Boolean)
    .map((slug) => normalizeCategorySlug(slug as string));
  const facets = (card.facets ?? []).map((f) => normalizeCategorySlug(f));
  return [...slugs, ...facets];
}

/** Deduplicated, category- and search-filtered card list. */
export function filterCards(
  cards: CardRow[],
  opts: { category?: string; query?: string; lang: string },
): CardRow[] {
  const q = (opts.query ?? "").trim().toLowerCase();
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.id)) return false;
    if (opts.category && opts.category !== "all") {
      if (!cardCategoryKeys(c).includes(opts.category)) return false;
    }
    if (q) {
      const tr = c.translations.find((x) => x.language_code === opts.lang) ?? c.translations[0];
      const hay = [c.internal_name, tr?.title, tr?.greeting_text].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    seen.add(c.id);
    return true;
  });
}
import { createServerFn } from "@tanstack/react-start";

import type { Database } from "@/integrations/supabase/types";

type VariantRow = Pick<
  Database["public"]["Tables"]["catalog_card_variants"]["Row"],
  | "id"
  | "internal_name"
  | "background_id"
  | "primary_occasion_id"
  | "status"
  | "is_hidden"
  | "is_archived"
  | "deleted_at"
  | "display_order"
  | "created_at"
>;

type AdditionalOccasionRow = Database["public"]["Tables"]["card_variant_additional_occasions"]["Row"];

type TranslationRow = Pick<
  Database["public"]["Tables"]["catalog_card_translations"]["Row"],
  "card_variant_id" | "language_code" | "title" | "greeting_text"
>;

type OccasionRow = Pick<
  Database["public"]["Tables"]["catalog_occasions"]["Row"],
  "id" | "slug" | "is_active"
>;

/** Text-design rows drive the shared renderer so public cards match the admin preview. */
export type PublicTextDesignRow = Pick<
  Database["public"]["Tables"]["catalog_text_designs"]["Row"],
  | "card_variant_id"
  | "language_code"
  | "text_x"
  | "text_y"
  | "text_width"
  | "alignment"
  | "font_family"
  | "font_size"
  | "font_weight"
  | "line_height"
  | "text_color"
  | "text_shadow"
  | "background_opacity"
  | "rotation"
  | "max_lines"
>;

const TEXT_DESIGN_COLUMNS =
  "card_variant_id, language_code, text_x, text_y, text_width, alignment, font_family, font_size, font_weight, line_height, text_color, text_shadow, background_opacity, rotation, max_lines";

export type PublicCatalogBackground = Pick<
  Database["public"]["Tables"]["catalog_backgrounds"]["Row"],
  "id" | "status" | "is_hidden" | "is_archived" | "deleted_at"
> & {
  primary_media_asset_id?: string | null;
  /** Small, lazily-loaded asset used by the catalog grid. */
  thumb_url?: string | null;
  /** Full-resolution asset, loaded only by the enlarged preview. */
  image_url?: string | null;
  width?: number | null;
  height?: number | null;
  orientation?: string | null;
};

export type PublicCatalogCard = {
  id: string;
  internal_name: string;
  status: string;
  is_hidden: boolean | null;
  is_archived: boolean | null;
  deleted_at: string | null;
  background: PublicCatalogBackground | null;
  primary_occasion: { slug: string; is_active: boolean | null } | null;
  additional: { occasion: { slug: string; is_active: boolean | null } | null }[];
  /** Stable DB-driven facet keys (ids + slugs) used for public filtering. */
  facets: string[];
  translations: { language_code: string; title: string | null; greeting_text: string | null }[];
  text_designs: PublicTextDesignRow[];
};

export const getPublicCatalogCards = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: variantData, error: variantError } = await supabaseAdmin
    .from("catalog_card_variants")
    .select("id, internal_name, background_id, primary_occasion_id, status, is_hidden, is_archived, deleted_at, display_order, created_at")
    .eq("status", "published")
    .or("is_hidden.eq.false,is_hidden.is.null")
    .or("is_archived.eq.false,is_archived.is.null")
    .is("deleted_at", null)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (variantError) throw variantError;

  const variants = (variantData ?? []) as VariantRow[];
  const variantIds = variants.map((variant) => variant.id);
  if (variantIds.length === 0) return [] as PublicCatalogCard[];

  const primaryOccasionIds = variants
    .map((variant) => variant.primary_occasion_id)
    .filter((id): id is string => Boolean(id));
  const backgroundIds = variants
    .map((variant) => variant.background_id)
    .filter((id): id is string => Boolean(id));

  const [
    additionalResult,
    translationsResult,
    backgroundsResult,
    textDesignsResult,
    categoryLinks,
    themeLinks,
    seasonLinks,
    recipientLinks,
  ] = await Promise.all([
    supabaseAdmin
      .from("card_variant_additional_occasions")
      .select("card_variant_id, occasion_id")
      .in("card_variant_id", variantIds),
    supabaseAdmin
      .from("catalog_card_translations")
      .select("card_variant_id, language_code, title, greeting_text")
      .in("card_variant_id", variantIds),
    backgroundIds.length > 0
      ? supabaseAdmin
          .from("catalog_backgrounds")
          .select("id, status, is_hidden, is_archived, deleted_at, primary_media_asset_id, width, height, orientation")
          .in("id", backgroundIds)
      : Promise.resolve({ data: [] as PublicCatalogBackground[], error: null }),
    supabaseAdmin
      .from("catalog_text_designs")
      .select(TEXT_DESIGN_COLUMNS)
      .in("card_variant_id", variantIds),
    supabaseAdmin
      .from("card_variant_categories")
      .select("card_variant_id, category_id")
      .in("card_variant_id", variantIds),
    supabaseAdmin
      .from("card_variant_themes")
      .select("card_variant_id, theme_id")
      .in("card_variant_id", variantIds),
    supabaseAdmin
      .from("card_variant_seasons")
      .select("card_variant_id, season_id")
      .in("card_variant_id", variantIds),
    supabaseAdmin
      .from("card_variant_recipients")
      .select("card_variant_id, recipient_id")
      .in("card_variant_id", variantIds),
  ]);

  if (additionalResult.error) throw additionalResult.error;
  if (translationsResult.error) throw translationsResult.error;
  if (backgroundsResult.error) throw backgroundsResult.error;
  if (textDesignsResult.error) throw textDesignsResult.error;

  // Taxonomy slugs make filtering language-independent (ids are kept too).
  const [categoryRows, themeRows, seasonRows, recipientRows] = await Promise.all([
    supabaseAdmin.from("catalog_categories").select("id, slug"),
    supabaseAdmin.from("catalog_themes").select("id, slug"),
    supabaseAdmin.from("catalog_seasons").select("id, slug"),
    supabaseAdmin.from("catalog_recipients").select("id, slug"),
  ]);
  const slugById = new Map<string, string>();
  for (const res of [categoryRows, themeRows, seasonRows, recipientRows]) {
    for (const row of (res.data ?? []) as { id: string; slug: string }[]) slugById.set(row.id, row.slug);
  }
  const facetsByVariant = new Map<string, Set<string>>();
  const addFacet = (variantId: string, id: string | null | undefined) => {
    if (!id) return;
    const set = facetsByVariant.get(variantId) ?? new Set<string>();
    set.add(id);
    const slug = slugById.get(id);
    if (slug) set.add(slug);
    facetsByVariant.set(variantId, set);
  };
  for (const row of (categoryLinks.data ?? []) as { card_variant_id: string; category_id: string }[])
    addFacet(row.card_variant_id, row.category_id);
  for (const row of (themeLinks.data ?? []) as { card_variant_id: string; theme_id: string }[])
    addFacet(row.card_variant_id, row.theme_id);
  for (const row of (seasonLinks.data ?? []) as { card_variant_id: string; season_id: string }[])
    addFacet(row.card_variant_id, row.season_id);
  for (const row of (recipientLinks.data ?? []) as { card_variant_id: string; recipient_id: string }[])
    addFacet(row.card_variant_id, row.recipient_id);

  const additionalRows = (additionalResult.data ?? []) as AdditionalOccasionRow[];
  const translationRows = (translationsResult.data ?? []) as TranslationRow[];
  const backgroundRows = (backgroundsResult.data ?? []) as PublicCatalogBackground[];

  // Background images live in a private bucket — resolve short-lived signed URLs
  // so published cards render their real artwork on the public catalog.
  const assetIds = backgroundRows
    .map((row) => row.primary_media_asset_id)
    .filter((id): id is string => Boolean(id));

  if (assetIds.length > 0) {
    const { data: assets } = await supabaseAdmin
      .from("media_assets")
      .select("id, storage_bucket, storage_path, width, height")
      .in("id", assetIds);

    const signed = await Promise.all(
      (assets ?? []).map(async (asset) => {
        const { data } = await supabaseAdmin.storage
          .from(asset.storage_bucket)
          .createSignedUrl(asset.storage_path, 60 * 60);
        // Ask for a downscaled render for the grid; fall back to the full asset
        // when image transformation is unavailable on the bucket.
        const { data: thumb } = await supabaseAdmin.storage
          .from(asset.storage_bucket)
          .createSignedUrl(asset.storage_path, 60 * 60, {
            transform: { width: 480, quality: 70, resize: "contain" },
          });
        return [asset.id, { full: data?.signedUrl ?? null, thumb: thumb?.signedUrl ?? data?.signedUrl ?? null }] as const;
      }),
    );
    const urlByAsset = new Map(signed);
    const dimsByAsset = new Map(
      (assets ?? []).map((a) => [a.id, { width: a.width, height: a.height }] as const),
    );
    for (const row of backgroundRows) {
      const urls = row.primary_media_asset_id ? urlByAsset.get(row.primary_media_asset_id) : undefined;
      row.image_url = urls?.full ?? null;
      row.thumb_url = urls?.thumb ?? urls?.full ?? null;
      // Prefer the true asset dimensions so tiles keep the original aspect ratio.
      const dims = row.primary_media_asset_id ? dimsByAsset.get(row.primary_media_asset_id) : undefined;
      if (dims?.width && dims?.height) {
        row.width = dims.width;
        row.height = dims.height;
      }
    }
  }

  const textDesignRows = (textDesignsResult.data ?? []) as PublicTextDesignRow[];
  const occasionIds = Array.from(
    new Set([
      ...primaryOccasionIds,
      ...additionalRows.map((row) => row.occasion_id),
    ]),
  );

  const occasionsResult = occasionIds.length > 0
    ? await supabaseAdmin
        .from("catalog_occasions")
        .select("id, slug, is_active")
        .in("id", occasionIds)
    : { data: [] as OccasionRow[], error: null };

  if (occasionsResult.error) throw occasionsResult.error;

  const occasionsById = new Map(((occasionsResult.data ?? []) as OccasionRow[]).map((row) => [row.id, row]));
  const backgroundsById = new Map(backgroundRows.map((row) => [row.id, row]));

  return variants.map((variant) => {
    const primaryOccasion = variant.primary_occasion_id
      ? occasionsById.get(variant.primary_occasion_id)
      : undefined;

    return {
      id: variant.id,
      internal_name: variant.internal_name,
      status: variant.status,
      is_hidden: variant.is_hidden,
      is_archived: variant.is_archived,
      deleted_at: variant.deleted_at,
      background: variant.background_id ? backgroundsById.get(variant.background_id) ?? null : null,
      primary_occasion: primaryOccasion
        ? { slug: primaryOccasion.slug, is_active: primaryOccasion.is_active }
        : null,
      additional: additionalRows
        .filter((row) => row.card_variant_id === variant.id)
        .map((row) => {
          const occasion = occasionsById.get(row.occasion_id);
          return {
            occasion: occasion ? { slug: occasion.slug, is_active: occasion.is_active } : null,
          };
        }),
      facets: Array.from(facetsByVariant.get(variant.id) ?? []),
      translations: translationRows
        .filter((row) => row.card_variant_id === variant.id)
        .map((row) => ({
          language_code: row.language_code,
          title: row.title,
          greeting_text: row.greeting_text,
        })),
      text_designs: textDesignRows.filter((row) => row.card_variant_id === variant.id),
    } satisfies PublicCatalogCard;
  });
});
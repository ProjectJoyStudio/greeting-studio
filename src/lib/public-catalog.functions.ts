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
> & { primary_media_asset_id?: string | null; image_url?: string | null };

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

  const [additionalResult, translationsResult, backgroundsResult, textDesignsResult] = await Promise.all([
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
          .select("id, status, is_hidden, is_archived, deleted_at, primary_media_asset_id")
          .in("id", backgroundIds)
      : Promise.resolve({ data: [] as PublicCatalogBackground[], error: null }),
    supabaseAdmin
      .from("catalog_text_designs")
      .select(TEXT_DESIGN_COLUMNS)
      .in("card_variant_id", variantIds),
  ]);

  if (additionalResult.error) throw additionalResult.error;
  if (translationsResult.error) throw translationsResult.error;
  if (backgroundsResult.error) throw backgroundsResult.error;
  if (textDesignsResult.error) throw textDesignsResult.error;

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
      .select("id, storage_bucket, storage_path")
      .in("id", assetIds);

    const signed = await Promise.all(
      (assets ?? []).map(async (asset) => {
        const { data } = await supabaseAdmin.storage
          .from(asset.storage_bucket)
          .createSignedUrl(asset.storage_path, 60 * 60);
        return [asset.id, data?.signedUrl ?? null] as const;
      }),
    );
    const urlByAsset = new Map(signed);
    for (const row of backgroundRows) {
      row.image_url = row.primary_media_asset_id
        ? urlByAsset.get(row.primary_media_asset_id) ?? null
        : null;
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
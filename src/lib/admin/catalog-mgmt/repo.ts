// Supabase-backed catalog repository. Keep raw Supabase queries here — do NOT
// scatter them across UI components. Types map between local UI shapes (slug-
// keyed) and DB rows (UUID + language_code junctions).

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  Background,
  CardVariant,
  Orientation,
  Taxonomy,
  TaxonomyKind,
  Translation,
  TextDesign,
} from "./types";
import { defaultTextDesign, emptyTranslation } from "./types";
import type { Lang } from "@/lib/i18n";

// Buckets
export const BUCKET_CATALOG_IMAGES = "catalog-images";
export const BUCKET_CATALOG_ANIMATIONS = "catalog-animations";
export const BUCKET_PUBLIC_PREVIEWS = "public-previews";

// ---------------------------------------------------------------------------
// Signed URLs (buckets are private in this workspace)
// ---------------------------------------------------------------------------
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_TTL = 60 * 60; // 1h

export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const key = `${bucket}::${path}`;
  const cached = signedUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(key, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL * 1000 });
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Storage: upload a background image (data URL or File)
// ---------------------------------------------------------------------------
export async function uploadBackgroundImage(
  file: File,
  ownerUserId?: string | null,
): Promise<{ mediaAssetId: string; bucket: string; path: string; signedUrl: string | null }> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${crypto.randomUUID()}.${ext}`;
  const bucket = BUCKET_CATALOG_IMAGES;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (upErr) throw upErr;

  // Measure width/height client-side
  const dim = await measureImage(file);

  const { data: asset, error: mErr } = await supabase
    .from("media_assets")
    .insert({
      owner_user_id: ownerUserId ?? null,
      asset_type: "image",
      purpose: "catalog_background",
      storage_bucket: bucket,
      storage_path: path,
      original_filename: file.name,
      mime_type: file.type,
      file_size: file.size,
      width: dim?.w,
      height: dim?.h,
      visibility: "public",
      processing_status: "ready",
      moderation_status: "approved",
    })
    .select("id")
    .single();

  if (mErr) {
    // Rollback: remove uploaded file so we don't leak orphans
    await supabase.storage.from(bucket).remove([path]);
    throw mErr;
  }

  const signedUrl = await getSignedUrl(bucket, path);
  return { mediaAssetId: asset.id, bucket, path, signedUrl };
}

function measureImage(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Taxonomy slug→id maps. Missing slugs are upserted on demand so the existing
// slug-keyed UI keeps working.
// ---------------------------------------------------------------------------
type TaxKind =
  | "occasion" | "recipient" | "category" | "tag" | "style" | "mood"
  | "visual_object" | "age_group" | "season" | "theme";

const TAX_TABLES: Record<TaxKind, { table: string; trans: string; fk: string }> = {
  occasion: { table: "catalog_occasions", trans: "catalog_occasion_translations", fk: "occasion_id" },
  recipient: { table: "catalog_recipients", trans: "catalog_recipient_translations", fk: "recipient_id" },
  category: { table: "catalog_categories", trans: "catalog_category_translations", fk: "category_id" },
  tag: { table: "catalog_tags", trans: "catalog_tag_translations", fk: "tag_id" },
  style: { table: "catalog_styles", trans: "catalog_style_translations", fk: "style_id" },
  mood: { table: "catalog_moods", trans: "catalog_mood_translations", fk: "mood_id" },
  visual_object: { table: "catalog_visual_objects", trans: "catalog_visual_object_translations", fk: "visual_object_id" },
  age_group: { table: "catalog_age_groups", trans: "catalog_age_group_translations", fk: "age_group_id" },
  season: { table: "catalog_seasons", trans: "catalog_season_translations", fk: "season_id" },
  theme: { table: "catalog_themes", trans: "catalog_theme_translations", fk: "theme_id" },
};

// Bridge from local Taxonomy kind → DB kind
export const LOCAL_TAX_KIND: Record<TaxonomyKind, TaxKind | null> = {
  occasion: "occasion",
  recipient: "recipient",
  style: "style",
  mood: "mood",
  visualObject: "visual_object",
  ageGroup: "age_group",
  orientation: null, // stored as column, not a table
  season: "season",
  theme: "theme",
};

export type SlugIdMap = Record<TaxKind, Map<string, string>>;

export async function fetchAllTaxonomyIds(): Promise<SlugIdMap> {
  const result: Partial<SlugIdMap> = {};
  await Promise.all(
    (Object.keys(TAX_TABLES) as TaxKind[]).map(async (kind) => {
      const { data, error } = await supabase.from(TAX_TABLES[kind].table as never).select("id, slug");
      const map = new Map<string, string>();
      if (!error && data) {
        for (const row of data as Array<{ id: string; slug: string }>) map.set(row.slug, row.id);
      }
      result[kind] = map;
    }),
  );
  return result as SlugIdMap;
}

// Ensure every locally-known slug exists in DB (with an English fallback name).
// Safe to call repeatedly — uses ON CONFLICT (slug) DO NOTHING semantics.
export async function ensureTaxonomyForLocal(local: Taxonomy): Promise<SlugIdMap> {
  const map = await fetchAllTaxonomyIds();
  const langs: Lang[] = ["ru", "en", "de", "uk", "fr", "pl"];
  for (const kind of Object.keys(local) as TaxonomyKind[]) {
    const dbKind = LOCAL_TAX_KIND[kind];
    if (!dbKind) continue;
    const { table, trans, fk } = TAX_TABLES[dbKind];
    const existing = map[dbKind];
    const missing = local[kind].filter((i) => !existing.has(i.key));
    if (missing.length === 0) continue;
    // Insert missing taxonomy rows
    const inserts = missing.map((i) => ({
      slug: i.key,
      sort_order: i.displayOrder,
      is_active: i.active,
      ...(hasIconCol(dbKind) ? { icon: i.icon ?? null } : {}),
    }));
    const { data: inserted, error } = await supabase
      .from(table as never)
      .insert(inserts as never)
      .select("id, slug");
    if (error || !inserted) continue;
    const rows = inserted as unknown as Array<{ id: string; slug: string }>;
    for (const r of rows) existing.set(r.slug, r.id);
    // Insert translations
    const transRows: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      const item = missing.find((m) => m.key === r.slug);
      if (!item) continue;
      for (const l of langs) {
        const name = item.names[l] || item.names.en || item.key;
        transRows.push({ [fk]: r.id, language_code: l, name });
      }
    }
    if (transRows.length) {
      await supabase.from(trans as never).insert(transRows as never);
    }
  }
  return map;
}

function hasIconCol(kind: TaxKind): boolean {
  return ["occasion", "recipient", "category"].includes(kind);
}

// ---------------------------------------------------------------------------
// Backgrounds
// ---------------------------------------------------------------------------
type BgRow = Database["public"]["Tables"]["catalog_backgrounds"]["Row"];
type MaRow = Database["public"]["Tables"]["media_assets"]["Row"];

export interface BackgroundWithAsset {
  row: BgRow;
  asset: MaRow | null;
}

export async function listBackgrounds(): Promise<BackgroundWithAsset[]> {
  const { data, error } = await supabase
    .from("catalog_backgrounds")
    .select("*, primary_asset:media_assets!catalog_backgrounds_primary_media_asset_id_fkey(*)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const { primary_asset, ...row } = r as BgRow & { primary_asset: MaRow | null };
    return { row: row as BgRow, asset: primary_asset };
  });
}

export async function insertBackground(input: {
  internalName: string;
  orientation: Orientation;
  status: BgRow["status"];
  mediaAssetId: string | null;
  width?: number;
  height?: number;
  internalNotes?: string;
}): Promise<BgRow> {
  const { data, error } = await supabase
    .from("catalog_backgrounds")
    .insert({
      internal_name: input.internalName,
      orientation: input.orientation,
      status: input.status,
      primary_media_asset_id: input.mediaAssetId,
      thumbnail_media_asset_id: input.mediaAssetId,
      width: input.width,
      height: input.height,
      internal_notes: input.internalNotes,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateBackground(id: string, patch: Partial<BgRow>): Promise<void> {
  const { error } = await supabase.from("catalog_backgrounds").update(patch).eq("id", id);
  if (error) throw error;
}

export async function softDeleteBackground(id: string): Promise<void> {
  const { error } = await supabase
    .from("catalog_backgrounds")
    .update({ deleted_at: new Date().toISOString(), is_archived: true })
    .eq("id", id);
  if (error) throw error;
}

export async function hardDeleteBackground(id: string): Promise<void> {
  const { error } = await supabase.from("catalog_backgrounds").delete().eq("id", id);
  if (error) throw error;
}

// Shallow patch (no junctions / no translations) — used for bulk status/flag changes.
export async function patchVariantShallow(
  id: string,
  patch: {
    status?: CvRow["status"];
    is_new?: boolean;
    is_popular?: boolean;
    is_recommended?: boolean;
    is_hidden?: boolean;
    is_archived?: boolean;
    allow_sharing?: boolean;
    allow_downloading?: boolean;
    display_order?: number;
    internal_name?: string;
    internal_notes?: string | null;
    publication_date?: string | null;
    primary_occasion_id?: string | null;
    background_id?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("catalog_card_variants").update(patch).eq("id", id);
  if (error) throw error;
}

export async function patchBackgroundShallow(
  id: string,
  patch: {
    internal_name?: string;
    orientation?: Orientation;
    status?: BgRow["status"];
    internal_notes?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("catalog_backgrounds").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Taxonomy CRUD (single item)
// ---------------------------------------------------------------------------
import type { TaxonomyItem } from "./types";

export async function insertTaxonomyItemDb(
  dbKind: TaxKind,
  item: TaxonomyItem,
): Promise<string | null> {
  const { table, trans, fk } = TAX_TABLES[dbKind];
  const langs: Lang[] = ["ru", "en", "de", "uk", "fr", "pl"];
  const insertRow: Record<string, unknown> = {
    slug: item.key,
    sort_order: item.displayOrder,
    is_active: item.active,
  };
  if (hasIconCol(dbKind)) insertRow.icon = item.icon ?? null;
  const { data, error } = await supabase.from(table as never).insert(insertRow as never).select("id").single();
  if (error || !data) return null;
  const id = (data as { id: string }).id;
  const trRows = langs.map((l) => ({
    [fk]: id,
    language_code: l,
    name: item.names[l] || item.names.en || item.key,
  }));
  await supabase.from(trans as never).insert(trRows as never);
  return id;
}

export async function updateTaxonomyItemDb(
  dbKind: TaxKind,
  id: string,
  patch: Partial<TaxonomyItem>,
): Promise<void> {
  const { table, trans, fk } = TAX_TABLES[dbKind];
  const rowPatch: Record<string, unknown> = {};
  if (patch.displayOrder !== undefined) rowPatch.sort_order = patch.displayOrder;
  if (patch.active !== undefined) rowPatch.is_active = patch.active;
  if (patch.icon !== undefined && hasIconCol(dbKind)) rowPatch.icon = patch.icon ?? null;
  if (Object.keys(rowPatch).length > 0) {
    await supabase.from(table as never).update(rowPatch as never).eq("id", id);
  }
  if (patch.names) {
    const trRows = Object.entries(patch.names)
      .filter(([, v]) => v !== undefined)
      .map(([lang, name]) => ({ [fk]: id, language_code: lang, name: name ?? "" }));
    if (trRows.length) {
      await supabase.from(trans as never).upsert(trRows as never, { onConflict: `${fk},language_code` });
    }
  }
}

export async function deleteTaxonomyItemDb(dbKind: TaxKind, id: string): Promise<void> {
  const { table } = TAX_TABLES[dbKind];
  await supabase.from(table as never).delete().eq("id", id);
}

export async function reorderTaxonomyItemsDb(
  dbKind: TaxKind,
  orderedIds: string[],
): Promise<void> {
  const { table } = TAX_TABLES[dbKind];
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from(table as never).update({ sort_order: idx + 1 } as never).eq("id", id),
    ),
  );
}

// Convert a data URL to a File so we can reuse the upload path.
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type.split("/")[1] || "png";
  const name = filename.match(/\.[a-z0-9]+$/i) ? filename : `${filename}.${ext}`;
  return new File([blob], name, { type: blob.type });
}

// ---------------------------------------------------------------------------
// Card variants (with junctions, translations, text designs)
// ---------------------------------------------------------------------------
type CvRow = Database["public"]["Tables"]["catalog_card_variants"]["Row"];

export async function listVariants(): Promise<{
  variants: CvRow[];
  junctions: {
    additional_occasions: Array<{ card_variant_id: string; occasion_id: string }>;
    categories: Array<{ card_variant_id: string; category_id: string }>;
    recipients: Array<{ card_variant_id: string; recipient_id: string }>;
    tags: Array<{ card_variant_id: string; tag_id: string }>;
    visual_objects: Array<{ card_variant_id: string; visual_object_id: string }>;
    themes: Array<{ card_variant_id: string; theme_id: string }>;
    seasons: Array<{ card_variant_id: string; season_id: string }>;
  };
  translations: Array<Database["public"]["Tables"]["catalog_card_translations"]["Row"]>;
  textDesigns: Array<Database["public"]["Tables"]["catalog_text_designs"]["Row"]>;
}> {
  const [
    { data: variants, error: e1 },
    { data: ao }, { data: cats }, { data: recs }, { data: tags }, { data: vos }, { data: ths }, { data: sea },
    { data: trs }, { data: tds },
  ] = await Promise.all([
    supabase.from("catalog_card_variants").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("card_variant_additional_occasions").select("*"),
    supabase.from("card_variant_categories").select("*"),
    supabase.from("card_variant_recipients").select("*"),
    supabase.from("card_variant_tags").select("*"),
    supabase.from("card_variant_visual_objects").select("*"),
    supabase.from("card_variant_themes").select("*"),
    supabase.from("card_variant_seasons").select("*"),
    supabase.from("catalog_card_translations").select("*"),
    supabase.from("catalog_text_designs").select("*"),
  ]);
  if (e1) throw e1;
  return {
    variants: (variants ?? []) as CvRow[],
    junctions: {
      additional_occasions: (ao ?? []) as never,
      categories: (cats ?? []) as never,
      recipients: (recs ?? []) as never,
      tags: (tags ?? []) as never,
      visual_objects: (vos ?? []) as never,
      themes: (ths ?? []) as never,
      seasons: (sea ?? []) as never,
    },
    translations: (trs ?? []) as never,
    textDesigns: (tds ?? []) as never,
  };
}

export interface VariantWritePayload {
  backgroundId: string;
  internalName: string;
  orientation: Orientation;
  status: CvRow["status"];
  primaryOccasionSlug?: string;
  styleSlug?: string;
  moodSlug?: string;
  ageGroupSlug?: string;
  additionalOccasionSlugs: string[];
  recipientSlugs: string[];
  categorySlugs: string[];
  tagSlugs: string[];
  visualObjectSlugs: string[];
  themeSlugs: string[];
  seasonSlugs: string[];
  isNew: boolean;
  isPopular: boolean;
  isRecommended: boolean;
  isHidden: boolean;
  isArchived: boolean;
  allowSharing: boolean;
  allowDownloading: boolean;
  displayOrder: number;
  publicationDate?: string | null;
  internalNotes?: string;
  searchKeywords: string[];
  translations: Partial<Record<Lang, Translation>>;
  textDesign: TextDesign;
}

function slugToId(map: Map<string, string>, slug: string | undefined): string | null {
  if (!slug) return null;
  return map.get(slug) ?? null;
}

export async function upsertVariant(
  id: string | null,
  input: VariantWritePayload,
  ids: SlugIdMap,
): Promise<string> {
  const base = {
    background_id: input.backgroundId,
    internal_name: input.internalName,
    primary_occasion_id: slugToId(ids.occasion, input.primaryOccasionSlug),
    style_id: slugToId(ids.style, input.styleSlug),
    mood_id: slugToId(ids.mood, input.moodSlug),
    orientation: input.orientation,
    age_group_id: slugToId(ids.age_group, input.ageGroupSlug),
    status: input.status,
    is_new: input.isNew,
    is_popular: input.isPopular,
    is_recommended: input.isRecommended,
    is_hidden: input.isHidden,
    is_archived: input.isArchived,
    allow_sharing: input.allowSharing,
    allow_downloading: input.allowDownloading,
    display_order: input.displayOrder,
    publication_date: input.publicationDate ?? null,
    internal_notes: input.internalNotes ?? null,
    search_keywords: input.searchKeywords,
  };

  let variantId: string;
  if (id) {
    const { error } = await supabase.from("catalog_card_variants").update(base).eq("id", id);
    if (error) throw error;
    variantId = id;
  } else {
    const { data, error } = await supabase.from("catalog_card_variants").insert(base).select("id").single();
    if (error) throw error;
    variantId = data.id;
  }

  // Sync junctions (replace-all strategy)
  await syncJunction("card_variant_additional_occasions", "occasion_id", variantId, input.additionalOccasionSlugs, ids.occasion);
  await syncJunction("card_variant_categories", "category_id", variantId, input.categorySlugs, ids.category);
  await syncJunction("card_variant_recipients", "recipient_id", variantId, input.recipientSlugs, ids.recipient);
  await syncJunction("card_variant_tags", "tag_id", variantId, input.tagSlugs, ids.tag);
  await syncJunction("card_variant_visual_objects", "visual_object_id", variantId, input.visualObjectSlugs, ids.visual_object);
  await syncJunction("card_variant_themes", "theme_id", variantId, input.themeSlugs, ids.theme);
  await syncJunction("card_variant_seasons", "season_id", variantId, input.seasonSlugs, ids.season);

  // Translations
  const trRows: Array<Record<string, unknown>> = [];
  for (const [lang, t] of Object.entries(input.translations)) {
    if (!t) continue;
    trRows.push({
      card_variant_id: variantId,
      language_code: lang,
      title: t.catalogTitle || null,
      greeting_text: t.textOnCard || null,
      description: t.shortDescription || null,
      search_keywords: t.searchKeywords ?? [],
      translation_status: t.catalogTitle || t.textOnCard ? "draft" : "missing",
    });
  }
  if (trRows.length) {
    const { error } = await supabase
      .from("catalog_card_translations")
      .upsert(trRows as never, { onConflict: "card_variant_id,language_code" });
    if (error) throw error;
  }

  // Text design (single row per variant, language-agnostic default)
  const td = input.textDesign;
  const { error: tdErr } = await supabase
    .from("catalog_text_designs")
    .upsert(
      {
        card_variant_id: variantId,
        language_code: null,
        text_x: td.x,
        text_y: td.y,
        text_width: td.width,
        alignment: td.alignment,
        font_family: td.fontFamily,
        font_size: td.fontSize,
        font_weight: td.fontWeight,
        line_height: td.lineHeight,
        text_color: td.textColor,
        background_opacity: td.backgroundOverlay,
        text_shadow: td.textShadow,
        rotation: td.rotation,
        max_lines: td.maxLines,
      } as never,
      { onConflict: "card_variant_id,language_code" },
    );
  if (tdErr) throw tdErr;

  return variantId;
}

async function syncJunction(
  table: string,
  fk: string,
  variantId: string,
  slugs: string[],
  slugMap: Map<string, string>,
): Promise<void> {
  await supabase.from(table as never).delete().eq("card_variant_id", variantId);
  const rows = slugs
    .map((s) => slugMap.get(s))
    .filter((v): v is string => Boolean(v))
    .map((id) => ({ card_variant_id: variantId, [fk]: id }));
  if (rows.length) {
    const { error } = await supabase.from(table as never).insert(rows as never);
    if (error) throw error;
  }
}

export async function softDeleteVariant(id: string): Promise<void> {
  const { error } = await supabase
    .from("catalog_card_variants")
    .update({ deleted_at: new Date().toISOString(), is_archived: true })
    .eq("id", id);
  if (error) throw error;
}

export async function hardDeleteVariant(id: string): Promise<void> {
  const { error } = await supabase.from("catalog_card_variants").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Convenience: build local Background/CardVariant shapes from DB rows.
// Used by the store during hydration.
// ---------------------------------------------------------------------------

export function rowToBackground(bg: BgRow, asset: MaRow | null, signedUrl: string | null): Background {
  const aspectRatio =
    bg.width && bg.height ? `${bg.width}:${bg.height}` : bg.orientation === "vertical" ? "4:5" : bg.orientation === "horizontal" ? "16:9" : "1:1";
  return {
    id: bg.id,
    internalName: bg.internal_name,
    sourceImageUrl: signedUrl ?? "",
    thumbnailUrl: signedUrl ?? "",
    orientation: bg.orientation as Orientation,
    aspectRatio,
    visualStyles: [],
    visualObjects: [],
    mood: [],
    status: bg.status as Background["status"],
    internalNotes: bg.internal_notes ?? undefined,
    createdAt: bg.created_at,
    updatedAt: bg.updated_at,
    gradientIndex: Math.floor((asset?.file_size ?? 0) % 8),
    mediaAssetId: bg.primary_media_asset_id ?? null,
    storageBucket: asset?.storage_bucket ?? null,
    storagePath: asset?.storage_path ?? null,
  };
}

// Reverse maps from DB id → slug for translation shapes
export type IdSlugMap = Record<TaxKind, Map<string, string>>;
export function reverseSlugMap(m: SlugIdMap): IdSlugMap {
  const out = {} as IdSlugMap;
  (Object.keys(m) as TaxKind[]).forEach((k) => {
    const rev = new Map<string, string>();
    m[k].forEach((v, slug) => rev.set(v, slug));
    out[k] = rev;
  });
  return out;
}

// Helper — construct a full local CardVariant from DB row + junctions + translations + text design
export function rowsToVariant(
  v: CvRow,
  idSlug: IdSlugMap,
  addOccIds: string[],
  recIds: string[],
  catIds: string[],
  tagIds: string[],
  voIds: string[],
  themeIds: string[],
  seasonIds: string[],
  trs: Array<Database["public"]["Tables"]["catalog_card_translations"]["Row"]>,
  td: Database["public"]["Tables"]["catalog_text_designs"]["Row"] | undefined,
): CardVariant {
  const translations: Partial<Record<Lang, Translation>> = {};
  for (const t of trs) {
    const l = t.language_code as Lang;
    translations[l] = {
      locale: l,
      catalogTitle: t.title ?? "",
      shortDescription: t.description ?? "",
      textOnCard: t.greeting_text ?? "",
      searchKeywords: t.search_keywords ?? [],
    };
  }
  if (Object.keys(translations).length === 0) translations.en = emptyTranslation("en");
  const design: TextDesign = td
    ? {
        x: Number(td.text_x),
        y: Number(td.text_y),
        width: Number(td.text_width),
        alignment: (td.alignment as TextDesign["alignment"]) ?? "center",
        fontFamily: td.font_family,
        fontSize: Number(td.font_size),
        fontWeight: td.font_weight,
        lineHeight: Number(td.line_height),
        textColor: td.text_color,
        textShadow: td.text_shadow,
        backgroundOverlay: Number(td.background_opacity),
        rotation: Number(td.rotation),
        maxLines: td.max_lines,
      }
    : defaultTextDesign();
  return {
    id: v.id,
    backgroundId: v.background_id,
    internalName: v.internal_name,
    primaryOccasion: v.primary_occasion_id ? idSlug.occasion.get(v.primary_occasion_id) ?? "" : "",
    additionalOccasions: addOccIds.map((i) => idSlug.occasion.get(i) ?? "").filter(Boolean),
    recipients: recIds.map((i) => idSlug.recipient.get(i) ?? "").filter(Boolean),
    styles: v.style_id ? [idSlug.style.get(v.style_id) ?? ""].filter(Boolean) : [],
    visualObjects: voIds.map((i) => idSlug.visual_object.get(i) ?? "").filter(Boolean),
    mood: v.mood_id ? [idSlug.mood.get(v.mood_id) ?? ""].filter(Boolean) : [],
    ageGroup: v.age_group_id ? idSlug.age_group.get(v.age_group_id) ?? "all_ages" : "all_ages",
    orientation: v.orientation as Orientation,
    translations,
    textDesign: design,
    displayOrder: v.display_order,
    isNew: v.is_new,
    isPopular: v.is_popular,
    isRecommended: v.is_recommended,
    allowSharing: v.allow_sharing,
    allowDownloading: v.allow_downloading,
    status: v.status as CardVariant["status"],
    publishAt: v.publication_date ?? undefined,
    internalNotes: v.internal_notes ?? undefined,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };
}

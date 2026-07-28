// ---------------------------------------------------------------------------
// Homepage hero showcase — admin-managed cards.
//
// The three overlapping cards in the homepage hero are fully data driven:
// images, order, enabled state and destination all come from the database and
// can be changed in Admin → Homepage → Hero Showcase without a code change.
// ---------------------------------------------------------------------------
import { supabase } from "@/integrations/supabase/client";

export const HERO_BUCKET = "hero-showcase";

export interface HeroCard {
  id: string;
  imageUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  gradient: string | null;
  altText: string | null;
  linkTo: string;
  isEnabled: boolean;
  sortOrder: number;
  /** Resolved, renderable image source (signed URL for private storage). */
  resolvedImage?: string | null;
}

/** Destinations an administrator may pick for a hero card. */
export const HERO_LINK_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "/catalog", labelKey: "hs_link_catalog" },
  { value: "/studio", labelKey: "hs_link_studio" },
  { value: "/showcase", labelKey: "hs_link_showcase" },
  { value: "/daily", labelKey: "hs_link_daily" },
  { value: "/calendar", labelKey: "hs_link_calendar" },
  { value: "/corporate-orders", labelKey: "hs_link_corporate" },
  { value: "/personal-orders", labelKey: "hs_link_personal" },
  { value: "/free-greeting", labelKey: "hs_link_free" },
  { value: "/pricing", labelKey: "hs_link_pricing" },
];

/** Warm fallback gradients used when a card has no uploaded image yet. */
export const HERO_FALLBACK_GRADIENTS = [
  "linear-gradient(160deg, oklch(0.9 0.06 70), oklch(0.72 0.13 45))",
  "linear-gradient(160deg, oklch(0.42 0.11 30), oklch(0.28 0.08 20))",
  "linear-gradient(160deg, oklch(0.94 0.05 340), oklch(0.7 0.11 340))",
];

type Row = {
  id: string;
  image_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  gradient: string | null;
  alt_text: string | null;
  link_to: string;
  is_enabled: boolean;
  sort_order: number;
};

function mapRow(r: Row): HeroCard {
  return {
    id: r.id,
    imageUrl: r.image_url,
    storageBucket: r.storage_bucket,
    storagePath: r.storage_path,
    gradient: r.gradient,
    altText: r.alt_text,
    linkTo: r.link_to,
    isEnabled: r.is_enabled,
    sortOrder: r.sort_order,
  };
}

async function resolveImages(cards: HeroCard[]): Promise<HeroCard[]> {
  return Promise.all(
    cards.map(async (c) => {
      if (c.imageUrl) return { ...c, resolvedImage: c.imageUrl };
      if (!c.storagePath) return { ...c, resolvedImage: null };
      const { data } = await supabase.storage
        .from(c.storageBucket ?? HERO_BUCKET)
        .createSignedUrl(c.storagePath, 60 * 60 * 24);
      return { ...c, resolvedImage: data?.signedUrl ?? null };
    }),
  );
}

/** Public homepage read: only enabled cards, in admin-defined order. */
export async function fetchPublicHeroCards(): Promise<HeroCard[]> {
  const { data, error } = await supabase
    .from("hero_showcase_cards")
    .select("*")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true })
    .limit(3);
  if (error) throw error;
  return resolveImages(((data ?? []) as Row[]).map(mapRow));
}

/** Admin read: every card, enabled or not. */
export async function fetchAllHeroCards(): Promise<HeroCard[]> {
  const { data, error } = await supabase
    .from("hero_showcase_cards")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return resolveImages(((data ?? []) as Row[]).map(mapRow));
}

export async function createHeroCard(sortOrder: number): Promise<void> {
  const { error } = await supabase.from("hero_showcase_cards").insert({
    sort_order: sortOrder,
    link_to: "/catalog",
    gradient: HERO_FALLBACK_GRADIENTS[sortOrder % HERO_FALLBACK_GRADIENTS.length],
  });
  if (error) throw error;
}

export async function updateHeroCard(
  id: string,
  patch: Partial<{
    link_to: string;
    is_enabled: boolean;
    sort_order: number;
    alt_text: string | null;
    storage_bucket: string | null;
    storage_path: string | null;
    image_url: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase.from("hero_showcase_cards").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteHeroCard(id: string): Promise<void> {
  const { error } = await supabase.from("hero_showcase_cards").delete().eq("id", id);
  if (error) throw error;
}

/** Uploads an image into the hero bucket and points the card at it. */
export async function uploadHeroImage(id: string, file: File): Promise<void> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(HERO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) throw upErr;
  await updateHeroCard(id, {
    storage_bucket: HERO_BUCKET,
    storage_path: path,
    image_url: null,
  });
}
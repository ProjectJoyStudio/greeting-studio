// ---------------------------------------------------------------------------
// Studio promotional showcase — admin-managed promo video windows.
//
// Six windows mirror the six Studio cards. Videos are uploaded manually in
// Admin → Studio promos; nothing is ever published automatically.
// ---------------------------------------------------------------------------
import { supabase } from "@/integrations/supabase/client";

export const STUDIO_PROMO_BUCKET = "studio-promos";

export interface StudioPromoWindow {
  id: string;
  slot: string;
  title: string;
  storageBucket: string | null;
  storagePath: string | null;
  videoUrl: string | null;
  isEnabled: boolean;
  sortOrder: number;
  /** Renderable video source (signed URL for private storage). */
  resolvedVideo?: string | null;
}

type Row = {
  id: string;
  slot: string;
  title: string;
  storage_bucket: string | null;
  storage_path: string | null;
  video_url: string | null;
  is_enabled: boolean;
  sort_order: number;
};

function mapRow(r: Row): StudioPromoWindow {
  return {
    id: r.id,
    slot: r.slot,
    title: r.title,
    storageBucket: r.storage_bucket,
    storagePath: r.storage_path,
    videoUrl: r.video_url,
    isEnabled: r.is_enabled,
    sortOrder: r.sort_order,
  };
}

async function resolveVideos(items: StudioPromoWindow[]): Promise<StudioPromoWindow[]> {
  return Promise.all(
    items.map(async (w) => {
      if (w.videoUrl) return { ...w, resolvedVideo: w.videoUrl };
      if (!w.storagePath) return { ...w, resolvedVideo: null };
      const { data } = await supabase.storage
        .from(w.storageBucket ?? STUDIO_PROMO_BUCKET)
        .createSignedUrl(w.storagePath, 60 * 60 * 24);
      return { ...w, resolvedVideo: data?.signedUrl ?? null };
    }),
  );
}

/** Public Studio read: only visible windows, in admin-defined order. */
export async function fetchPublicPromoWindows(): Promise<StudioPromoWindow[]> {
  const { data, error } = await supabase
    .from("studio_promo_windows")
    .select("*")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return resolveVideos(((data ?? []) as Row[]).map(mapRow));
}

/** Admin read: every window, visible or not. */
export async function fetchAllPromoWindows(): Promise<StudioPromoWindow[]> {
  const { data, error } = await supabase
    .from("studio_promo_windows")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return resolveVideos(((data ?? []) as Row[]).map(mapRow));
}

export async function updatePromoWindow(
  id: string,
  patch: Partial<{
    title: string;
    is_enabled: boolean;
    sort_order: number;
    storage_bucket: string | null;
    storage_path: string | null;
    video_url: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase.from("studio_promo_windows").update(patch).eq("id", id);
  if (error) throw error;
}

/** Uploads a promo video and points the window at it. */
export async function uploadPromoVideo(id: string, file: File): Promise<void> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(STUDIO_PROMO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "video/mp4" });
  if (upErr) throw upErr;
  await updatePromoWindow(id, {
    storage_bucket: STUDIO_PROMO_BUCKET,
    storage_path: path,
    video_url: null,
  });
}

/** Removes the stored video, leaving the window empty (placeholder shown). */
export async function deletePromoVideo(item: StudioPromoWindow): Promise<void> {
  if (item.storagePath) {
    await supabase.storage
      .from(item.storageBucket ?? STUDIO_PROMO_BUCKET)
      .remove([item.storagePath]);
  }
  await updatePromoWindow(item.id, {
    storage_bucket: null,
    storage_path: null,
    video_url: null,
  });
}
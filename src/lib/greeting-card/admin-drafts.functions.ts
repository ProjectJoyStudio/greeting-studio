import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DRAFT_BUCKET = "user-card-drafts";
const CATALOG_BUCKET = "catalog-images";

export type UserDraftRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  prompt: string;
  greeting_text: string;
  keywords: string[];
  created_at: string;
  image_url: string | null;
};

/**
 * Copies ONLY the image of a user draft into the catalogue drafts area
 * (a draft catalog background). No prompt, email, date or other user
 * metadata is carried over. The original draft stays untouched.
 */
export const addUserDraftToCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { draftId: string }) => {
    if (!input?.draftId) throw new Error("draftId is required");
    return { draftId: input.draftId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: row, error } = await context.supabase
      .from("user_card_drafts")
      .select("id, storage_bucket, storage_path")
      .eq("id", data.draftId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("draft_not_found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const download = await supabaseAdmin.storage
      .from(row.storage_bucket ?? DRAFT_BUCKET)
      .download(row.storage_path);
    if (download.error || !download.data) throw new Error(download.error?.message ?? "download_failed");

    const ext = (row.storage_path.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetPath = `${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    const contentType = download.data.type || `image/${ext === "jpg" ? "jpeg" : ext}`;

    const upload = await supabaseAdmin.storage
      .from(CATALOG_BUCKET)
      .upload(targetPath, bytes, { contentType, upsert: false });
    if (upload.error) throw new Error(upload.error.message);

    const { data: asset, error: assetErr } = await supabaseAdmin
      .from("media_assets")
      .insert({
        asset_type: "image",
        purpose: "catalog_background",
        storage_bucket: CATALOG_BUCKET,
        storage_path: targetPath,
        mime_type: contentType,
        file_size: bytes.byteLength,
        visibility: "public",
        processing_status: "ready",
        moderation_status: "approved",
      })
      .select("id")
      .single();
    if (assetErr) {
      await supabaseAdmin.storage.from(CATALOG_BUCKET).remove([targetPath]);
      throw new Error(assetErr.message);
    }

    const { data: bg, error: bgErr } = await supabaseAdmin
      .from("catalog_backgrounds")
      .insert({
        internal_name: `Imported background ${targetPath.slice(0, 8)}`,
        status: "draft",
        primary_media_asset_id: asset.id,
        thumbnail_media_asset_id: asset.id,
      })
      .select("id")
      .single();
    if (bgErr) throw new Error(bgErr.message);

    return { ok: true as const, backgroundId: bg.id };
  });

/** Administrator-only list of cards users rejected. Never public. */
export const listUserDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserDraftRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("user_card_drafts")
      .select("id, user_id, user_email, prompt, greeting_text, keywords, created_at, storage_bucket, storage_path")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return Promise.all(
      (rows ?? []).map(async (r) => {
        const signed = await supabaseAdmin.storage
          .from(r.storage_bucket ?? DRAFT_BUCKET)
          .createSignedUrl(r.storage_path, 60 * 60 * 6);
        return {
          id: r.id,
          user_id: r.user_id,
          user_email: r.user_email,
          prompt: r.prompt,
          greeting_text: r.greeting_text,
          keywords: r.keywords ?? [],
          created_at: r.created_at,
          image_url: signed.data?.signedUrl ?? null,
        } satisfies UserDraftRow;
      }),
    );
  });

async function assertAdmin(context: { supabase: { rpc: (fn: never, args: never) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await (context.supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  }).rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

/** Deletes a single rejected draft: its image and its record. */
export const deleteUserDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { draftId: string }) => {
    if (!input?.draftId) throw new Error("draftId is required");
    return { draftId: input.draftId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: row } = await context.supabase
      .from("user_card_drafts")
      .select("id, storage_bucket, storage_path")
      .eq("id", data.draftId)
      .maybeSingle();
    if (!row) return { ok: true as const, deleted: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(row.storage_bucket ?? DRAFT_BUCKET).remove([row.storage_path]);
    await context.supabase.from("user_card_drafts").delete().eq("id", row.id);
    return { ok: true as const, deleted: 1 };
  });

/**
 * Bulk delete scoped strictly to the User Drafts section: only rows in
 * user_card_drafts and only files inside the user-card-drafts bucket.
 * No other catalogue, draft, or media storage is touched.
 */
export const deleteAllUserDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data: rows, error } = await context.supabase
      .from("user_card_drafts")
      .select("id, storage_bucket, storage_path");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { ok: true as const, deleted: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const paths = rows
      .filter((r) => (r.storage_bucket ?? DRAFT_BUCKET) === DRAFT_BUCKET)
      .map((r) => r.storage_path);
    if (paths.length > 0) {
      for (let i = 0; i < paths.length; i += 100) {
        await supabaseAdmin.storage.from(DRAFT_BUCKET).remove(paths.slice(i, i + 100));
      }
    }
    await context.supabase
      .from("user_card_drafts")
      .delete()
      .in("id", rows.map((r) => r.id));
    return { ok: true as const, deleted: rows.length };
  });
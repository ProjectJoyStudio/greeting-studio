import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DRAFT_BUCKET = "user-card-drafts";

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
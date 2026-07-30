import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One deleted source image of the Live Greeting Cards section. */
export type DeletedLiveCardRow = {
  id: string;
  prompt: string;
  prompt_en: string | null;
  aspect_ratio: string | null;
  source: string | null;
  user_id: string;
  user_email: string | null;
  created_at: string;
  deleted_at: string | null;
  purge_after: string | null;
  image_url: string | null;
};

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data } = await (context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  }).rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

/** Every deleted live-card source image with owner, dates and a preview link. */
export const listDeletedLiveCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeletedLiveCardRow[]> => {
    await assertAdmin(context as never);
    const { getAdmin } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data, error } = await supabaseAdmin
      .from("live_greeting_cards")
      .select(
        "id, prompt, prompt_en, aspect_ratio, source, user_id, created_at, deleted_at, purge_after, storage_bucket, storage_path",
      )
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const emails = new Map<string, string | null>();
    const rows: DeletedLiveCardRow[] = [];
    for (const row of data ?? []) {
      let imageUrl: string | null = null;
      if (row.storage_bucket && row.storage_path) {
        const signed = await supabaseAdmin.storage
          .from(row.storage_bucket)
          .createSignedUrl(row.storage_path, 3600);
        imageUrl = signed.data?.signedUrl ?? null;
      }
      if (!emails.has(row.user_id)) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
        emails.set(row.user_id, u?.user?.email ?? null);
      }
      rows.push({
        id: row.id,
        prompt: row.prompt ?? "",
        prompt_en: row.prompt_en ?? null,
        aspect_ratio: row.aspect_ratio ?? null,
        source: row.source ?? null,
        user_id: row.user_id,
        user_email: emails.get(row.user_id) ?? null,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
        purge_after: row.purge_after,
        image_url: imageUrl,
      });
    }
    return rows;
  });

/** Puts the source image back into the owner's live greeting card session. */
export const restoreDeletedLiveCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => {
    if (!input?.cardId) throw new Error("cardId is required");
    return { cardId: input.cardId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, recordAdminAction } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data: card } = await supabaseAdmin
      .from("live_greeting_cards")
      .select("id, user_id, deleted_at, purge_after")
      .eq("id", data.cardId)
      .maybeSingle();
    if (!card) throw new Error("card_not_found");

    const { error } = await supabaseAdmin
      .from("live_greeting_cards")
      .update({ deleted_at: null, purge_after: null, status: "not_selected" })
      .eq("id", data.cardId);
    if (error) throw new Error(error.message);

    await recordAdminAction({
      actorUserId: context.userId,
      action: "live_card_image.restored",
      entityType: "live_greeting_card",
      entityId: card.id,
      affectedUserId: card.user_id,
      previous: { deleted_at: card.deleted_at, purge_after: card.purge_after },
      next: { deleted_at: null },
    });
    return { ok: true };
  });

/** Irreversible removal of the record and every stored file. */
export const purgeDeletedLiveCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => {
    if (!input?.cardId) throw new Error("cardId is required");
    return { cardId: input.cardId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, purgeLiveCardCompletely, recordAdminAction } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data: card } = await supabaseAdmin
      .from("live_greeting_cards")
      .select("id, user_id, prompt")
      .eq("id", data.cardId)
      .maybeSingle();
    if (!card) throw new Error("card_not_found");

    await purgeLiveCardCompletely(data.cardId);
    await recordAdminAction({
      actorUserId: context.userId,
      action: "live_card_image.purged",
      entityType: "live_greeting_card",
      entityId: card.id,
      affectedUserId: card.user_id,
      previous: { prompt: card.prompt },
    });
    return { ok: true };
  });

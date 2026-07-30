import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DeletedCardRow = {
  id: string;
  title: string | null;
  language: string;
  prompt: string;
  greeting_text: string;
  user_id: string;
  user_email: string | null;
  created_at: string;
  deleted_at: string | null;
  purge_after: string | null;
  file_size: number | null;
  image_url: string | null;
};

export type AdminActivityRow = {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_email: string | null;
  affected_email: string | null;
  previous_data: unknown;
  new_data: unknown;
};

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data } = await (context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  }).rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

/** Every deleted postcard with owner, dates, size and a preview link. */
export const listDeletedCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeletedCardRow[]> => {
    await assertAdmin(context as never);
    const { getAdmin, USER_CARD_BUCKET } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data, error } = await supabaseAdmin
      .from("user_greeting_cards")
      .select(
        "id, title, language, prompt, greeting_text, user_id, created_at, deleted_at, purge_after, file_size, storage_bucket, storage_path, final_storage_bucket, final_storage_path",
      )
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const emails = new Map<string, string | null>();
    const rows: DeletedCardRow[] = [];

    for (const row of data ?? []) {
      const bucket = row.final_storage_path
        ? row.final_storage_bucket || USER_CARD_BUCKET
        : row.storage_bucket || USER_CARD_BUCKET;
      const path = row.final_storage_path || row.storage_path;

      let imageUrl: string | null = null;
      let size = row.file_size ?? null;
      if (path) {
        const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
        imageUrl = signed.data?.signedUrl ?? null;
        if (size == null) {
          const dir = path.split("/").slice(0, -1).join("/");
          const name = path.split("/").pop() ?? "";
          const listed = await supabaseAdmin.storage.from(bucket).list(dir, { search: name, limit: 1 });
          const meta = listed.data?.[0]?.metadata as { size?: number } | undefined;
          size = typeof meta?.size === "number" ? meta.size : null;
        }
      }

      if (!emails.has(row.user_id)) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
        emails.set(row.user_id, u?.user?.email ?? null);
      }

      rows.push({
        id: row.id,
        title: row.title,
        language: row.language,
        prompt: row.prompt,
        greeting_text: row.greeting_text,
        user_id: row.user_id,
        user_email: emails.get(row.user_id) ?? null,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
        purge_after: row.purge_after,
        file_size: size,
        image_url: imageUrl,
      });
    }
    return rows;
  });

/** Returns the postcard to the owner's dashboard with the project intact. */
export const restoreDeletedCard = createServerFn({ method: "POST" })
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
      .from("user_greeting_cards")
      .select("id, user_id, deleted_at, purge_after")
      .eq("id", data.cardId)
      .maybeSingle();
    if (!card) throw new Error("card_not_found");

    const { error } = await supabaseAdmin
      .from("user_greeting_cards")
      .update({ deleted_at: null, purge_after: null, deleted_by: null })
      .eq("id", data.cardId);
    if (error) throw new Error(error.message);

    await recordAdminAction({
      actorUserId: context.userId,
      action: "user_card.restored",
      entityType: "user_greeting_card",
      entityId: card.id,
      affectedUserId: card.user_id,
      previous: { deleted_at: card.deleted_at, purge_after: card.purge_after },
      next: { deleted_at: null },
    });
    return { ok: true };
  });

/** Irreversible removal of record, project and every stored file. */
export const purgeDeletedCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => {
    if (!input?.cardId) throw new Error("cardId is required");
    return { cardId: input.cardId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, purgeCardCompletely, recordAdminAction } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data: card } = await supabaseAdmin
      .from("user_greeting_cards")
      .select("id, user_id, title")
      .eq("id", data.cardId)
      .maybeSingle();
    if (!card) throw new Error("card_not_found");

    await purgeCardCompletely(data.cardId);
    await recordAdminAction({
      actorUserId: context.userId,
      action: "user_card.purged",
      entityType: "user_greeting_card",
      entityId: card.id,
      affectedUserId: card.user_id,
      previous: { title: card.title },
    });
    return { ok: true };
  });

/** Logged whenever an administrator opens a user postcard. */
export const logAdminCardView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; userId?: string | null }) => ({
    cardId: String(input?.cardId ?? ""),
    userId: input?.userId ?? null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { recordAdminAction } = await import("./deleted-cards.server");
    await recordAdminAction({
      actorUserId: context.userId,
      action: "user_card.viewed",
      entityType: "user_greeting_card",
      entityId: data.cardId,
      affectedUserId: data.userId,
    });
    return { ok: true };
  });

export const getRetentionDays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { readRetentionDays } = await import("./deleted-cards.server");
    return { days: await readRetentionDays() };
  });

export const setRetentionDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days: number }) => {
    const days = Math.round(Number(input?.days));
    if (!Number.isFinite(days) || days < 1 || days > 3650) throw new Error("invalid_days");
    return { days };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, readRetentionDays, recordAdminAction, RETENTION_KEY } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();
    const previous = await readRetentionDays();

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: RETENTION_KEY, value: { days: data.days }, updated_by: context.userId }, { onConflict: "key" });
    if (error) throw new Error(error.message);

    await recordAdminAction({
      actorUserId: context.userId,
      action: "settings.retention_changed",
      entityType: "app_setting",
      entityId: RETENTION_KEY,
      previous: { days: previous },
      next: { days: data.days },
    });
    return { days: data.days };
  });

/** Administrator activity feed, newest first. */
export const listAdminActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminActivityRow[]> => {
    await assertAdmin(context as never);
    const { getAdmin } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("id, created_at, action, entity_type, entity_id, actor_user_id, previous_data, new_data, request_metadata")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const emails = new Map<string, string | null>();
    const resolve = async (id: string | null | undefined): Promise<string | null> => {
      if (!id) return null;
      if (!emails.has(id)) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        emails.set(id, u?.user?.email ?? null);
      }
      return emails.get(id) ?? null;
    };

    const rows: AdminActivityRow[] = [];
    for (const row of data ?? []) {
      const meta = (row.request_metadata ?? {}) as { affected_user_id?: string | null };
      rows.push({
        id: row.id,
        created_at: row.created_at,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        actor_email: await resolve(row.actor_user_id),
        affected_email: await resolve(meta.affected_user_id ?? null),
        previous_data: row.previous_data,
        new_data: row.new_data,
      });
    }
    return rows;
  });
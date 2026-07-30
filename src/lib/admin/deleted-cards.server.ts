// Server-only helpers for the "Deleted User Postcards" recycle bin.

export const USER_CARD_BUCKET = "user-greeting-cards";
export const RETENTION_KEY = "deleted_cards_retention_days";
export const DEFAULT_RETENTION_DAYS = 30;

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function getAdmin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

export async function readRetentionDays(): Promise<number> {
  const supabaseAdmin = await getAdmin();
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", RETENTION_KEY)
    .maybeSingle();
  const raw = (data?.value ?? {}) as { days?: unknown };
  const days = Number(raw.days);
  return Number.isFinite(days) && days > 0 ? Math.min(Math.round(days), 3650) : DEFAULT_RETENTION_DAYS;
}

/**
 * Removes every trace of one postcard: storage objects (artwork + rendered
 * final image), activity rows and the database record itself.
 */
export async function purgeCardCompletely(cardId: string): Promise<boolean> {
  const supabaseAdmin = await getAdmin();
  const { data: card } = await supabaseAdmin
    .from("user_greeting_cards")
    .select("id, storage_bucket, storage_path, final_storage_bucket, final_storage_path")
    .eq("id", cardId)
    .maybeSingle();
  if (!card) return false;

  const byBucket = new Map<string, string[]>();
  const push = (bucket: string | null, path: string | null) => {
    if (!path) return;
    const b = bucket || USER_CARD_BUCKET;
    byBucket.set(b, [...(byBucket.get(b) ?? []), path]);
  };
  push(card.storage_bucket, card.storage_path);
  push(card.final_storage_bucket, card.final_storage_path);

  for (const [bucket, paths] of byBucket) {
    await supabaseAdmin.storage.from(bucket).remove(paths);
  }

  await supabaseAdmin.from("user_card_events").delete().eq("card_id", card.id);
  await supabaseAdmin.from("user_greeting_cards").delete().eq("id", card.id);
  return true;
}

/** Permanently removes every postcard whose retention period has expired. */
export async function purgeExpiredCards(): Promise<{ purged: number }> {
  const supabaseAdmin = await getAdmin();
  const { data: rows } = await supabaseAdmin
    .from("user_greeting_cards")
    .select("id")
    .not("deleted_at", "is", null)
    .lte("purge_after", new Date().toISOString())
    .limit(500);

  let purged = 0;
  for (const row of rows ?? []) {
    if (await purgeCardCompletely(row.id)) purged += 1;
  }
  return { purged };
}

/** Writes one administrator action into the activity log. */
export async function recordAdminAction(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  affectedUserId?: string | null;
  previous?: unknown;
  next?: unknown;
}): Promise<void> {
  const supabaseAdmin = await getAdmin();
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    previous_data: (input.previous ?? null) as never,
    new_data: (input.next ?? null) as never,
    request_metadata: { affected_user_id: input.affectedUserId ?? null },
  });
}
// ---------------------------------------------------------------------------
// Live Greeting Cards — deleted source images share the same recycle-bin rules
// as user postcards: soft delete, retention window, permanent purge.
// ---------------------------------------------------------------------------

/** Removes one live-card source image completely (storage + record). */
export async function purgeLiveCardCompletely(cardId: string): Promise<boolean> {
  const supabaseAdmin = await getAdmin();
  const { data: card } = await supabaseAdmin
    .from("live_greeting_cards")
    .select("id, storage_bucket, storage_path, video_storage_bucket, video_storage_path")
    .eq("id", cardId)
    .maybeSingle();
  if (!card) return false;

  const byBucket = new Map<string, string[]>();
  const push = (bucket: string | null, path: string | null) => {
    if (!bucket || !path) return;
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path]);
  };
  push(card.storage_bucket, card.storage_path);
  push(card.video_storage_bucket, card.video_storage_path);
  for (const [bucket, paths] of byBucket) {
    await supabaseAdmin.storage.from(bucket).remove(paths);
  }

  await supabaseAdmin.from("live_greeting_cards").delete().eq("id", card.id);
  return true;
}

/** Permanently removes every live-card image whose retention period expired. */
export async function purgeExpiredLiveCards(): Promise<{ purged: number }> {
  const supabaseAdmin = await getAdmin();
  const { data: rows } = await supabaseAdmin
    .from("live_greeting_cards")
    .select("id")
    .not("deleted_at", "is", null)
    .lte("purge_after", new Date().toISOString())
    .limit(500);

  let purged = 0;
  for (const row of rows ?? []) {
    if (await purgeLiveCardCompletely(row.id)) purged += 1;
  }
  return { purged };
}

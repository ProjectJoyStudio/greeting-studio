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





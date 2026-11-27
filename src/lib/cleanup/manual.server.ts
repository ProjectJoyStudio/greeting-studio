// Administrator "Delete permanently": same verified engine as the scheduler,
// plus explicit confirmation, active-rights checks and an admin audit entry.
import type { EntityType, RunResult } from "./engine";

export interface ManualPurgeResult {
  outcome: RunResult;
  counts: { total: number; verified: number; absent: number; protected: number; unresolved: number } | null;
}

export async function adminManualPurge(opts: {
  type: EntityType;
  id: string;
  actorUserId: string;
  affectedUserId: string | null;
  allowBeforeRetention: boolean;
  auditAction: string;
  auditEntityType: string;
}): Promise<ManualPurgeResult> {
  const { runManualCleanup } = await import("./cleanup.server");
  const outcome = await runManualCleanup(opts.type, opts.id, { actorUserId: opts.actorUserId, allowBeforeRetention: opts.allowBeforeRetention });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as unknown as { from: (t: string) => any })
    .from("cleanup_operations")
    .select("id, objects_total, objects_verified, objects_absent, objects_protected, objects_unresolved")
    .eq("entity_type", opts.type)
    .eq("entity_id", opts.id)
    .maybeSingle();
  const counts = data
    ? { total: data.objects_total, verified: data.objects_verified, absent: data.objects_absent, protected: data.objects_protected, unresolved: data.objects_unresolved }
    : null;
  const { recordAdminAction } = await import("@/lib/admin/deleted-cards.server");
  await recordAdminAction({
    actorUserId: opts.actorUserId,
    action: opts.auditAction,
    entityType: opts.auditEntityType,
    entityId: opts.id,
    affectedUserId: opts.affectedUserId,
    next: { outcome, cleanup_operation_id: data?.id ?? null, counts, allow_before_retention: opts.allowBeforeRetention },
  });
  return { outcome, counts };
}

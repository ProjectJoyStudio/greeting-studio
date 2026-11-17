import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Server-enforced: every Storage Admin call requires the super_admin role. */
async function assertSuperAdmin(context: { supabase: unknown; userId: string }) {
  const { data } = await (context.supabase as { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }> }).rpc("is_super_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}
const core = () => import("./storage-admin.server");
const safe = async <T,>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
  try { return { ok: true, data: await fn() }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "failed" }; }
};

export const storageAdminOverview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertSuperAdmin(context);
  const c = await core();
  const { readPlatformState } = await import("./platform-state.server");
  const [state, health, placements, cleanup, inventory, legacy, history, recovery] = await Promise.all([readPlatformState("global", true), c.latestHealth(), c.placementSummary(), c.cleanupSummary(), c.latestInventory(), c.legacyBucketUsage(), c.operationsHistory(30), c.recoveryReport()]);
  const { data: retention } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("app_settings").select("key,value").ilike("key", "%retention%");
  return JSON.parse(JSON.stringify({ state, health, placements, cleanup: { ...cleanup, books: cleanup.books.slice(0, 50) }, inventory, legacy, history, recovery, retention: retention ?? [] }));
});

export const storageAdminAction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { action: string; provider?: string; reason?: string; phrase?: string; expectedVersion?: number; operationId?: string; key?: string }) => {
    const actions = ["health", "inventory", "preflight", "activate_emergency", "start_recovery", "advance_recovery", "resolve_conflict", "return_primary", "verify_file", "retry_backup"];
    if (!actions.includes(input.action)) throw new Error("invalid_action");
    if (input.provider && !/^[a-z0-9]{1,12}$/.test(input.provider)) throw new Error("invalid_provider");
    if (input.key && (input.key.length > 600 || input.key.includes(".."))) throw new Error("invalid_key");
    return { ...input, reason: String(input.reason ?? "").slice(0, 500), phrase: String(input.phrase ?? "").slice(0, 60) };
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const c = await core();
    const actor = context.userId;
    return safe(async () => {
      switch (data.action) {
        case "health": { const r = await c.checkProviderHealth(data.provider ?? "", actor); await c.audit(actor, "health_check", r.provider, null, r); return r; }
        case "inventory": return c.advanceInventory(data.provider ?? "", actor);
        case "preflight": return c.emergencyPreflight();
        case "activate_emergency": return c.activateEmergency({ actor, reason: data.reason, phrase: data.phrase, expectedVersion: Number(data.expectedVersion) });
        case "start_recovery": return c.startRecovery({ actor });
        case "advance_recovery": return c.advanceRecovery(String(data.operationId), actor);
        case "resolve_conflict": return c.resolveConflictFromBackup(String(data.operationId), String(data.key), actor);
        case "return_primary": return c.returnToPrimary({ actor, phrase: data.phrase, expectedVersion: Number(data.expectedVersion) });
        case "verify_file": return c.verifyFile(String(data.key), actor);
        case "retry_backup": {
          const { readPlatformState } = await import("./platform-state.server");
          if ((await readPlatformState("global", true)).mode !== "normal") throw new Error("paused_during_emergency");
          const { backupToReserve } = await import("./backup.server");
          const r = await backupToReserve(String(data.key), { manual: true });
          await c.audit(actor, "backup_retry", String(data.key), null, r);
          return r;
        }
      }
      throw new Error("invalid_action");
    });
  });

export const storageAdminFiles = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string; area?: string; status?: string; page?: number }) => ({ query: String(input.query ?? "").slice(0, 300), area: ["users", "system"].includes(String(input.area)) ? String(input.area) : "", status: ["present", "deleted", "failed", "pending"].includes(String(input.status)) ? String(input.status) : "", page: Math.max(0, Math.min(10000, Number(input.page ?? 0) | 0)) }))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    return JSON.parse(JSON.stringify(await (await core()).listFiles({ ...data, pageSize: 25 })));
  });

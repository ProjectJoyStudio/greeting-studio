// Administrator read-only view of the verified automatic cleanup history.
// Opening it never triggers or retries any deletion.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CleanupOperationRow {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  attempts: number;
  total: number;
  verified: number;
  absent: number;
  protected: number;
  unresolved: number;
  lastRunAt: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
  isTest: boolean;
  purgeAfter: string | null;
}
export interface CleanupSummary {
  verified: number;
  absent: number;
  pending: number;
  failed: number;
  notVerified: number;
  lastRunAt: string | null;
  nextRetryAt: string | null;
}
export interface CleanupObjectRow {
  id: string;
  bucket: string;
  keyTail: string;
  role: string;
  status: string;
  attempt: number;
  apiResult: string | null;
  verification: string | null;
  error: string | null;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  history: Array<{ attempt: number; at: string; status: string; apiResult: string | null; verification: string | null; error: string | null }>;
}

type Loose = { from: (t: string) => any; rpc: (f: string, a: Record<string, unknown>) => any };

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as Loose;
  const { data } = await sb.rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

const STATUS = z.enum(["all", "open", "COMPLETED", "FAILED", "NOT_VERIFIED", "RETRY_REQUIRED", "CANCELLED"]);

export const listCleanupOperations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: STATUS.default("all") }).parse(d ?? {}))
  .handler(async ({ context, data }): Promise<{ rows: CleanupOperationRow[]; summary: CleanupSummary }> => {
    await assertAdmin(context);
    // Read through the admin's own session: RLS allows administrators only.
    const sb = context.supabase as Loose;
    let q = sb.from("cleanup_operations").select("*").order("updated_at", { ascending: false }).limit(100);
    if (data.status === "open") q = q.in("status", ["PENDING", "IN_PROGRESS", "RETRY_REQUIRED"]);
    else if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const { data: all } = await sb
      .from("cleanup_operations")
      .select("status, objects_verified, objects_absent, last_run_at, next_attempt_at")
      .limit(5000);
    const list = (all ?? []) as Record<string, unknown>[];
    const sum = (k: string) => list.reduce((n, r) => n + Number(r[k] ?? 0), 0);
    const by = (s: string[]) => list.filter((r) => s.includes(String(r["status"]))).length;
    const maxOf = (k: string, pick: (a: string, b: string) => boolean) =>
      list.map((r) => r[k] as string | null).filter((x): x is string => !!x).reduce<string | null>((a, b) => (a === null || pick(b, a) ? b : a), null);
    return {
      rows: ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
        id: String(r["id"]),
        entityType: String(r["entity_type"]),
        entityId: String(r["entity_id"]),
        status: String(r["status"]),
        attempts: Number(r["attempts"] ?? 0),
        total: Number(r["objects_total"] ?? 0),
        verified: Number(r["objects_verified"] ?? 0),
        absent: Number(r["objects_absent"] ?? 0),
        protected: Number(r["objects_protected"] ?? 0),
        unresolved: Number(r["objects_unresolved"] ?? 0),
        lastRunAt: (r["last_run_at"] as string | null) ?? null,
        nextAttemptAt: (r["next_attempt_at"] as string | null) ?? null,
        lastError: (r["last_error"] as string | null) ?? null,
        isTest: r["is_test"] === true,
        purgeAfter: (r["purge_after_snapshot"] as string | null) ?? null,
      })),
      summary: {
        verified: sum("objects_verified"),
        absent: sum("objects_absent"),
        pending: by(["PENDING", "IN_PROGRESS", "RETRY_REQUIRED"]),
        failed: by(["FAILED"]),
        notVerified: by(["NOT_VERIFIED"]),
        lastRunAt: maxOf("last_run_at", (a, b) => a > b),
        nextRetryAt: maxOf("next_attempt_at", (a, b) => a < b),
      },
    };
  });

export const listCleanupObjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ operationId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<CleanupObjectRow[]> => {
    await assertAdmin(context);
    const sb = context.supabase as Loose;
    const [{ data: objs, error }, { data: hist }] = await Promise.all([
      sb.from("cleanup_object_audit").select("*").eq("operation_id", data.operationId).order("created_at"),
      sb.from("cleanup_object_attempts").select("*").eq("operation_id", data.operationId).order("id"),
    ]);
    if (error) throw new Error(error.message);
    const h = (hist ?? []) as Record<string, unknown>[];
    return ((objs ?? []) as Record<string, unknown>[]).map((r) => {
      const key = String(r["object_key"]);
      return {
        id: String(r["id"]),
        bucket: String(r["bucket"]),
        // Owner folder is hidden; only the file name is shown.
        keyTail: key.split("/").slice(-1)[0] ?? "",
        role: String(r["role"]),
        status: String(r["status"]),
        attempt: Number(r["attempt"] ?? 0),
        apiResult: (r["api_result"] as string | null) ?? null,
        verification: (r["verification"] as string | null) ?? null,
        error: (r["error"] as string | null) ?? null,
        lastAttemptAt: (r["last_attempt_at"] as string | null) ?? null,
        nextAttemptAt: (r["next_attempt_at"] as string | null) ?? null,
        history: h
          .filter((x) => x["object_id"] === r["id"])
          .map((x) => ({
            attempt: Number(x["attempt"]),
            at: String(x["executed_at"]),
            status: String(x["status"]),
            apiResult: (x["api_result"] as string | null) ?? null,
            verification: (x["verification"] as string | null) ?? null,
            error: (x["error"] as string | null) ?? null,
          })),
      };
    });
  });

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


/** Setting holding how long a finished Memory Book copy is kept, in days. */
export const MEMORY_BOOK_RETENTION_KEY = "memory_book.completed_retention_days";

/** Default keeping period of a finished Memory Book. */
export const MEMORY_BOOK_RETENTION_DEFAULT_DAYS = 30;

/** The two agreed ways a book becomes finished. */
export type MemoryBookCompletion = "cabinet" | "download";

type Row = Record<string, unknown>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data: isAdmin } = await (
    context.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    }
  ).rpc("is_admin", { _user_id: context.userId });
  if (isAdmin !== true) throw new Error("forbidden");
}

function days(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return MEMORY_BOOK_RETENTION_DEFAULT_DAYS;
  return Math.min(3650, Math.max(1, Math.round(n)));
}

/** How long a finished Memory Book copy is kept, as configured by Admin. */
async function retentionDays(): Promise<number> {
  try {
    const db = await admin();
    const { data } = await db
      .from("app_settings")
      .select("value")
      .eq("key", MEMORY_BOOK_RETENTION_KEY)
      .maybeSingle();
    if (data?.value === null || data?.value === undefined) {
      return MEMORY_BOOK_RETENTION_DEFAULT_DAYS;
    }
    return days(data.value);
  } catch {
    return MEMORY_BOOK_RETENTION_DEFAULT_DAYS;
  }
}

/** Administrators read the current keeping period of finished books. */
export const getMemoryBookRetention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ days: number }> => {
    await assertAdmin(context);
    return { days: await retentionDays() };
  });

/** Administrators change the keeping period of finished books. */
export const setMemoryBookRetention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days: number }) => ({ days: days(input?.days) }))
  .handler(async ({ data, context }): Promise<{ days: number }> => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.from("app_settings").upsert(
      {
        key: MEMORY_BOOK_RETENTION_KEY,
        value: data.days as unknown as never,
        updated_by: context.userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { days: data.days };
  });

export interface MemoryBookCompletionResult {
  ok: boolean;
  error?: "not_found" | "failed";
  completedAt?: string;
  retentionExpiresAt?: string;
  alreadyCompleted?: boolean;
  pending?: boolean;
}

/**
 * Marks ONE Memory Book of the signed-in customer as finished. Only the two
 * agreed final actions call this; leaving the editor or autosave never does.
 * Repeating the same call keeps the first completion date.
 */
export const completeMemoryBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; method: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    method: (input?.method === "download" ? "download" : "cabinet") as MemoryBookCompletion,
  }))
  .handler(async ({ data, context }): Promise<MemoryBookCompletionResult> => {
    const { data: book } = await context.supabase
      .from("memory_book_projects")
      .select("id, status, completed_at, retention_expires_at, selected_cover_id, selected_leaf_id, credits_spent, storage_version")
      .eq("user_id", context.userId)
      .eq("id", data.bookId)
      .maybeSingle();
    const row = book as Row | null;
    if (!row || Number(row.credits_spent ?? 0) <= 0) return { ok: false, error: "not_found" };

    if (row.status === "completed" && typeof row.completed_at === "string") {
      const { storageOperation, cleanupBookWorking } = await import("./storage-package.server");
      const op = await storageOperation(data.bookId);
      if (op?.activated_at && ["cleanup_pending", "cleanup_running"].includes(op.stage)) {
        try { const cleanup = await cleanupBookWorking(context.userId, data.bookId); return { ok: true, pending: cleanup.pending }; }
        catch { /* A cleanup failure never makes the verified completed book unavailable. */ }
      }
      return {
        ok: true,
        alreadyCompleted: true,
        completedAt: row.completed_at,
        retentionExpiresAt:
          typeof row.retention_expires_at === "string" ? row.retention_expires_at : undefined,
      };
    }

    try {
      if (row.storage_version !== 2) {
        // No migration or cleanup of historical files is authorized by this order.
        const completedAt = new Date().toISOString();
        const retentionExpiresAt = new Date(Date.now() + await retentionDays() * 86400000).toISOString();
        const { error } = await context.supabase.from("memory_book_projects").update({ status: "completed", completed_at: completedAt, completion_method: data.method, retention_expires_at: retentionExpiresAt }).eq("id", data.bookId).eq("user_id", context.userId).neq("status", "completed");
        return error ? { ok: false, error: "failed" } : { ok: true, completedAt, retentionExpiresAt };
      }
      const { advanceBookPackage } = await import("./storage-package.server");
      const result = await advanceBookPackage(context.userId, data.bookId, data.method, await retentionDays());
      return { ok: result.ok, pending: result.ok || result.pending };
    } catch {
      return { ok: false, error: "failed" };
    }
  });

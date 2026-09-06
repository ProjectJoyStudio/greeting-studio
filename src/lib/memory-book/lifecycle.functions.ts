import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { MEMORY_BOOK_DESIGN_BUCKET } from "./designs";

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

/**
 * Removes the working design pictures of ONE finished book, keeping the
 * chosen cover and the chosen leaf. Never touches any other book.
 */
async function cleanupWorkingMaterials(bookId: string, keep: string[]) {
  const db = await admin();
  const { data } = await db
    .from("memory_book_designs")
    .select("id, bucket, path")
    .eq("book_id", bookId);
  const rows = (data ?? []) as unknown as Row[];
  const removable = rows.filter((r) => !keep.includes(String(r.id)));
  const paths = removable
    .filter((r) => r.bucket === MEMORY_BOOK_DESIGN_BUCKET && typeof r.path === "string")
    .map((r) => String(r.path));
  if (paths.length > 0) {
    try {
      await db.storage.from(MEMORY_BOOK_DESIGN_BUCKET).remove(paths);
    } catch {
      /* keeping the rows is safer than failing the completion */
    }
  }
  const ids = removable.map((r) => String(r.id));
  if (ids.length > 0) {
    await db.from("memory_book_designs").delete().in("id", ids).eq("book_id", bookId);
  }
}

export interface MemoryBookCompletionResult {
  ok: boolean;
  error?: "not_found";
  completedAt?: string;
  retentionExpiresAt?: string;
  alreadyCompleted?: boolean;
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
      .select("id, status, completed_at, retention_expires_at, selected_cover_id, selected_leaf_id, credits_spent")
      .eq("user_id", context.userId)
      .eq("id", data.bookId)
      .maybeSingle();
    const row = book as Row | null;
    if (!row || Number(row.credits_spent ?? 0) <= 0) return { ok: false, error: "not_found" };

    if (row.status === "completed" && typeof row.completed_at === "string") {
      return {
        ok: true,
        alreadyCompleted: true,
        completedAt: row.completed_at,
        retentionExpiresAt:
          typeof row.retention_expires_at === "string" ? row.retention_expires_at : undefined,
      };
    }

    const now = new Date();
    const keepDays = await retentionDays();
    const retentionExpiresAt = new Date(now.getTime() + keepDays * 86_400_000).toISOString();

    const keep = [row.selected_cover_id, row.selected_leaf_id]
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    await cleanupWorkingMaterials(data.bookId, keep);

    const db = await admin();
    await db
      .from("memory_book_projects")
      .update({
        status: "completed",
        completed_at: now.toISOString(),
        completion_method: data.method,
        retention_expires_at: retentionExpiresAt,
        working_cleaned_at: now.toISOString(),
        updated_at: now.toISOString(),
      } as never)
      .eq("id", data.bookId)
      .eq("user_id", context.userId);

    return { ok: true, completedAt: now.toISOString(), retentionExpiresAt };
  });

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
  const { memoryBookFileRemove } = await import("./storage.server");
  for (const row of removable) {
    const bucket = String(row.bucket ?? "");
    const path = typeof row.path === "string" ? row.path : "";
    // Only files that belong to this book are touched; a shared ready-made
    // design is referenced, never owned, so it is left alone.
    if (!path || (bucket !== MEMORY_BOOK_DESIGN_BUCKET && !path.includes("/memory-book/"))) continue;
    try {
      await memoryBookFileRemove(bucket, path);
    } catch {
      /* keeping the file is safer than failing the completion */
    }
  }
  const ids = removable.map((r) => String(r.id));
  if (ids.length > 0) {
    await db.from("memory_book_designs").delete().in("id", ids).eq("book_id", bookId);
  }
}

/**
 * Removes ONLY the page variants of a finished book that the book itself does
 * not use. The active background of every page is always kept, and anything
 * uncertain is kept as well.
 */
async function cleanupUnusedPageBackgrounds(userId: string, bookId: string) {
  const db = await admin();
  const { data: pageRows, error: pageError } = await db
    .from("memory_book_pages")
    .select("background_path")
    .eq("user_id", userId)
    .eq("book_id", bookId);
  // Without a reliable list of pages nothing is removed.
  if (pageError) return;
  const used = new Set(
    ((pageRows ?? []) as unknown as Row[])
      .map((r) => (typeof r.background_path === "string" ? r.background_path : ""))
      .filter((p) => p.length > 0),
  );

  const { data: variantRows, error: variantError } = await db
    .from("memory_book_page_backgrounds")
    .select("id, bucket, path")
    .eq("user_id", userId)
    .eq("book_id", bookId);
  if (variantError) return;

  const removable = ((variantRows ?? []) as unknown as Row[]).filter(
    (r) => typeof r.path === "string" && r.path.length > 0 && !used.has(String(r.path)),
  );
  if (removable.length === 0) return;

  const paths = removable
    .filter((r) => r.bucket === MEMORY_BOOK_DESIGN_BUCKET)
    .map((r) => String(r.path));
  if (paths.length > 0) {
    try {
      await db.storage.from(MEMORY_BOOK_DESIGN_BUCKET).remove(paths);
    } catch {
      /* keeping the files is safer than failing after completion */
    }
  }
  const ids = removable.map((r) => String(r.id));
  await db
    .from("memory_book_page_backgrounds")
    .delete()
    .in("id", ids)
    .eq("book_id", bookId)
    .eq("user_id", userId);
}

export interface MemoryBookCompletionResult {
  ok: boolean;
  error?: "not_found" | "failed";
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

    // FIRST the finished book is written and verified. Nothing is removed
    // before the completed state is safely stored.
    const db = await admin();
    const { error: saveError } = await db
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
    if (saveError) return { ok: false, error: "failed" };

    const { data: saved } = await db
      .from("memory_book_projects")
      .select("status, completed_at, retention_expires_at")
      .eq("id", data.bookId)
      .eq("user_id", context.userId)
      .maybeSingle();
    const savedRow = saved as Row | null;
    if (!savedRow || savedRow.status !== "completed") return { ok: false, error: "failed" };

    // ONLY NOW the unused working pictures are removed. The chosen cover, the
    // chosen leaf and every background the finished book uses are kept.
    const keep = [row.selected_cover_id, row.selected_leaf_id]
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    try {
      await cleanupWorkingMaterials(data.bookId, keep);
      await cleanupUnusedPageBackgrounds(context.userId, data.bookId);
    } catch {
      /* the book is already safely completed; cleanup may be retried later */
    }

    return {
      ok: true,
      completedAt:
        typeof savedRow.completed_at === "string" ? savedRow.completed_at : now.toISOString(),
      retentionExpiresAt:
        typeof savedRow.retention_expires_at === "string"
          ? savedRow.retention_expires_at
          : retentionExpiresAt,
    };
  });

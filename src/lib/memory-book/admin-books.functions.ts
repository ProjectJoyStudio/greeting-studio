// Administrator view of the customers' Memory Books.
//
// Everything here only LOOKS at a book. A book's content is never edited from
// the administration area: the only actions are about where copies of its
// files are kept, and each area is handled completely on its own.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminBookRow {
  id: string;
  userId: string;
  email: string | null;
  packageCode: string;
  leaves: number;
  internalPages: number;
  videoCapacity: number;
  creditsSpent: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  retentionExpiresAt: string | null;
  /** True when a reserve copy of one of its files is unfinished or failed. */
  backupProblem: boolean;
}

export interface AdminBookStorageObject {
  objectKey: string;
  provider: string;
  role: string;
  status: string;
  sizeBytes: number;
  verifiedAt: string | null;
  lastBackupAt: string | null;
  lastError: string | null;
  attempts: number;
}

export interface AdminBookProviderSummary {
  provider: "r2" | "b2";
  objects: number;
  presentObjects: number;
  problemObjects: number;
  totalBytes: number;
  lastVerifiedAt: string | null;
  deleteAfter: string | null;
  note: string | null;
}

export interface AdminBookDetail {
  book: AdminBookRow;
  providers: AdminBookProviderSummary[];
  objects: AdminBookStorageObject[];
}

type Client = { from: (t: string) => any; rpc: (fn: string, args: any) => Promise<any> };

async function admin(): Promise<Client> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Client;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data: ok } = await (
    context.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    }
  ).rpc("is_admin", { _user_id: context.userId });
  if (ok !== true) throw new Error("forbidden");
}

/** Every file of one book lives under this one address prefix. */
export function bookObjectPrefix(userId: string, bookId: string): string {
  return `users/${userId}/memory-book/${bookId}/`;
}

/** Sign-in address of every account, used only inside the admin area. */
async function emailMap(): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const user of data?.users ?? []) out.set(user.id, user.email ?? null);
  } catch {
    /* names are a convenience; the list still works without them */
  }
  return out;
}

async function logAction(
  actorUserId: string,
  action: string,
  entityId: string | null,
  previous: unknown,
  next: unknown,
) {
  const db = await admin();
  await db.from("admin_audit_log").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: "memory_book",
    entity_id: entityId,
    previous_data: previous ?? null,
    new_data: next ?? null,
  });
}

function rowToBook(r: Record<string, unknown>, email: string | null, problem: boolean): AdminBookRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    email,
    packageCode: String(r.package_code ?? ""),
    leaves: Number(r.leaves ?? 0),
    internalPages: Number(r.internal_pages ?? 0),
    videoCapacity: Number(r.video_capacity ?? 0),
    creditsSpent: Number(r.credits_spent ?? 0),
    status: String(r.status ?? ""),
    createdAt: String(r.created_at ?? ""),
    completedAt: (r.completed_at as string | null) ?? null,
    expiresAt: (r.expires_at as string | null) ?? null,
    retentionExpiresAt: (r.retention_expires_at as string | null) ?? null,
    backupProblem: problem,
  };
}

const BOOK_COLUMNS =
  "id, user_id, package_code, leaves, internal_pages, video_capacity, credits_spent, status, created_at, completed_at, expires_at, retention_expires_at";

/** The list of customer books, with the administrator's search and filters. */
export const adminListMemoryBooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string; filter?: string; limit?: number }) => ({
    search: String(input?.search ?? "").trim().slice(0, 120),
    filter: String(input?.filter ?? "all"),
    limit: Math.max(10, Math.min(200, Number(input?.limit ?? 50))),
  }))
  .handler(async ({ data, context }): Promise<{ books: AdminBookRow[] }> => {
    await assertAdmin(context);
    const db = await admin();

    let query = db.from("memory_book_projects").select(BOOK_COLUMNS).order("created_at", {
      ascending: false,
    });

    if (data.filter === "draft") query = query.neq("status", "completed");
    if (data.filter === "completed") query = query.eq("status", "completed");
    if (data.filter === "expired") {
      query = query.neq("status", "completed").lt("expires_at", new Date().toISOString());
    }

    // Searching by book address or by the customer behind it.
    const isUuid = /^[0-9a-f-]{36}$/i.test(data.search);
    const allEmails = await emailMap();
    if (data.search && !isUuid) {
      const needle = data.search.toLowerCase();
      const searchUserIds = [...allEmails.entries()]
        .filter(([, email]) => (email ?? "").toLowerCase().includes(needle))
        .map(([id]) => id);
      if (searchUserIds.length === 0) return { books: [] };
      query = query.in("user_id", searchUserIds);

    } else if (isUuid) {
      query = query.or(`id.eq.${data.search},user_id.eq.${data.search}`);
    }

    const { data: rows } = await query.limit(data.limit);
    const books = (rows ?? []) as Array<Record<string, unknown>>;
    if (books.length === 0) return { books: [] };

    const emails = allEmails;


    // One look at the reserve copies of all listed books at once.
    const problems = new Set<string>();
    const { data: badRows } = await db
      .from("storage_placements")
      .select("object_key")
      .eq("role", "backup")
      .in("status", ["pending", "copying", "failed"])
      .limit(5000);
    for (const row of (badRows ?? []) as Array<{ object_key: string }>) {
      const match = /^users\/[^/]+\/memory-book\/([^/]+)\//.exec(row.object_key);
      if (match?.[1]) problems.add(match[1]);
    }

    let list = books.map((b) =>
      rowToBook(b, emails.get(String(b.user_id)) ?? null, problems.has(String(b.id))),
    );
    if (data.filter === "backup_problem") list = list.filter((b) => b.backupProblem);
    return { books: list };
  });

/** One book with everything known about where its files are kept. */
export const adminMemoryBookDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
  }))
  .handler(async ({ data, context }): Promise<{ detail: AdminBookDetail | null }> => {
    await assertAdmin(context);
    const db = await admin();
    const { data: row } = await db
      .from("memory_book_projects")
      .select(BOOK_COLUMNS)
      .eq("id", data.bookId)
      .maybeSingle();
    if (!row) return { detail: null };

    const book = row as Record<string, unknown>;
    const userId = String(book.user_id);
    const bookEmail = (await emailMap()).get(userId) ?? null;

    const prefix = bookObjectPrefix(userId, data.bookId);
    const { data: placements } = await db
      .from("storage_placements")
      .select("*")
      .like("object_key", `${prefix}%`)
      .order("object_key", { ascending: true });

    const objects = ((placements ?? []) as Array<Record<string, unknown>>).map((p) => ({
      objectKey: String(p.object_key),
      provider: String(p.provider),
      role: String(p.role),
      status: String(p.status),
      sizeBytes: Number(p.size_bytes ?? 0),
      verifiedAt: (p.verified_at as string | null) ?? null,
      lastBackupAt: (p.last_backup_at as string | null) ?? null,
      lastError: (p.last_error as string | null) ?? null,
      attempts: Number(p.attempts ?? 0),
    }));

    const { data: retention } = await db
      .from("memory_book_storage_retention")
      .select("provider, delete_after, note")
      .eq("book_id", data.bookId);
    const retentionBy = new Map<string, { delete_after: string | null; note: string | null }>(
      ((retention ?? []) as Array<{ provider: string; delete_after: string | null; note: string | null }>).map(
        (r) => [r.provider, r],
      ),
    );

    const providers: AdminBookProviderSummary[] = (["r2", "b2"] as const).map((provider) => {
      const own = objects.filter((o) => o.provider === provider);
      const present = own.filter((o) => o.status === "present");
      const verified = present
        .map((o) => o.verifiedAt)
        .filter((v): v is string => Boolean(v))
        .sort();
      return {
        provider,
        objects: own.length,
        presentObjects: present.length,
        problemObjects: own.filter((o) => ["pending", "copying", "failed"].includes(o.status))
          .length,
        totalBytes: present.reduce((sum, o) => sum + o.sizeBytes, 0),
        lastVerifiedAt: verified.length > 0 ? verified[verified.length - 1]! : null,
        deleteAfter: retentionBy.get(provider)?.delete_after ?? null,
        note: retentionBy.get(provider)?.note ?? null,
      };
    });

    return {
      detail: {
        book: rowToBook(
          book,
          bookEmail,
          providers.some((p) => p.problemObjects > 0),
        ),
        providers,
        objects,
      },
    };
  });

/** Sets the planned removal date of ONE area for ONE book. */
export const adminSetBookRetention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; provider: "r2" | "b2"; deleteAfter: string | null; note?: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    provider: input?.provider === "b2" ? ("b2" as const) : ("r2" as const),
    deleteAfter: input?.deleteAfter ? String(input.deleteAfter) : null,
    note: String(input?.note ?? "").slice(0, 300),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await assertAdmin(context);
    const db = await admin();
    const { data: before } = await db
      .from("memory_book_storage_retention")
      .select("provider, delete_after, note")
      .eq("book_id", data.bookId)
      .eq("provider", data.provider)
      .maybeSingle();

    const { error } = await db.from("memory_book_storage_retention").upsert(
      {
        book_id: data.bookId,
        provider: data.provider,
        delete_after: data.deleteAfter,
        note: data.note || null,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "book_id,provider" },
    );
    if (error) return { ok: false };
    await logAction(
      context.userId,
      "memory_book.retention_updated",
      data.bookId,
      before ?? null,
      { provider: data.provider, delete_after: data.deleteAfter, note: data.note || null },
    );
    return { ok: true };
  });

/**
 * Removes the copies of one book from EXACTLY ONE area. The other area keeps
 * its own copies and its own records: there is no "delete everywhere".
 */
export const adminDeleteBookProviderCopies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; provider: "r2" | "b2"; confirm: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    provider: input?.provider === "b2" ? ("b2" as const) : ("r2" as const),
    confirm: String(input?.confirm ?? ""),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; deleted?: number; failed?: number; error?: string }> => {
      await assertAdmin(context);
      if (data.confirm !== data.bookId) return { ok: false, error: "confirm_mismatch" };

      const db = await admin();
      const { data: row } = await db
        .from("memory_book_projects")
        .select("user_id")
        .eq("id", data.bookId)
        .maybeSingle();
      if (!row) return { ok: false, error: "not_found" };

      const prefix = bookObjectPrefix(String((row as { user_id: string }).user_id), data.bookId);
      const { data: placements } = await db
        .from("storage_placements")
        .select("object_key, status")
        .eq("provider", data.provider)
        .like("object_key", `${prefix}%`);

      const { storageFor } = await import("@/lib/storage/registry.server");
      const { markProviderDeleted } = await import("@/lib/storage/backup.server");
      const adapter = data.provider === "r2" ? storageFor("primary") : storageFor("backup");
      if (!adapter || adapter.id !== data.provider) return { ok: false, error: "not_configured" };

      let deleted = 0;
      let failed = 0;
      for (const p of (placements ?? []) as Array<{ object_key: string; status: string }>) {
        if (p.status === "deleted") continue;
        const ok = await adapter.deleteObject(p.object_key);
        if (ok) {
          await markProviderDeleted(p.object_key, data.provider);
          deleted += 1;
        } else {
          failed += 1;
        }
      }
      await logAction(
        context.userId,
        "memory_book.provider_copies_deleted",
        data.bookId,
        { provider: data.provider, objects: (placements ?? []).length },
        { deleted, failed },
      );
      return { ok: failed === 0, deleted, failed };
    },
  );

/** Copies the reserve copies of one book back into the working area. */
export const adminRestoreBookFromReserve = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; restored?: number; failed?: number; error?: string }> => {
      await assertAdmin(context);
      const db = await admin();
      const { data: row } = await db
        .from("memory_book_projects")
        .select("user_id")
        .eq("id", data.bookId)
        .maybeSingle();
      if (!row) return { ok: false, error: "not_found" };

      const prefix = bookObjectPrefix(String((row as { user_id: string }).user_id), data.bookId);
      const { data: placements } = await db
        .from("storage_placements")
        .select("object_key")
        .eq("provider", "b2")
        .eq("status", "present")
        .like("object_key", `${prefix}%`);

      const { restoreFromReserve } = await import("@/lib/storage/backup.server");
      let restored = 0;
      let failed = 0;
      for (const p of (placements ?? []) as Array<{ object_key: string }>) {
        const res = await restoreFromReserve(p.object_key);
        if (res.ok) restored += 1;
        else failed += 1;
      }
      await logAction(
        context.userId,
        "memory_book.restored_from_reserve",
        data.bookId,
        { objects: (placements ?? []).length },
        { restored, failed },
      );
      return { ok: failed === 0, restored, failed };
    },
  );

/** Tries the unfinished reserve copies of one book again. */
export const adminRetryBookBackups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; tried?: number; done?: number; error?: string }> => {
      await assertAdmin(context);
      const db = await admin();
      const { data: row } = await db
        .from("memory_book_projects")
        .select("user_id")
        .eq("id", data.bookId)
        .maybeSingle();
      if (!row) return { ok: false, error: "not_found" };

      const prefix = bookObjectPrefix(String((row as { user_id: string }).user_id), data.bookId);
      const { data: placements } = await db
        .from("storage_placements")
        .select("object_key")
        .eq("provider", "b2")
        .in("status", ["pending", "copying", "failed"])
        .like("object_key", `${prefix}%`)
        .limit(200);

      const { backupToReserve } = await import("@/lib/storage/backup.server");
      let done = 0;
      const rows = (placements ?? []) as Array<{ object_key: string }>;
      for (const p of rows) {
        const res = await backupToReserve(p.object_key);
        if (res.ok) done += 1;
      }
      // Files that were never recorded in the reserve area at all.
      const { data: primaries } = await db
        .from("storage_placements")
        .select("object_key")
        .eq("provider", "r2")
        .eq("status", "present")
        .like("object_key", `${prefix}%`)
        .limit(500);
      for (const p of (primaries ?? []) as Array<{ object_key: string }>) {
        if (rows.some((r) => r.object_key === p.object_key)) continue;
        const res = await backupToReserve(p.object_key);
        if (res.ok && !res.skipped) done += 1;
      }

      await logAction(context.userId, "memory_book.backup_retried", data.bookId, null, {
        tried: rows.length,
        done,
      });
      return { ok: true, tried: rows.length, done };
    },
  );

export interface AdminActionRow {
  id: string;
  action: string;
  entityId: string | null;
  actorEmail: string | null;
  createdAt: string;
  previous: string | null;
  next: string | null;

}

/** What administrators did in the Memory Book storage area, newest first. */
export const adminMemoryBookHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId?: string; limit?: number }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    limit: Math.max(10, Math.min(200, Number(input?.limit ?? 50))),
  }))
  .handler(async ({ data, context }): Promise<{ entries: AdminActionRow[] }> => {
    await assertAdmin(context);
    const db = await admin();
    let query = db
      .from("admin_audit_log")
      .select("id, action, entity_id, actor_user_id, created_at, previous_data, new_data")
      .like("action", "memory_book.%")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.bookId) query = query.eq("entity_id", data.bookId);
    const { data: rows } = await query;
    const list = (rows ?? []) as Array<Record<string, unknown>>;

    const emails = await emailMap();
    const asText = (value: unknown): string | null =>
      value == null ? null : typeof value === "string" ? value : JSON.stringify(value);

    return {
      entries: list.map((r) => ({
        id: String(r.id),
        action: String(r.action),
        entityId: (r.entity_id as string | null) ?? null,
        actorEmail: emails.get(String(r.actor_user_id)) ?? null,
        createdAt: String(r.created_at ?? ""),
        previous: asText(r.previous_data),
        next: asText(r.new_data),
      })),

    };
  });

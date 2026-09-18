import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_MATERIALS_BUCKET,
  MEMORY_BOOK_R2_BUCKET,
  MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS,
  type MemoryBookMaterial,
  type MemoryBookMaterialKind,
} from "./materials";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function kindOf(value: unknown): MemoryBookMaterialKind {
  return value === "video" ? "video" : "photo";
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** The book, only when it belongs to the signed-in customer and was paid for. */
async function ownedBook(context: { supabase: unknown; userId: string }, bookId: string) {
  const db = context.supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (a: string, b: string) => {
          eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: Row | null }> };
        };
      };
    };
  };
  const { data } = await db
    .from("memory_book_projects")
    .select("id, credits_spent")
    .eq("user_id", context.userId)
    .eq("id", bookId)
    .maybeSingle();
  if (!data || Number(data.credits_spent ?? 0) <= 0) return null;
  return data;
}

async function listOf(bookId: string, userId: string): Promise<MemoryBookMaterial[]> {
  const db = await admin();
  const { data } = await db
    .from("memory_book_materials")
    .select("id, kind, bucket, path, file_name, size_bytes, duration_seconds, created_at")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as unknown as Row[];
  const out: MemoryBookMaterial[] = [];
  for (const row of rows) {
    const { memoryBookFileUrl } = await import("./storage.server");
    const url = await memoryBookFileUrl(text(row.bucket), text(row.path), 60 * 60);
    if (!url) continue;
    out.push({
      id: String(row.id),
      kind: kindOf(row.kind),
      url,
      fileName: text(row.file_name),
      durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
      sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
      createdAt: text(row.created_at),
    });
  }
  return out;
}

/** Everything already uploaded for this exact Memory Book. */
export const loadMemoryBookMaterials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
  }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; materials: MemoryBookMaterial[] }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, materials: [] };
      return { ok: true, materials: await listOf(data.bookId, context.userId) };
    },
  );

/**
 * Registers one already uploaded file as material of THIS book. Repeating the
 * same call for the same stored file never creates a second record.
 */
export const registerMemoryBookMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      bookId: string;
      kind: string;
      path: string;
      storage?: string;
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      durationSeconds?: number | null;
    }) => ({
      bookId: String(input?.bookId ?? "").slice(0, 64),
      kind: kindOf(input?.kind),
      path: String(input?.path ?? "").slice(0, 400),
      storage:
        input?.storage === MEMORY_BOOK_R2_BUCKET
          ? MEMORY_BOOK_R2_BUCKET
          : MEMORY_BOOK_MATERIALS_BUCKET,
      fileName: String(input?.fileName ?? "").slice(0, 200),
      mimeType: String(input?.mimeType ?? "").slice(0, 120),
      sizeBytes: Number(input?.sizeBytes ?? 0),
      durationSeconds:
        input?.durationSeconds == null ? null : Number(input.durationSeconds),
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      error?: "not_found" | "too_long" | "failed";
      materials: MemoryBookMaterial[];
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, error: "not_found", materials: [] };
      // The file must live inside this customer's own book folder.
      const inR2 = data.storage === MEMORY_BOOK_R2_BUCKET;
      const prefixes = inR2
        ? [
            // The tested video area.
            `memory-book/${context.userId}/${data.bookId}/`,
            // The shared customer address used by the storage layer.
            `users/${context.userId}/memory-book/${data.bookId}/`,
          ]
        : [`${context.userId}/${data.bookId}/`];
      if (!prefixes.some((prefix) => data.path.startsWith(prefix))) {
        return { ok: false, error: "not_found", materials: [] };
      }
      if (
        data.kind === "video" &&
        data.durationSeconds != null &&
        data.durationSeconds > MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS
      ) {
        return { ok: false, error: "too_long", materials: [] };
      }

      // Nothing counts as uploaded before the file is really there.
      if (inR2) {
        const { r2ObjectSize } = await import("./r2.server");
        const stored = await r2ObjectSize(data.path);
        if (stored == null || stored <= 0) return { ok: false, error: "failed", materials: [] };
      }

      const db = await admin();
      const { data: existing } = await db
        .from("memory_book_materials")
        .select("id")
        .eq("bucket", data.storage)
        .eq("path", data.path)
        .maybeSingle();

      if (!existing) {
        const { error } = await db.from("memory_book_materials").insert({
          book_id: data.bookId,
          user_id: context.userId,
          kind: data.kind,
          bucket: data.storage,
          path: data.path,
          file_name: data.fileName || null,
          mime_type: data.mimeType || null,
          size_bytes: data.sizeBytes || null,
          duration_seconds: data.durationSeconds,
        });
        if (error) return { ok: false, error: "failed", materials: [] };
      }

      // Photos stored in the working area also get their independent reserve
      // copy. It can never undo or delay the customer's successful upload.
      if (inR2 && data.kind === "photo") {
        const { protectObject } = await import("@/lib/storage/backup.server");
        await protectObject(data.path);
      }

      return { ok: true, materials: await listOf(data.bookId, context.userId) };
    },
  );

/** Removes exactly one material of THIS book, and nothing else. */
export const removeMemoryBookMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; materialId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    materialId: String(input?.materialId ?? "").slice(0, 64),
  }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; materials: MemoryBookMaterial[] }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, materials: [] };

      const db = await admin();
      const { data: row } = await db
        .from("memory_book_materials")
        .select("id, bucket, path")
        .eq("id", data.materialId)
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!row) return { ok: true, materials: await listOf(data.bookId, context.userId) };

      const record = row as unknown as Row;
      const { memoryBookFileRemove } = await import("./storage.server");
      await memoryBookFileRemove(text(record.bucket), text(record.path));
      await db
        .from("memory_book_materials")
        .delete()
        .eq("id", data.materialId)
        .eq("user_id", context.userId);

      return { ok: true, materials: await listOf(data.bookId, context.userId) };
    },
  );

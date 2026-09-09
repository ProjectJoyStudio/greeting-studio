import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_MATERIALS_BUCKET,
  type MemoryBookMaterial,
} from "./materials";
import {
  MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS,
  type MemoryBookVideoFragment,
} from "./video-prep";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
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

function cleanFragments(value: unknown): MemoryBookVideoFragment[] {
  if (!Array.isArray(value)) return [];
  const out: MemoryBookVideoFragment[] = [];
  for (const raw of value.slice(0, 100)) {
    const item = raw as Partial<MemoryBookVideoFragment> | null;
    const start = Number(item?.start);
    const end = Number(item?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    out.push({
      id: String(item?.id ?? "").slice(0, 64) || `${start}-${end}`,
      start: Number(Math.max(0, start).toFixed(2)),
      end: Number(Math.max(0, end).toFixed(2)),
    });
  }
  return out;
}

async function sourceMaterial(bookId: string, userId: string, materialId: string) {
  const db = await admin();
  const { data } = await db
    .from("memory_book_materials")
    .select("id, kind, bucket, path, file_name, size_bytes, duration_seconds, created_at")
    .eq("id", materialId)
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as unknown as Row | null;
  if (!row || row.kind !== "video") return null;
  const { data: signed } = await db.storage
    .from(text(row.bucket))
    .createSignedUrl(text(row.path), 60 * 60 * 4);
  if (!signed?.signedUrl) return null;
  const material: MemoryBookMaterial = {
    id: String(row.id),
    kind: "video",
    url: signed.signedUrl,
    fileName: text(row.file_name),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    createdAt: text(row.created_at),
  };
  return material;
}

/** The source video plus the fragment selection already made for it. */
export const loadMemoryBookVideoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; materialId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    materialId: String(input?.materialId ?? "").slice(0, 64),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      source: MemoryBookMaterial | null;
      fragments: MemoryBookVideoFragment[];
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, source: null, fragments: [] };
      const source = await sourceMaterial(data.bookId, context.userId, data.materialId);
      if (!source) return { ok: false, source: null, fragments: [] };

      const db = await admin();
      const { data: edit } = await db
        .from("memory_book_video_edits")
        .select("fragments")
        .eq("book_id", data.bookId)
        .eq("source_material_id", data.materialId)
        .eq("user_id", context.userId)
        .maybeSingle();

      return {
        ok: true,
        source,
        fragments: cleanFragments((edit as unknown as Row | null)?.fragments),
      };
    },
  );

/** Keeps the fragment selection of exactly this book and this source video. */
export const saveMemoryBookVideoFragments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { bookId: string; materialId: string; fragments: MemoryBookVideoFragment[] }) => ({
      bookId: String(input?.bookId ?? "").slice(0, 64),
      materialId: String(input?.materialId ?? "").slice(0, 64),
      fragments: cleanFragments(input?.fragments),
    }),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const book = await ownedBook(context, data.bookId);
    if (!book) return { ok: false };
    const source = await sourceMaterial(data.bookId, context.userId, data.materialId);
    if (!source) return { ok: false };

    const db = await admin();
    const { error } = await db.from("memory_book_video_edits").upsert(
      {
        user_id: context.userId,
        book_id: data.bookId,
        source_material_id: data.materialId,
        fragments: JSON.parse(JSON.stringify(data.fragments)),
      },
      { onConflict: "book_id,source_material_id" },
    );
    return { ok: !error };
  });

/**
 * Registers the finished prepared video as a normal material of THIS book.
 * A file longer than the allowed final length is never accepted.
 */
export const registerPreparedMemoryBookVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      bookId: string;
      sourceMaterialId: string;
      path: string;
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      durationSeconds: number;
    }) => ({
      bookId: String(input?.bookId ?? "").slice(0, 64),
      sourceMaterialId: String(input?.sourceMaterialId ?? "").slice(0, 64),
      path: String(input?.path ?? "").slice(0, 400),
      fileName: String(input?.fileName ?? "").slice(0, 200),
      mimeType: String(input?.mimeType ?? "").slice(0, 120),
      sizeBytes: Number(input?.sizeBytes ?? 0),
      durationSeconds: Number(input?.durationSeconds ?? 0),
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      error?: "not_found" | "too_long" | "failed";
      materialId?: string;
      sourceRemoved?: boolean;
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, error: "not_found" };
      const source = await sourceMaterial(data.bookId, context.userId, data.sourceMaterialId);
      if (!source) return { ok: false, error: "not_found" };
      if (!data.path.startsWith(`${context.userId}/${data.bookId}/`)) {
        return { ok: false, error: "not_found" };
      }
      if (
        !Number.isFinite(data.durationSeconds) ||
        data.durationSeconds <= 0 ||
        data.durationSeconds > MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS + 1
      ) {
        return { ok: false, error: "too_long" };
      }

      const db = await admin();

      // The prepared file must really exist in storage before anything is
      // treated as saved — a missing upload must never look successful.
      const { data: check } = await db.storage
        .from(MEMORY_BOOK_MATERIALS_BUCKET)
        .createSignedUrl(data.path, 60);
      if (!check?.signedUrl) return { ok: false, error: "failed" };

      const { data: existing } = await db
        .from("memory_book_materials")
        .select("id")
        .eq("bucket", MEMORY_BOOK_MATERIALS_BUCKET)
        .eq("path", data.path)
        .maybeSingle();

      let materialId = existing ? String((existing as unknown as Row).id) : "";

      if (!materialId) {
        const { data: inserted, error } = await db
          .from("memory_book_materials")
          .insert({
            book_id: data.bookId,
            user_id: context.userId,
            kind: "video",
            bucket: MEMORY_BOOK_MATERIALS_BUCKET,
            path: data.path,
            file_name: data.fileName || null,
            mime_type: data.mimeType || null,
            size_bytes: data.sizeBytes || null,
            duration_seconds: Math.min(data.durationSeconds, MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS),
            prepared_from_material_id: data.sourceMaterialId,
          })
          .select("id")
          .maybeSingle();
        if (error || !inserted) return { ok: false, error: "failed" };
        materialId = String((inserted as unknown as Row).id);
      }

      // Read the stored record back: only a verified record counts as saved.
      const { data: verified } = await db
        .from("memory_book_materials")
        .select("id, book_id, user_id, path")
        .eq("id", materialId)
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!verified) return { ok: false, error: "failed" };

      // Only now the long original working video may be removed.
      let sourceRemoved = false;
      try {
        const { data: sourceRow } = await db
          .from("memory_book_materials")
          .select("id, bucket, path")
          .eq("id", data.sourceMaterialId)
          .eq("book_id", data.bookId)
          .eq("user_id", context.userId)
          .maybeSingle();
        const row = sourceRow as unknown as Row | null;
        if (row) {
          await db.storage.from(text(row.bucket)).remove([text(row.path)]);
          const { error: delError } = await db
            .from("memory_book_materials")
            .delete()
            .eq("id", data.sourceMaterialId)
            .eq("book_id", data.bookId)
            .eq("user_id", context.userId);
          if (!delError) {
            sourceRemoved = true;
            await db
              .from("memory_book_video_edits")
              .delete()
              .eq("book_id", data.bookId)
              .eq("source_material_id", data.sourceMaterialId)
              .eq("user_id", context.userId);
          }
        }
      } catch {
        // The prepared video is already safe; cleanup can be retried later.
      }

      return { ok: true, materialId, sourceRemoved };
    },
  );


import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_MATERIALS_BUCKET,
  MEMORY_BOOK_R2_BUCKET,
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
    const sourceId = String(item?.sourceId ?? "").slice(0, 64);
    out.push({
      id: String(item?.id ?? "").slice(0, 64) || `${start}-${end}`,
      ...(sourceId ? { sourceId } : {}),
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
    .select("id, kind, bucket, path, file_name, size_bytes, duration_seconds, created_at, prepared_from_material_id")
    .eq("id", materialId)
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as unknown as Row | null;
  // A finished (assembled) video is never an editing source.
  if (!row || row.kind !== "video" || row.prepared_from_material_id != null) return null;
  const { memoryBookFileUrl } = await import("./storage.server");
  const url = await memoryBookFileUrl(text(row.bucket), text(row.path), 60 * 60 * 4);
  if (!url) return null;
  const material: MemoryBookMaterial = {
    id: String(row.id),
    kind: "video",
    url,
    fileName: text(row.file_name),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    createdAt: text(row.created_at),
    prepared: false,
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
    const { data: active } = await db.from("memory_book_video_jobs").select("id").eq("book_id", data.bookId).eq("user_id", context.userId).in("status", ["submitting", "queued", "running", "ready", "finalizing"]).maybeSingle();
    if (active) return { ok: false };
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


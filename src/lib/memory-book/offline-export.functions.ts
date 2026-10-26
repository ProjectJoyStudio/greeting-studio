// Prepares the downloadable offline package of ONE completed Memory Book.
//
// This only READS the book: nothing is written, changed or deleted, and no
// package file is ever stored on Project Joy. The browser assembles the ZIP
// from the plan returned here.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  offlineLeafOrder,
  offlineRowToPage,
  offlineText as text,
  type OfflineInlineFile,
  type OfflinePackageFile,
  type OfflinePackagePlan,
  type Row,
} from "./offline-package";

const SIGNED_SECONDS = 60 * 60 * 6;

export type OfflinePlanResult =
  | { ok: true; plan: OfflinePackagePlan }
  | { ok: false; error: "not_available" | "missing_asset"; asset?: string };

/** Thrown when a file the finished book shows cannot be resolved. */
class MissingAsset extends Error {
  constructor(readonly asset: string) {
    super("missing_asset");
  }
}

/**
 * Records safe diagnostics of a failed or cancelled offline download: stage,
 * category, HTTP status and asset identifier only. Never links or keys.
 */
export const reportOfflineExportIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    bookId: string;
    stage: string;
    category: string;
    status?: number;
    asset?: string;
    target?: string;
  }) => ({
    bookId: String(input.bookId).slice(0, 64),
    stage: String(input.stage).slice(0, 32),
    category: String(input.category).slice(0, 48),
    status: typeof input.status === "number" ? input.status : undefined,
    asset: input.asset ? String(input.asset).slice(0, 120) : undefined,
    target: input.target ? String(input.target).slice(0, 48) : undefined,
  }))
  .handler(async ({ data, context }) => {
    console.warn(
      "[memory-book-offline-export]",
      JSON.stringify({ ...data, userId: context.userId, at: new Date().toISOString() }),
    );
    return { ok: true };
  });

export const buildMemoryBookOfflinePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({ bookId: String(input.bookId).slice(0, 64) }))
  .handler(async ({ data, context }): Promise<OfflinePlanResult> => {
    const { supabase, userId } = context;

    const { data: ownRow } = await supabase
      .from("memory_book_projects")
      .select("id, status")
      .eq("user_id", userId)
      .eq("id", data.bookId)
      .maybeSingle();
    if (!ownRow || String((ownRow as Row).status ?? "") !== "completed")
      return { ok: false, error: "not_available" };
    try {
      return { ok: true, plan: await buildPlan(data.bookId, userId) };
    } catch (error) {
      if (error instanceof MissingAsset) {
        console.warn("[memory-book-offline-export] missing_asset", data.bookId, error.asset);
        return { ok: false, error: "missing_asset", asset: error.asset };
      }
      throw error;
    }
  });

async function buildPlan(bookId: string, userId: string): Promise<OfflinePackagePlan> {
  const data = { bookId };
  {

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;

    const { data: bookRow } = await db
      .from("memory_book_projects")
      .select("*")
      .eq("id", data.bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!bookRow) throw new MissingAsset("book");
    const book = bookRow as Row;

    const internalPages = Number(book.internal_pages ?? 0);
    const leaves = Number(book.leaves ?? 0) || Math.ceil(internalPages / 2);

    const files: OfflinePackageFile[] = [];
    const inline: OfflineInlineFile[] = [];
    const known = new Map<string, string>();
    let counter = 0;
    let inlineCounter = 0;

    /** Adds one stored file to the package and returns its local address. */
    async function localCopy(
      bucket: string | null,
      path: string | null,
      asset: string,
    ): Promise<string | null> {
      if (!bucket || !path) return null;
      const key = `${bucket}/${path}`;
      const cached = known.get(key);
      if (cached) return cached;
      const { memoryBookFileUrl } = await import("./storage.server");
      const url = await memoryBookFileUrl(bucket, path, SIGNED_SECONDS, data.bookId);
      if (!url) throw new MissingAsset(asset);
      const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
      const name = `${String(++counter).padStart(3, "0")}${ext}`;
      files.push({ name, url, asset });
      const local = `book-files/${name}`;
      known.set(key, local);
      return local;
    }

    /** Small mask files travel inside the data itself. */
    async function inlineCopy(bucket: string, path: string, asset: string): Promise<string | null> {
      const { memoryBookFileUrl } = await import("./storage.server");
      const signedUrl = await memoryBookFileUrl(bucket, path, SIGNED_SECONDS, data.bookId);
      if (!signedUrl) throw new MissingAsset(asset);
      const token = `__JOY_INLINE_${++inlineCounter}__`;
      inline.push({
        token,
        url: signedUrl,
        asset,
        mime: path.endsWith(".svg") ? "image/svg+xml" : "image/png",
      });
      return token;
    }

    // ---- pages (front cover 0, internal 1..n, back cover -1) ----
    const { data: pageRows } = await db
      .from("memory_book_pages")
      .select("*")
      .eq("book_id", data.bookId)
      .eq("user_id", userId)
      .order("page_index", { ascending: true });

    const pages: Record<number, ReturnType<typeof offlineRowToPage>> = {};
    for (const raw of ((pageRows ?? []) as unknown as Row[])) {
      const index = Number(raw.page_index);
      if (index < -1 || index > internalPages) continue;
      const page = offlineRowToPage(raw);
      const bg = await localCopy(
        text(raw.background_bucket) || null,
        text(raw.background_path) || null,
        `page-background:${index}`,
      );
      if (bg) page.backgroundUrl = bg;
      pages[index] = page;
    }

    // ---- photos and videos ----
    const { data: matRows } = await db
      .from("memory_book_materials")
      .select("id, kind, bucket, path, file_name, size_bytes, duration_seconds, created_at")
      .eq("book_id", data.bookId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const materials = [];
    const usedMaterials = new Set<string>();
    for (const page of Object.values(pages)) {
      for (const slot of page.slots) if (slot.materialId) usedMaterials.add(slot.materialId);
      if (page.videoMaterialId) usedMaterials.add(page.videoMaterialId);
    }
    const foundMaterials = new Set<string>();
    for (const raw of ((matRows ?? []) as unknown as Row[])) {
      if (!usedMaterials.has(String(raw.id))) continue;
      const asset = `${raw.kind === "video" ? "video" : "photo"}:${String(raw.id)}`;
      const url = await localCopy(text(raw.bucket), text(raw.path), asset);
      if (!url) throw new MissingAsset(asset);
      foundMaterials.add(String(raw.id));
      materials.push({
        id: String(raw.id),
        kind: raw.kind === "video" ? "video" : "photo",
        url,
        fileName: text(raw.file_name),
        durationSeconds: raw.duration_seconds === null ? null : Number(raw.duration_seconds),
        sizeBytes: raw.size_bytes === null ? null : Number(raw.size_bytes),
        createdAt: text(raw.created_at),
      });
    }

    // A material shown in the book but no longer on record is never skipped.
    for (const id of usedMaterials) if (!foundMaterials.has(id)) throw new MissingAsset(`material:${id}`);

    // ---- decorations actually placed on the pages ----
    const used = new Set<string>();
    for (const page of Object.values(pages))
      for (const item of page.decorations) used.add(item.decorationId);

    const library = [];
    if (used.size) {
      const { data: decRows } = await db
        .from("memory_book_decorations")
        .select("id, name, category, bucket, path, file_type, recolorable, enabled, sort_order, created_at")
        .in("id", [...used]);
      for (const raw of ((decRows ?? []) as unknown as Row[])) {
        library.push({
          id: String(raw.id),
          name: text(raw.name),
          category: text(raw.category),
          url:
            raw.file_type === "svg"
              ? await inlineCopy(text(raw.bucket), text(raw.path), `decoration:${String(raw.id)}`)
              : await localCopy(text(raw.bucket), text(raw.path), `decoration:${String(raw.id)}`),
          fileType: raw.file_type === "svg" ? "svg" : "png",
          recolorable: raw.recolorable === true,
          enabled: raw.enabled !== false,
          sortOrder: Number(raw.sort_order ?? 0),
          path: text(raw.path),
          createdAt: text(raw.created_at),
        });
      }
    }

    // ---- cover / leaf backgrounds ----
    const { data: designRows } = await db
      .from("memory_book_designs")
      .select("id, stage, bucket, path")
      .eq("book_id", data.bookId);
    const designs = new Map<string, Row>();
    for (const raw of ((designRows ?? []) as unknown as Row[])) designs.set(String(raw.id), raw);
    const selectedIds = [book.selected_cover_id, book.selected_leaf_id, book.back_cover_design_id].filter((id): id is string => typeof id === "string" && !designs.has(id));
    if (selectedIds.length) {
      const { data: extra } = await db.from("memory_book_designs").select("id, stage, bucket, path").in("id", selectedIds);
      for (const raw of (extra ?? []) as Row[]) designs.set(String(raw.id), raw);
    }

    const pick = async (id: unknown, role: string) => {
      if (typeof id !== "string" || !id) return null;
      const row = designs.get(id);
      if (!row) throw new MissingAsset(`design:${role}:${id}`);
      return await localCopy(text(row.bucket), text(row.path), `design:${role}:${id}`);
    };
    const coverUrl = await pick(book.selected_cover_id, "cover");
    const leafBackgroundUrl = await pick(book.selected_leaf_id, "leaf");
    const backCoverUrl =
      book.back_cover_overridden === true
        ? ((await pick(book.back_cover_design_id, "back")) ?? coverUrl)
        : coverUrl;

    // ---- background music ----
    let musicUrl: string | null = null;
    if (book.music_source === "library") {
      musicUrl = await localCopy(
        text(book.music_track_bucket),
        text(book.music_track_path),
        "music:library",
      );
    } else if (book.music_source === "created" && typeof book.music_variant_id === "string") {
      const { data: variant } = await db
        .from("memory_book_music_variants")
        .select("id, bucket, path")
        .eq("id", book.music_variant_id)
        .maybeSingle();
      if (!variant) throw new MissingAsset(`music:${book.music_variant_id}`);
      musicUrl = await localCopy(
        text((variant as Row).bucket),
        text((variant as Row).path),
        `music:${book.music_variant_id}`,
      );
    }

    return {
        dataJson: JSON.stringify({
          pages,
          order: offlineLeafOrder(book.leaf_order, leaves),
          materials,
          library,
          coverUrl,
          backCoverUrl,
          leafBackgroundUrl,
          musicUrl,
          musicEnabled: book.music_enabled !== false,
          musicVolume: Number(book.music_volume ?? 0.35),
        }),
        files,
        inline,
    };
  }
}

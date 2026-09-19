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

export const buildMemoryBookOfflinePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({ bookId: String(input.bookId).slice(0, 64) }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; plan?: OfflinePackagePlan }> => {
    const { supabase, userId } = context;

    const { data: ownRow } = await supabase
      .from("memory_book_projects")
      .select("id, status")
      .eq("user_id", userId)
      .eq("id", data.bookId)
      .maybeSingle();
    if (!ownRow || String((ownRow as Row).status ?? "") !== "completed") return { ok: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;

    const { data: bookRow } = await db
      .from("memory_book_projects")
      .select("*")
      .eq("id", data.bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!bookRow) return { ok: false };
    const book = bookRow as Row;

    const internalPages = Number(book.internal_pages ?? 0);
    const leaves = Number(book.leaves ?? 0) || Math.ceil(internalPages / 2);

    const files: OfflinePackageFile[] = [];
    const inline: OfflineInlineFile[] = [];
    const known = new Map<string, string>();
    let counter = 0;
    let inlineCounter = 0;

    /** Adds one stored file to the package and returns its local address. */
    async function localCopy(bucket: string | null, path: string | null): Promise<string | null> {
      if (!bucket || !path) return null;
      const key = `${bucket}/${path}`;
      const cached = known.get(key);
      if (cached) return cached;
      const { memoryBookFileUrl } = await import("./storage.server");
      const url = await memoryBookFileUrl(bucket, path, SIGNED_SECONDS);
      if (!url) return null;
      const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
      const name = `${String(++counter).padStart(3, "0")}${ext}`;
      files.push({ name, url });
      const local = `book-files/${name}`;
      known.set(key, local);
      return local;
    }

    /** Small mask files travel inside the data itself. */
    async function inlineCopy(bucket: string, path: string): Promise<string | null> {
      const { memoryBookFileUrl } = await import("./storage.server");
      const signedUrl = await memoryBookFileUrl(bucket, path, SIGNED_SECONDS);
      if (!signedUrl) return null;
      const token = `__JOY_INLINE_${++inlineCounter}__`;
      inline.push({
        token,
        url: signedUrl,
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
    for (const raw of ((matRows ?? []) as unknown as Row[])) {
      const url = await localCopy(text(raw.bucket), text(raw.path));
      if (!url) continue;
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
              ? await inlineCopy(text(raw.bucket), text(raw.path))
              : await localCopy(text(raw.bucket), text(raw.path)),
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

    const pick = async (id: unknown) => {
      const row = typeof id === "string" ? designs.get(id) : null;
      return row ? await localCopy(text(row.bucket), text(row.path)) : null;
    };
    const coverUrl = await pick(book.selected_cover_id);
    const leafBackgroundUrl = await pick(book.selected_leaf_id);
    const backCoverUrl =
      book.back_cover_overridden === true
        ? ((await pick(book.back_cover_design_id)) ?? coverUrl)
        : coverUrl;

    // ---- background music ----
    let musicUrl: string | null = null;
    if (book.music_source === "library") {
      musicUrl = await localCopy(text(book.music_track_bucket), text(book.music_track_path));
    } else if (book.music_source === "created" && typeof book.music_variant_id === "string") {
      const { data: variant } = await db
        .from("memory_book_music_variants")
        .select("id, bucket, path")
        .eq("id", book.music_variant_id)
        .maybeSingle();
      if (variant)
        musicUrl = await localCopy(
          text((variant as Row).bucket),
          text((variant as Row).path),
        );
    }

    return {
      ok: true,
      plan: {
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
      },
    };
  });

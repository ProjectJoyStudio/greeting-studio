// Public online viewing of ONE completed Memory Book through share links.
//
// Every link is an independent random access key. Owners manage their links
// through authenticated functions; recipients read the finished book only
// through `loadSharedMemoryBook`, where the active token is the sole
// authorization. Nothing is copied, moved, written or made public.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MemoryBookBookData } from "@/components/memory-book/MemoryBookBook";
import type { MemoryBookMaterial } from "./materials";
import type { MemoryBookDecoration } from "./decorations";
import type { MemoryBookPage } from "./pages";
import { offlineLeafOrder, offlineRowToPage, offlineText as text, type Row } from "./offline-package";
import { isValidShareToken, newShareToken } from "./share-token";

const SIGNED_SECONDS = 60 * 60 * 3;

export interface MemoryBookShareLink {
  id: string;
  token: string;
  active: boolean;
  createdAt: string;
  disabledAt: string | null;
}

function toLink(r: Row): MemoryBookShareLink {
  return {
    id: String(r.id),
    token: String(r.token),
    active: r.active === true,
    createdAt: String(r.created_at),
    disabledAt: typeof r.disabled_at === "string" ? r.disabled_at : null,
  };
}

const bookInput = (input: { bookId: string }) => ({ bookId: String(input.bookId).slice(0, 64) });

/** Owner check through the caller's own session (RLS applies). */
async function ownCompletedBook(
  supabase: { from: (t: "memory_book_projects") => any },
  userId: string,
  bookId: string,
) {
  const { data } = await supabase
    .from("memory_book_projects")
    .select("id, status")
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  return data && String((data as Row).status) === "completed";
}

export const listMemoryBookShares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(bookInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("memory_book_shares")
      .select("id, token, active, created_at, disabled_at")
      .eq("book_id", data.bookId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return { ok: false as const, links: [] as MemoryBookShareLink[] };
    return { ok: true as const, links: ((rows ?? []) as Row[]).map(toLink) };
  });

export const createMemoryBookShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(bookInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await ownCompletedBook(supabase, userId, data.bookId)))
      return { ok: false as const, error: "not_completed" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("memory_book_shares")
      .insert({ book_id: data.bookId, user_id: userId, token: newShareToken(), active: true })
      .select("id, token, active, created_at, disabled_at")
      .single();
    if (error || !row) return { ok: false as const, error: "failed" as const };
    return { ok: true as const, link: toLink(row as Row) };
  });

export const disableMemoryBookShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { shareId: string }) => ({ shareId: String(input.shareId).slice(0, 64) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ownership is read through the caller's own session first.
    const { data: own } = await supabase
      .from("memory_book_shares")
      .select("id")
      .eq("id", data.shareId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!own) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("memory_book_shares")
      .update({ active: false, disabled_at: new Date().toISOString() })
      .eq("id", data.shareId)
      .eq("user_id", userId)
      .eq("active", true);
    return { ok: !error };
  });

/**
 * PUBLIC: reads the finished book behind one active share token. The token is
 * the only authorization; book or user IDs are never accepted from the
 * caller and never returned.
 */
export const loadSharedMemoryBook = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: String(input.token ?? "").slice(0, 128) }))
  .handler(async ({ data }): Promise<{ ok: boolean; book?: MemoryBookBookData }> => {
    if (!isValidShareToken(data.token)) return { ok: false };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    const { data: share } = await db
      .from("memory_book_shares")
      .select("book_id, user_id, active")
      .eq("token", data.token)
      .maybeSingle();
    if (!share || (share as Row).active !== true) return { ok: false };
    const bookId = String((share as Row).book_id);
    const userId = String((share as Row).user_id);

    const { data: bookRow } = await db
      .from("memory_book_projects")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!bookRow || String((bookRow as Row).status) !== "completed") return { ok: false };
    const book = bookRow as Row;

    const { memoryBookFileUrl } = await import("./storage.server");
    const sign = async (bucket: unknown, path: unknown) => {
      const b = text(bucket);
      const p = text(path);
      return b && p ? await memoryBookFileUrl(b, p, SIGNED_SECONDS) : null;
    };

    const internalPages = Number(book.internal_pages ?? 0);
    const leaves = Number(book.leaves ?? 0) || Math.ceil(internalPages / 2);

    const { data: pageRows } = await db
      .from("memory_book_pages")
      .select("*")
      .eq("book_id", bookId)
      .eq("user_id", userId);
    const pages: Record<number, MemoryBookPage> = {};
    for (const raw of (pageRows ?? []) as unknown as Row[]) {
      const index = Number(raw.page_index);
      if (index < -1 || index > internalPages) continue;
      const page = offlineRowToPage(raw);
      const bg = await sign(raw.background_bucket, raw.background_path);
      if (bg) page.backgroundUrl = bg;
      pages[index] = page;
    }

    // Only materials that actually appear on a page are exposed.
    const usedMaterials = new Set<string>();
    const usedDecorations = new Set<string>();
    for (const page of Object.values(pages)) {
      for (const s of page.slots) if (s.materialId) usedMaterials.add(s.materialId);
      if (page.videoMaterialId) usedMaterials.add(page.videoMaterialId);
      for (const d of page.decorations) usedDecorations.add(d.decorationId);
    }

    const materials: MemoryBookMaterial[] = [];
    if (usedMaterials.size) {
      const { data: matRows } = await db
        .from("memory_book_materials")
        .select("id, kind, bucket, path, duration_seconds, created_at")
        .eq("book_id", bookId)
        .eq("user_id", userId)
        .in("id", [...usedMaterials]);
      for (const raw of (matRows ?? []) as unknown as Row[]) {
        const url = await sign(raw.bucket, raw.path);
        if (!url) continue;
        materials.push({
          id: String(raw.id),
          kind: raw.kind === "video" ? "video" : "photo",
          url,
          fileName: "",
          durationSeconds: raw.duration_seconds === null ? null : Number(raw.duration_seconds),
          sizeBytes: null,
          createdAt: text(raw.created_at),
          prepared: false,
        });
      }
    }

    const library: MemoryBookDecoration[] = [];
    if (usedDecorations.size) {
      const { data: decRows } = await db
        .from("memory_book_decorations")
        .select("id, name, category, bucket, path, file_type, recolorable, enabled, sort_order, created_at")
        .in("id", [...usedDecorations]);
      for (const raw of (decRows ?? []) as unknown as Row[]) {
        library.push({
          id: String(raw.id),
          name: text(raw.name),
          category: text(raw.category) as MemoryBookDecoration["category"],
          url: await sign(raw.bucket, raw.path),
          fileType: raw.file_type === "svg" ? "svg" : "png",
          recolorable: raw.recolorable === true,
          enabled: raw.enabled !== false,
          sortOrder: Number(raw.sort_order ?? 0),
          path: "",
          createdAt: text(raw.created_at),
        });
      }
    }

    const { data: designRows } = await db
      .from("memory_book_designs")
      .select("id, bucket, path")
      .eq("book_id", bookId);
    const designs = new Map<string, Row>();
    for (const raw of (designRows ?? []) as unknown as Row[]) designs.set(String(raw.id), raw);
    // Ready Designs from the shared library are referenced but not book-owned.
    const pickIds = [book.selected_cover_id, book.selected_leaf_id, book.back_cover_design_id]
      .filter((v): v is string => typeof v === "string" && !designs.has(v));
    if (pickIds.length) {
      const { data: extra } = await db.from("memory_book_designs").select("id, bucket, path").in("id", pickIds);
      for (const raw of (extra ?? []) as unknown as Row[]) designs.set(String(raw.id), raw);
    }
    const pick = async (id: unknown) => {
      const row = typeof id === "string" ? designs.get(id) : null;
      return row ? await sign(row.bucket, row.path) : null;
    };
    const coverUrl = await pick(book.selected_cover_id);
    const leafBackgroundUrl = await pick(book.selected_leaf_id);
    const backCoverUrl =
      book.back_cover_overridden === true
        ? ((await pick(book.back_cover_design_id)) ?? coverUrl)
        : coverUrl;

    let musicUrl: string | null = null;
    if (book.music_source === "library") {
      musicUrl = await sign(book.music_track_bucket, book.music_track_path);
    } else if (book.music_source === "created" && typeof book.music_variant_id === "string") {
      const { data: variant } = await db
        .from("memory_book_music_variants")
        .select("bucket, path")
        .eq("id", book.music_variant_id)
        .maybeSingle();
      if (variant) musicUrl = await sign((variant as Row).bucket, (variant as Row).path);
    }

    return {
      ok: true,
      book: {
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
      },
    };
  });

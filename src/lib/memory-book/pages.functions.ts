import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS,
  MEMORY_BOOK_MAX_PHOTOS_PER_PAGE,
  clampFrame,
  clampSlot,
  findLayout,
  type MemoryBookPage,
  type MemoryBookPageContent,
  type MemoryBookPhotoSlot,
} from "./pages";

type Row = Record<string, unknown>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** The paid book of the signed-in customer, with its current page capacity. */
async function ownedBook(context: { supabase: unknown; userId: string }, bookId: string) {
  const db = context.supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: Row | null }> };
        };
      };
    };
  };
  const { data } = await db
    .from("memory_book_projects")
    .select("id, internal_pages, video_capacity, credits_spent")
    .eq("user_id", context.userId)
    .eq("id", bookId)
    .maybeSingle();
  if (!data || Number(data.credits_spent ?? 0) <= 0) return null;
  return {
    internalPages: Number(data.internal_pages ?? 0),
    videoCapacity: Number(data.video_capacity ?? 0),
  };
}

function readSlots(value: unknown): MemoryBookPhotoSlot[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MEMORY_BOOK_MAX_PHOTOS_PER_PAGE).map((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    return clampSlot({
      materialId: typeof s.materialId === "string" ? s.materialId : null,
      offsetX: Number(s.offsetX ?? 0),
      offsetY: Number(s.offsetY ?? 0),
      scale: Number(s.scale ?? 1),
    });
  });
}

function rowToPage(row: Row): MemoryBookPage {
  const content = String(row.content_type ?? "empty") as MemoryBookPageContent;
  return {
    pageIndex: Number(row.page_index ?? 0),
    content,
    layout: typeof row.layout === "string" ? row.layout : null,
    slots: readSlots(row.slots),
    frame: clampFrame((row.frame ?? null) as Record<string, number> | null),
    text: typeof row.text_content === "string" ? row.text_content : "",
    videoMaterialId:
      typeof row.video_material_id === "string" ? row.video_material_id : null,
  };
}

/** Every stored internal page of THIS book. */
export const loadMemoryBookPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      pages: MemoryBookPage[];
      internalPages: number;
      videoCapacity: number;
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, pages: [], internalPages: 0, videoCapacity: 0 };
      const db = await admin();
      const { data: rows } = await db
        .from("memory_book_pages")
        .select("page_index, content_type, layout, slots, text_content, video_material_id")
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .order("page_index", { ascending: true });
      return {
        ok: true,
        pages: ((rows ?? []) as unknown as Row[])
          .map(rowToPage)
          .filter((p) => p.pageIndex >= 1 && p.pageIndex <= book.internalPages),
        internalPages: book.internalPages,
        videoCapacity: book.videoCapacity,
      };
    },
  );

/**
 * Saves exactly ONE internal page of ONE book. Nothing else is touched: other
 * pages, the cover, the leaf design and the uploaded materials stay as they are.
 */
export const saveMemoryBookPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; page: MemoryBookPage }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    page: {
      pageIndex: Math.round(Number(input?.page?.pageIndex ?? 0)),
      content: (["empty", "photos", "text", "video"] as string[]).includes(
        String(input?.page?.content),
      )
        ? (String(input?.page?.content) as MemoryBookPageContent)
        : "empty",
      layout: typeof input?.page?.layout === "string" ? input.page.layout : null,
      slots: readSlots(input?.page?.slots),
      text: String(input?.page?.text ?? "").slice(0, 4000),
      videoMaterialId:
        typeof input?.page?.videoMaterialId === "string" ? input.page.videoMaterialId : null,
    } satisfies MemoryBookPage,
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      error?: "not_found" | "bad_page" | "video_too_long" | "video_capacity" | "failed";
      page?: MemoryBookPage;
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, error: "not_found" };
      const index = data.page.pageIndex;
      if (!Number.isFinite(index) || index < 1 || index > book.internalPages) {
        return { ok: false, error: "bad_page" };
      }

      const db = await admin();
      const page: MemoryBookPage = { ...data.page };

      if (page.content === "photos") {
        const layout = findLayout(page.layout);
        if (!layout) return { ok: false, error: "bad_page" };
        // Only photos of THIS book may be placed.
        const ids = page.slots.map((s) => s.materialId).filter(Boolean) as string[];
        let allowed: string[] = [];
        if (ids.length) {
          const { data: mats } = await db
            .from("memory_book_materials")
            .select("id")
            .eq("book_id", data.bookId)
            .eq("user_id", context.userId)
            .eq("kind", "photo")
            .in("id", ids);
          allowed = ((mats ?? []) as unknown as Row[]).map((m) => String(m.id));
        }
        page.slots = layout.areas.map((_, i) => {
          const slot = page.slots[i] ?? { materialId: null, offsetX: 0, offsetY: 0, scale: 1 };
          return clampSlot({
            ...slot,
            materialId:
              slot.materialId && allowed.includes(slot.materialId) ? slot.materialId : null,
          });
        });
        page.videoMaterialId = null;
      } else if (page.content === "video") {
        page.slots = [];
        page.layout = null;
        if (page.videoMaterialId) {
          const { data: video } = await db
            .from("memory_book_materials")
            .select("id, duration_seconds")
            .eq("id", page.videoMaterialId)
            .eq("book_id", data.bookId)
            .eq("user_id", context.userId)
            .eq("kind", "video")
            .maybeSingle();
          if (!video) return { ok: false, error: "not_found" };
          const seconds = Number((video as Row).duration_seconds ?? 0);
          if (!seconds || seconds > MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS) {
            return { ok: false, error: "video_too_long" };
          }
        }
        // The book may never hold more video pages than its video capacity.
        const { data: others } = await db
          .from("memory_book_pages")
          .select("page_index")
          .eq("book_id", data.bookId)
          .eq("user_id", context.userId)
          .eq("content_type", "video");
        const used = ((others ?? []) as unknown as Row[]).filter(
          (r) => Number(r.page_index) !== index,
        ).length;
        if (used >= book.videoCapacity) return { ok: false, error: "video_capacity" };
      } else {
        page.videoMaterialId = null;
        page.slots = [];
        page.layout = null;
      }

      const { error } = await db.from("memory_book_pages").upsert(
        {
          book_id: data.bookId,
          user_id: context.userId,
          page_index: index,
          content_type: page.content,
          layout: page.layout,
          slots: JSON.parse(JSON.stringify(page.slots)),

          text_content: page.text,
          video_material_id: page.videoMaterialId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "book_id,page_index" },
      );
      if (error) return { ok: false, error: "failed" };
      return { ok: true, page };
    },
  );

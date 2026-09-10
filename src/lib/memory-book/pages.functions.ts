import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS,
  MEMORY_BOOK_MAX_PHOTOS_PER_PAGE,
  clampFrame,
  clampSlot,
  clampVideoFrame,
  clampTextDesign,
  findLayout,
  readPlacedDecorations,
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
    .select("id, internal_pages, video_capacity, credits_spent, package_code")
    .eq("user_id", context.userId)
    .eq("id", bookId)
    .maybeSingle();
  if (!data || Number(data.credits_spent ?? 0) <= 0) return null;
  return {
    internalPages: Number(data.internal_pages ?? 0),
    videoCapacity: Number(data.video_capacity ?? 0),
    packageCode: String(data.package_code ?? ""),
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
    textDesign: clampTextDesign(row.text_design ?? null),
    videoMaterialId:
      typeof row.video_material_id === "string" ? row.video_material_id : null,
    videoFrame: clampVideoFrame((row.video_frame ?? null) as Record<string, number> | null),
    decorations: readPlacedDecorations(row.decorations),
    improvePrompt: typeof row.improve_prompt === "string" ? row.improve_prompt : "",
    improveIncludedUsed: row.improve_included_used === true,
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
      /** How many different pages this package may still improve for free. */
      improveAllowance: number;
      improveDistinctUsed: number;
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) {
        return {
          ok: false,
          pages: [],
          internalPages: 0,
          videoCapacity: 0,
          improveAllowance: 0,
          improveDistinctUsed: 0,
        };
      }
      const db = await admin();
      const { data: rows } = await db
        .from("memory_book_pages")
        .select(
          "page_index, content_type, layout, slots, frame, text_content, text_design, video_material_id, video_frame, decorations, improve_prompt, improve_included_used, background_bucket, background_path",
        )
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .order("page_index", { ascending: true });

      // Page 0 is the front cover composition of the SAME book.
      const raw = ((rows ?? []) as unknown as Row[]).filter((r) => {
        const i = Number(r.page_index);
        return i >= 0 && i <= book.internalPages;
      });

      const pages: MemoryBookPage[] = [];
      for (const row of raw) {
        const page = rowToPage(row);
        const bucket = typeof row.background_bucket === "string" ? row.background_bucket : "";
        const path = typeof row.background_path === "string" ? row.background_path : "";
        if (bucket && path) {
          const { data: signed } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60);
          page.backgroundUrl = signed?.signedUrl ?? null;
        }
        pages.push(page);
      }

      const { improveAllowanceOf } = await import("./improve.functions");
      return {
        ok: true,
        pages,
        internalPages: book.internalPages,
        videoCapacity: book.videoCapacity,
        improveAllowance: improveAllowanceOf(book.packageCode),
        improveDistinctUsed: pages.filter((p) => p.improveIncludedUsed).length,
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
      frame: clampFrame(input?.page?.frame),
      text: String(input?.page?.text ?? "").slice(0, 4000),
      textDesign: clampTextDesign(input?.page?.textDesign),
      videoMaterialId:
        typeof input?.page?.videoMaterialId === "string" ? input.page.videoMaterialId : null,
      videoFrame: clampVideoFrame(input?.page?.videoFrame),
      decorations: readPlacedDecorations(input?.page?.decorations),
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
      // Index 0 is the front cover of this book; 1…n are its internal pages.
      if (!Number.isFinite(index) || index < 0 || index > book.internalPages) {
        return { ok: false, error: "bad_page" };
      }

      const db = await admin();
      const page: MemoryBookPage = { ...data.page };
      // The front cover never holds a video.
      if (index === 0) page.videoMaterialId = null;

      // Decorations are one more independent layer of THIS page. Only
      // decorations the administrator switched on may be placed; the library
      // entries themselves are never modified here.
      if (page.decorations.length) {
        const ids = [...new Set(page.decorations.map((d) => d.decorationId))];
        const { data: allowedRows } = await db
          .from("memory_book_decorations")
          .select("id")
          .eq("enabled", true)
          .in("id", ids);
        const allowed = ((allowedRows ?? []) as unknown as Row[]).map((r) => String(r.id));
        page.decorations = page.decorations.filter((d) => allowed.includes(d.decorationId));
      }

      // Video, photos and text are independent layers of the SAME page. The
      // editing tool the customer used never removes another layer.
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
        // The book may never hold more video pages than its video capacity.
        const { data: others } = await db
          .from("memory_book_pages")
          .select("page_index, video_material_id")
          .eq("book_id", data.bookId)
          .eq("user_id", context.userId)
          .not("video_material_id", "is", null);
        const used = ((others ?? []) as unknown as Row[]).filter(
          (r) => Number(r.page_index) !== index,
        ).length;
        if (used >= book.videoCapacity) return { ok: false, error: "video_capacity" };
      }

      {
        const layout = findLayout(page.layout);
        if (!layout) {
          page.layout = null;
          page.slots = [];
        } else {
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
        }
      }

      const { error } = await db.from("memory_book_pages").upsert(
        {
          book_id: data.bookId,
          user_id: context.userId,
          page_index: index,
          content_type: page.content,
          layout: page.layout,
          slots: JSON.parse(JSON.stringify(page.slots)),
          frame: JSON.parse(JSON.stringify(page.frame)),


          text_content: page.text,
          text_design: JSON.parse(JSON.stringify(page.textDesign)),
          video_material_id: page.videoMaterialId,
          video_frame: JSON.parse(JSON.stringify(page.videoFrame)),
          decorations: JSON.parse(JSON.stringify(page.decorations)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "book_id,page_index" },
      );
      if (error) return { ok: false, error: "failed" };
      return { ok: true, page };
    },
  );

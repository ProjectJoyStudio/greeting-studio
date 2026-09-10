// ---------------------------------------------------------------------------
// Memory Book — "Improve Page".
//
// Creates a NEW background for ONE internal page of ONE book. Nothing that the
// customer already placed on that page is read, moved or replaced here: only
// the background picture underneath is stored.
//
// The engine is never chosen in this file. The shared Memory Book page-design
// renderer executes whatever the administrator configured as main and reserve
// generator for that function.
// ---------------------------------------------------------------------------

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { MEMORY_BOOK_DESIGN_BUCKET } from "./designs";
import { MEMORY_BOOK_IMPROVE_PAGE_CREDITS, type MemoryBookImproveState } from "./pages";

type Row = Record<string, unknown>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** The paid book of the signed-in customer. */
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
    .select("id, internal_pages, package_code, credits_spent")
    .eq("user_id", context.userId)
    .eq("id", bookId)
    .maybeSingle();
  if (!data || Number(data.credits_spent ?? 0) <= 0) return null;
  return {
    internalPages: Number(data.internal_pages ?? 0),
    packageCode: String(data.package_code ?? ""),
    creditsSpent: Number(data.credits_spent ?? 0),
  };
}

/** Included improvements of the ORIGINAL package; extra leaves change nothing. */
export function improveAllowanceOf(packageCode: string): number {
  if (packageCode === "mb_15") return 7;
  if (packageCode === "mb_10") return 5;
  return 2;
}

/** How much of the included allowance this exact book has already used. */
export async function improveStateOf(
  bookId: string,
  packageCode: string,
  pageIndex: number,
): Promise<MemoryBookImproveState> {
  const db = await admin();
  const { data } = await db
    .from("memory_book_pages")
    .select("page_index, improve_included_used")
    .eq("book_id", bookId)
    .eq("improve_included_used", true);
  const rows = (data ?? []) as unknown as Row[];
  const allowance = improveAllowanceOf(packageCode);
  return {
    allowance,
    distinctUsed: rows.length,
    pageIncludedUsed: rows.some((r) => Number(r.page_index) === pageIndex),
    priceCredits: MEMORY_BOOK_IMPROVE_PAGE_CREDITS,
  };
}

async function signedBackground(bucket: string, path: string): Promise<string | null> {
  const db = await admin();
  const { data } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export interface ImprovePageResult {
  ok: boolean;
  error?:
    | "not_found"
    | "bad_page"
    | "empty_prompt"
    | "page_limit"
    | "insufficient_credits"
    | "failed";
  /** Whether this generation used the included allowance or one credit. */
  mode?: "included" | "paid";
  backgroundUrl?: string | null;
  improve?: MemoryBookImproveState;
  creditsSpent?: number;
}

/**
 * Creates one new background for the current internal page. A technical
 * failure gives the included improvement — or the charged credit — straight
 * back, and leaves the page exactly as it was.
 */
export const improveMemoryBookPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { bookId: string; pageIndex: number; prompt: string; claimKey: string }) => ({
      bookId: String(input?.bookId ?? "").slice(0, 64),
      pageIndex: Math.round(Number(input?.pageIndex ?? 0)),
      prompt: String(input?.prompt ?? "").slice(0, 1000),
      claimKey: String(input?.claimKey ?? "").slice(0, 64),
    }),
  )
  .handler(async ({ data, context }): Promise<ImprovePageResult> => {
    const book = await ownedBook(context, data.bookId);
    if (!book || !data.claimKey) return { ok: false, error: "not_found" };
    if (data.pageIndex < 1 || data.pageIndex > book.internalPages) {
      return { ok: false, error: "bad_page" };
    }
    if (!data.prompt.trim()) return { ok: false, error: "empty_prompt" };

    const db = await admin();

    // The description belongs to this exact page and is kept even when the
    // generation never succeeds.
    await db.from("memory_book_pages").upsert(
      {
        book_id: data.bookId,
        user_id: context.userId,
        page_index: data.pageIndex,
        improve_prompt: data.prompt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "book_id,page_index" },
    );

    const { data: claimRaw } = await db.rpc("claim_memory_book_page_improvement", {
      _user_id: context.userId,
      _book_id: data.bookId,
      _page_index: data.pageIndex,
      _price: MEMORY_BOOK_IMPROVE_PAGE_CREDITS,
      _claim_key: data.claimKey,
    });
    const claim = (claimRaw ?? {}) as { ok?: boolean; error?: string; mode?: string };
    if (!claim.ok) {
      const improve = await improveStateOf(data.bookId, book.packageCode, data.pageIndex);
      return {
        ok: false,
        error:
          claim.error === "page_limit"
            ? "page_limit"
            : claim.error === "insufficient_credits"
              ? "insufficient_credits"
              : claim.error === "bad_page"
                ? "bad_page"
                : "not_found",
        improve,
        creditsSpent: book.creditsSpent,
      };
    }

    try {
      const { renderMemoryBookDesign } = await import("./designs.server");
      const rendered = await renderMemoryBookDesign("leaf", data.prompt);
      const path = `${context.userId}/${data.bookId}/page-${data.pageIndex}-${crypto.randomUUID()}.${rendered.fileExtension}`;
      const upload = await db.storage
        .from(MEMORY_BOOK_DESIGN_BUCKET)
        .upload(path, rendered.bytes, { contentType: rendered.contentType, upsert: false });
      if (upload.error) throw new Error(upload.error.message);

      // Only the background columns of THIS page are written. Photos, video,
      // text and decorations are never part of this update.
      const { error } = await db
        .from("memory_book_pages")
        .update({
          background_bucket: MEMORY_BOOK_DESIGN_BUCKET,
          background_path: path,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .eq("page_index", data.pageIndex);
      if (error) throw new Error(error.message);

      // The new background is ADDED to the history of this exact page; older
      // successful backgrounds stay available.
      await db.from("memory_book_page_backgrounds").insert({
        user_id: context.userId,
        book_id: data.bookId,
        page_index: data.pageIndex,
        bucket: MEMORY_BOOK_DESIGN_BUCKET,
        path,
        prompt: data.prompt,
      } as never);

      const url = await signedBackground(MEMORY_BOOK_DESIGN_BUCKET, path);
      const fresh = await ownedBook(context, data.bookId);
      return {
        ok: true,
        mode: claim.mode === "paid" ? "paid" : "included",
        backgroundUrl: url,
        improve: await improveStateOf(data.bookId, book.packageCode, data.pageIndex),
        creditsSpent: fresh?.creditsSpent ?? book.creditsSpent,
      };
    } catch {
      await db.rpc("release_memory_book_page_improvement", {
        _user_id: context.userId,
        _book_id: data.bookId,
        _claim_key: data.claimKey,
      });
      const fresh = await ownedBook(context, data.bookId);
      return {
        ok: false,
        error: "failed",
        improve: await improveStateOf(data.bookId, book.packageCode, data.pageIndex),
        creditsSpent: fresh?.creditsSpent ?? book.creditsSpent,
      };
    }
  });

/** One saved background of one exact page. */
export interface MemoryBookPageBackground {
  id: string;
  url: string | null;
  prompt: string;
  createdAt: string;
  active: boolean;
}

async function readBackgrounds(
  userId: string,
  bookId: string,
  pageIndex: number,
): Promise<MemoryBookPageBackground[]> {
  const db = await admin();
  const { data: rows } = await db
    .from("memory_book_page_backgrounds")
    .select("id, bucket, path, prompt, created_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("page_index", pageIndex)
    .order("created_at", { ascending: true });

  const { data: pageRow } = await db
    .from("memory_book_pages")
    .select("background_path")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("page_index", pageIndex)
    .maybeSingle();
  const activePath =
    typeof (pageRow as Row | null)?.background_path === "string"
      ? String((pageRow as Row).background_path)
      : "";

  const out: MemoryBookPageBackground[] = [];
  for (const raw of (rows ?? []) as unknown as Row[]) {
    const bucket = String(raw.bucket ?? "");
    const path = String(raw.path ?? "");
    out.push({
      id: String(raw.id),
      url: await signedBackground(bucket, path),
      prompt: typeof raw.prompt === "string" ? raw.prompt : "",
      createdAt: String(raw.created_at ?? ""),
      active: path === activePath && path !== "",
    });
  }
  return out;
}

/** Every background this exact page ever created successfully. */
export const listMemoryBookPageBackgrounds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; pageIndex: number }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    pageIndex: Math.round(Number(input?.pageIndex ?? 0)),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; backgrounds: MemoryBookPageBackground[] }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, backgrounds: [] };
      return {
        ok: true,
        backgrounds: await readBackgrounds(context.userId, data.bookId, data.pageIndex),
      };
    },
  );

/**
 * Makes one already created background — or the original book design — the
 * active background of this page. No generator runs and nothing is charged.
 */
export const selectMemoryBookPageBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; pageIndex: number; backgroundId: string | null }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    pageIndex: Math.round(Number(input?.pageIndex ?? 0)),
    backgroundId: input?.backgroundId ? String(input.backgroundId).slice(0, 64) : null,
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      backgroundUrl?: string | null;
      backgrounds?: MemoryBookPageBackground[];
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false };
      if (data.pageIndex < 1 || data.pageIndex > book.internalPages) return { ok: false };

      const db = await admin();
      let bucket: string | null = null;
      let path: string | null = null;

      if (data.backgroundId) {
        const { data: row } = await db
          .from("memory_book_page_backgrounds")
          .select("bucket, path")
          .eq("id", data.backgroundId)
          .eq("user_id", context.userId)
          .eq("book_id", data.bookId)
          .eq("page_index", data.pageIndex)
          .maybeSingle();
        if (!row) return { ok: false };
        bucket = String((row as Row).bucket ?? "");
        path = String((row as Row).path ?? "");
      }

      // Only the background reference of this page changes: photos, video,
      // text and decorations are never touched here.
      const { error } = await db.from("memory_book_pages").upsert(
        {
          book_id: data.bookId,
          user_id: context.userId,
          page_index: data.pageIndex,
          background_bucket: bucket,
          background_path: path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "book_id,page_index" },
      );
      if (error) return { ok: false };

      return {
        ok: true,
        backgroundUrl: bucket && path ? await signedBackground(bucket, path) : null,
        backgrounds: await readBackgrounds(context.userId, data.bookId, data.pageIndex),
      };
    },
  );

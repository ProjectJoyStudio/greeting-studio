import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_DESIGN_BUCKET,
  MEMORY_BOOK_LIBRARY_BUCKET,
  MEMORY_BOOK_PACK_CREDITS,
  MEMORY_BOOK_PACK_GENERATIONS,
  type MemoryBookDesignState,
  type MemoryBookDesignVariant,
  type MemoryBookStage,
  type MemoryBookStageState,
} from "./designs";

type Row = Record<string, unknown>;

function toStage(value: unknown): MemoryBookStage {
  return value === "leaf" ? "leaf" : "cover";
}

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
    .select(
      "id, credits_spent, cover_prompt, leaf_prompt, design_stage, selected_cover_id, selected_leaf_id, cover_generations_used, cover_generations_allowed, leaf_generations_used, leaf_generations_allowed, back_cover_design_id, back_cover_overridden",
    )
    .eq("user_id", context.userId)
    .eq("id", bookId)
    .maybeSingle();
  if (!data || Number(data.credits_spent ?? 0) <= 0) return null;
  return data;
}


/** Typed-safe patch of one Memory Book row (dynamic column names). */
async function patchBook(bookId: string, patch: Record<string, unknown>) {
  const db = await admin();
  await db
    .from("memory_book_projects")
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq("id", bookId);
}

async function signed(bucket: string, path: string): Promise<string | null> {
  const db = await admin();
  const { data } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function variantsOf(bookId: string, stage: MemoryBookStage): Promise<MemoryBookDesignVariant[]> {
  const db = await admin();
  const { data } = await db
    .from("memory_book_designs")
    .select("id, stage, source, bucket, path, created_at")
    .eq("book_id", bookId)
    .eq("stage", stage)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as unknown as Row[];
  const out: MemoryBookDesignVariant[] = [];
  for (const row of rows) {
    const url = await signed(text(row.bucket), text(row.path));
    if (!url) continue;
    out.push({
      id: String(row.id),
      stage: toStage(row.stage),
      source: row.source === "library" ? "library" : "generated",
      url,
      createdAt: text(row.created_at),
    });
  }
  return out;
}

function stageState(
  book: Row,
  stage: MemoryBookStage,
  variants: MemoryBookDesignVariant[],
): MemoryBookStageState {
  const used = Number(book[`${stage}_generations_used`] ?? 0);
  const allowed = Number(book[`${stage}_generations_allowed`] ?? 3);
  const selected = book[stage === "cover" ? "selected_cover_id" : "selected_leaf_id"];
  return {
    prompt: text(book[`${stage}_prompt`]),
    variants,
    selectedId: typeof selected === "string" ? selected : null,
    used,
    allowed,
    remaining: Math.max(allowed - used, 0),
  };
}

async function buildState(book: Row): Promise<MemoryBookDesignState> {
  const bookId = String(book.id);
  const [cover, leaf] = await Promise.all([
    variantsOf(bookId, "cover"),
    variantsOf(bookId, "leaf"),
  ]);
  const coverState = stageState(book, "cover", cover);
  const frontUrl = cover.find((v) => v.id === coverState.selectedId)?.url ?? null;
  const overridden = book.back_cover_overridden === true;
  const backId = typeof book.back_cover_design_id === "string" ? book.back_cover_design_id : null;
  // Until the customer chooses otherwise, the back simply follows the front.
  const backUrl =
    overridden && backId
      ? ([...cover, ...leaf].find((v) => v.id === backId)?.url ?? frontUrl)
      : frontUrl;
  return {
    bookId,
    stage: toStage(book.design_stage),
    cover: coverState,
    leaf: stageState(book, "leaf", leaf),
    backCover: { designId: overridden ? backId : null, overridden, url: backUrl },
    creditsSpent: Number(book.credits_spent ?? 0),
  };
}

/** Everything already created for this exact Memory Book. */
export const loadMemoryBookDesigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({ bookId: String(input?.bookId ?? "").slice(0, 64) }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; state: MemoryBookDesignState | null }> => {
    const book = await ownedBook(context, data.bookId);
    if (!book) return { ok: false, state: null };
    return { ok: true, state: await buildState(book) };
  });

/** Stores the description the customer wrote for one stage. */
export const saveMemoryBookDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; stage: string; prompt: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    stage: toStage(input?.stage),
    prompt: String(input?.prompt ?? "").slice(0, 1000),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const book = await ownedBook(context, data.bookId);
    if (!book) return { ok: false };
    await patchBook(data.bookId, { [`${data.stage}_prompt`]: data.prompt });
    return { ok: true };
  });

/**
 * Creates ONE design picture for this Memory Book. A successful picture uses
 * one included creation; a technical failure gives the creation straight back.
 */
export const generateMemoryBookDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; stage: string; prompt: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    stage: toStage(input?.stage),
    prompt: String(input?.prompt ?? "").slice(0, 1000),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      error?: "not_found" | "empty_prompt" | "no_generations" | "failed";
      state?: MemoryBookDesignState;
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, error: "not_found" };
      if (!data.prompt.trim()) return { ok: false, error: "empty_prompt" };

      const db = await admin();
      await patchBook(data.bookId, { [`${data.stage}_prompt`]: data.prompt });

      const { data: claim } = await db.rpc("claim_memory_book_generation", {
        _user_id: context.userId,
        _book_id: data.bookId,
        _stage: data.stage,
      });
      if (!(claim as { ok?: boolean } | null)?.ok) {
        return { ok: false, error: "no_generations" };
      }

      try {
        const { renderMemoryBookDesign } = await import("./designs.server");
        const rendered = await renderMemoryBookDesign(data.stage, data.prompt);
        const path = `${context.userId}/${data.bookId}/${data.stage}-${crypto.randomUUID()}.${rendered.fileExtension}`;
        const upload = await db.storage
          .from(MEMORY_BOOK_DESIGN_BUCKET)
          .upload(path, rendered.bytes, { contentType: rendered.contentType, upsert: false });
        if (upload.error) throw new Error(upload.error.message);

        await db.from("memory_book_designs").insert({
          book_id: data.bookId,
          user_id: context.userId,
          stage: data.stage,
          source: "generated",
          bucket: MEMORY_BOOK_DESIGN_BUCKET,
          path,
          prompt: data.prompt,
        });
      } catch {
        await db.rpc("release_memory_book_generation", {
          _user_id: context.userId,
          _book_id: data.bookId,
          _stage: data.stage,
        });
        const fresh = await ownedBook(context, data.bookId);
        return {
          ok: false,
          error: "failed",
          state: fresh ? await buildState(fresh) : undefined,
        };
      }

      const fresh = await ownedBook(context, data.bookId);
      return { ok: true, state: fresh ? await buildState(fresh) : undefined };
    },
  );

/** Buys three more successful creations for one stage of THIS book. */
export const purchaseMemoryBookGenerations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; stage: string; purchaseKey: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    stage: toStage(input?.stage),
    purchaseKey: String(input?.purchaseKey ?? "").slice(0, 64),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      error?: "not_found" | "insufficient_credits" | "failed";
      state?: MemoryBookDesignState;
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book || !data.purchaseKey) return { ok: false, error: "not_found" };

      const db = await admin();
      const { data: result, error } = await db.rpc("purchase_memory_book_generations", {
        _user_id: context.userId,
        _book_id: data.bookId,
        _stage: data.stage,
        _price: MEMORY_BOOK_PACK_CREDITS,
        _generations: MEMORY_BOOK_PACK_GENERATIONS,
        _purchase_key: data.purchaseKey,
      });
      const payload = (result ?? {}) as { ok?: boolean; error?: string };
      if (error || !payload.ok) {
        return {
          ok: false,
          error: payload.error === "insufficient_credits" ? "insufficient_credits" : "failed",
        };
      }
      const fresh = await ownedBook(context, data.bookId);
      return { ok: true, state: fresh ? await buildState(fresh) : undefined };
    },
  );

/** Confirms one saved variant as the cover or the leaf of this book. */
export const selectMemoryBookDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; designId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    designId: String(input?.designId ?? "").slice(0, 64),
  }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; state?: MemoryBookDesignState }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false };
      const db = await admin();
      const { data: design } = await db
        .from("memory_book_designs")
        .select("id, stage")
        .eq("id", data.designId)
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!design) return { ok: false };
      const stage = toStage((design as unknown as Row).stage);
      await patchBook(data.bookId, {
        [stage === "cover" ? "selected_cover_id" : "selected_leaf_id"]: data.designId,
      });
      const fresh = await ownedBook(context, data.bookId);
      return { ok: true, state: fresh ? await buildState(fresh) : undefined };
    },
  );

/** Moves this book between the cover stage and the leaf stage. */
export const setMemoryBookStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; stage: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    stage: toStage(input?.stage),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; state?: MemoryBookDesignState }> => {
    const book = await ownedBook(context, data.bookId);
    if (!book) return { ok: false };
    await patchBook(data.bookId, { design_stage: data.stage });
    const fresh = await ownedBook(context, data.bookId);
    return { ok: true, state: fresh ? await buildState(fresh) : undefined };
  });

export interface MemoryBookLibraryItem {
  path: string;
  url: string;
}

/** The ready-made designs Project Joy offers for this stage. */
export const listMemoryBookLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stage: string }) => ({ stage: toStage(input?.stage) }))
  .handler(async ({ data }): Promise<{ items: MemoryBookLibraryItem[] }> => {
    const db = await admin();
    const { data: files } = await db.storage
      .from(MEMORY_BOOK_LIBRARY_BUCKET)
      .list(data.stage, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    const items: MemoryBookLibraryItem[] = [];
    for (const file of files ?? []) {
      if (!file?.name) continue;
      const path = `${data.stage}/${file.name}`;
      const url = await signed(MEMORY_BOOK_LIBRARY_BUCKET, path);
      if (url) items.push({ path, url });
    }
    return { items };
  });

/** Attaches a chosen ready-made design to THIS Memory Book and selects it. */
export const chooseMemoryBookLibraryDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; stage: string; path: string; target?: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    stage: toStage(input?.stage),
    path: String(input?.path ?? "").slice(0, 400),
    target: input?.target === "back" ? ("back" as const) : ("front" as const),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; state?: MemoryBookDesignState }> => {
    const book = await ownedBook(context, data.bookId);
    if (!book) return { ok: false };
    if (!data.path.startsWith(`${data.stage}/`)) return { ok: false };

    const db = await admin();
    const { data: inserted } = await db
      .from("memory_book_designs")
      .insert({
        book_id: data.bookId,
        user_id: context.userId,
        stage: data.stage,
        source: "library",
        bucket: MEMORY_BOOK_LIBRARY_BUCKET,
        path: data.path,
      })
      .select("id")
      .maybeSingle();
    const designId = inserted ? String((inserted as unknown as Row).id) : null;
    if (designId) {
      // A back-cover choice never touches the front cover selection.
      await patchBook(
        data.bookId,
        data.target === "back"
          ? { back_cover_design_id: designId, back_cover_overridden: true }
          : { [data.stage === "cover" ? "selected_cover_id" : "selected_leaf_id"]: designId },
      );
    }
    const fresh = await ownedBook(context, data.bookId);
    return { ok: Boolean(designId), state: fresh ? await buildState(fresh) : undefined };
  });

/**
 * Chooses the background of the BACK cover. An empty design id gives the back
 * cover back to the front cover, so it follows every later front change again.
 */
export const setMemoryBookBackCoverDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; designId?: string | null }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    designId: input?.designId ? String(input.designId).slice(0, 64) : null,
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; state?: MemoryBookDesignState }> => {
    const book = await ownedBook(context, data.bookId);
    if (!book) return { ok: false };

    if (data.designId) {
      const db = await admin();
      const { data: design } = await db
        .from("memory_book_designs")
        .select("id")
        .eq("id", data.designId)
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!design) return { ok: false };
      await patchBook(data.bookId, {
        back_cover_design_id: data.designId,
        back_cover_overridden: true,
      });
    } else {
      await patchBook(data.bookId, {
        back_cover_design_id: null,
        back_cover_overridden: false,
      });
    }
    const fresh = await ownedBook(context, data.bookId);
    return { ok: true, state: fresh ? await buildState(fresh) : undefined };
  });

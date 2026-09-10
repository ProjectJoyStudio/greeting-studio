// ---------------------------------------------------------------------------
// Memory Book — Music stage.
//
// One Memory Book has exactly ONE background composition. It is either a track
// of the existing Project Joy Music Library (always free) or a composition the
// customer created for this exact book. Created music never enters the shared
// library and never leaves this book.
// ---------------------------------------------------------------------------

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_MUSIC_BUCKET,
  MEMORY_BOOK_MUSIC_CREDITS,
  MEMORY_BOOK_MUSIC_INCLUDED,
  MEMORY_BOOK_MUSIC_SECONDS,
  musicVolumeOf,
  type MemoryBookMusicState,
  type MemoryBookMusicVariant,
} from "./music";

type Row = Record<string, unknown>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function signed(bucket: string | null, path: string | null): Promise<string | null> {
  if (!bucket || !path) return null;
  const db = await admin();
  const { data } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

/** The paid book of the signed-in customer, or nothing. */
async function bookRow(userId: string, bookId: string): Promise<Row | null> {
  const db = await admin();
  const { data } = await db
    .from("memory_book_projects")
    .select(
      "id, credits_spent, music_source, music_track_id, music_track_title, music_track_bucket, music_track_path, music_variant_id, music_enabled, music_volume, music_included_used",
    )
    .eq("user_id", userId)
    .eq("id", bookId)
    .maybeSingle();
  const row = (data ?? null) as Row | null;
  if (!row || Number(row.credits_spent ?? 0) <= 0) return null;
  return row;
}

async function stateOf(userId: string, bookId: string, row: Row): Promise<MemoryBookMusicState> {
  const db = await admin();
  const { data } = await db
    .from("memory_book_music_variants")
    .select("id, prompt, bucket, path, duration_seconds, created_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .order("created_at", { ascending: true });

  const variants: MemoryBookMusicVariant[] = [];
  for (const raw of (data ?? []) as unknown as Row[]) {
    variants.push({
      id: String(raw.id),
      prompt: typeof raw.prompt === "string" ? raw.prompt : "",
      url: await signed(String(raw.bucket ?? ""), String(raw.path ?? "")),
      durationSeconds: Number(raw.duration_seconds ?? MEMORY_BOOK_MUSIC_SECONDS),
      createdAt: String(raw.created_at ?? ""),
    });
  }

  const source =
    row.music_source === "library" || row.music_source === "created"
      ? (row.music_source as "library" | "created")
      : "none";
  const variantId = typeof row.music_variant_id === "string" ? row.music_variant_id : null;
  const includedUsed = Number(row.music_included_used ?? 0);

  const selectedUrl =
    source === "library"
      ? await signed(
          typeof row.music_track_bucket === "string" ? row.music_track_bucket : null,
          typeof row.music_track_path === "string" ? row.music_track_path : null,
        )
      : source === "created"
        ? (variants.find((v) => v.id === variantId)?.url ?? null)
        : null;

  return {
    bookId,
    source,
    trackId: typeof row.music_track_id === "string" ? row.music_track_id : null,
    trackTitle: typeof row.music_track_title === "string" ? row.music_track_title : "",
    variantId,
    variants,
    selectedUrl,
    enabled: row.music_enabled !== false,
    volume: musicVolumeOf(row.music_volume),
    includedUsed,
    includedTotal: MEMORY_BOOK_MUSIC_INCLUDED,
    remaining: Math.max(0, MEMORY_BOOK_MUSIC_INCLUDED - includedUsed),
    priceCredits: MEMORY_BOOK_MUSIC_CREDITS,
    creditsSpent: Number(row.credits_spent ?? 0),
  };
}

/** Everything this exact book remembers about its background music. */
export const loadMemoryBookMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
  }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; state: MemoryBookMusicState | null }> => {
      const row = await bookRow(context.userId, data.bookId);
      if (!row) return { ok: false, state: null };
      return { ok: true, state: await stateOf(context.userId, data.bookId, row) };
    },
  );

/**
 * Chooses one track of the EXISTING Project Joy Music Library for this book.
 * Free: no credit is ever charged and the library itself is not changed.
 */
export const chooseMemoryBookLibraryTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; trackId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    trackId: String(input?.trackId ?? "").slice(0, 64),
  }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; state: MemoryBookMusicState | null }> => {
      const row = await bookRow(context.userId, data.bookId);
      if (!row) return { ok: false, state: null };

      const db = await admin();
      const { data: track } = await db
        .from("music_tracks")
        .select("id, title, storage_bucket, storage_path, is_active")
        .eq("id", data.trackId)
        .maybeSingle();
      const t = (track ?? null) as Row | null;
      if (!t || t.is_active === false) {
        return { ok: false, state: await stateOf(context.userId, data.bookId, row) };
      }

      await db
        .from("memory_book_projects")
        .update({
          music_source: "library",
          music_track_id: String(t.id),
          music_track_title: String(t.title ?? ""),
          music_track_bucket: String(t.storage_bucket ?? ""),
          music_track_path: String(t.storage_path ?? ""),
          music_variant_id: null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", data.bookId)
        .eq("user_id", context.userId);

      const fresh = await bookRow(context.userId, data.bookId);
      return { ok: true, state: await stateOf(context.userId, data.bookId, fresh ?? row) };
    },
  );

/**
 * Creates ONE two-minute composition for this exact book. The attempt — or the
 * two credits — is claimed first and given straight back when the creation
 * fails technically, so only a stored, usable composition ever counts.
 */
export const createMemoryBookMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; prompt: string; claimKey: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    prompt: String(input?.prompt ?? "").slice(0, 1500),
    claimKey: String(input?.claimKey ?? "").slice(0, 64),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      error?: "not_found" | "empty_prompt" | "insufficient_credits" | "failed";
      mode?: "included" | "paid";
      state: MemoryBookMusicState | null;
    }> => {
      const row = await bookRow(context.userId, data.bookId);
      if (!row || !data.claimKey) return { ok: false, error: "not_found", state: null };
      if (!data.prompt.trim()) {
        return {
          ok: false,
          error: "empty_prompt",
          state: await stateOf(context.userId, data.bookId, row),
        };
      }

      const db = await admin();
      const { data: claimRaw } = await db.rpc("claim_memory_book_music", {
        _user_id: context.userId,
        _book_id: data.bookId,
        _price: MEMORY_BOOK_MUSIC_CREDITS,
        _claim_key: data.claimKey,
        _included: MEMORY_BOOK_MUSIC_INCLUDED,
      });
      const claim = (claimRaw ?? {}) as {
        ok?: boolean;
        error?: string;
        mode?: string;
        reused?: boolean;
      };
      if (!claim.ok) {
        const fresh = await bookRow(context.userId, data.bookId);
        return {
          ok: false,
          error: claim.error === "insufficient_credits" ? "insufficient_credits" : "failed",
          state: await stateOf(context.userId, data.bookId, fresh ?? row),
        };
      }

      // A repeated request with the same key never creates a second track.
      if (claim.reused) {
        const fresh = await bookRow(context.userId, data.bookId);
        return {
          ok: true,
          mode: claim.mode === "paid" ? "paid" : "included",
          state: await stateOf(context.userId, data.bookId, fresh ?? row),
        };
      }

      try {
        const { createMusicComposition } = await import("./music.server");
        const created = await createMusicComposition(data.prompt);
        const path = `${context.userId}/${data.bookId}/${crypto.randomUUID()}.${created.fileExtension}`;
        const upload = await db.storage
          .from(MEMORY_BOOK_MUSIC_BUCKET)
          .upload(path, created.bytes, { contentType: created.contentType, upsert: false });
        if (upload.error) throw new Error(upload.error.message);

        const { data: inserted, error } = await db
          .from("memory_book_music_variants")
          .insert({
            book_id: data.bookId,
            user_id: context.userId,
            prompt: data.prompt,
            bucket: MEMORY_BOOK_MUSIC_BUCKET,
            path,
            duration_seconds: created.durationSeconds,
          } as never)
          .select("id")
          .maybeSingle();
        if (error || !inserted) throw new Error(error?.message ?? "not_stored");

        await db
          .from("memory_book_projects")
          .update({
            music_source: "created",
            music_variant_id: String((inserted as Row).id),
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", data.bookId)
          .eq("user_id", context.userId);

        const fresh = await bookRow(context.userId, data.bookId);
        return {
          ok: true,
          mode: claim.mode === "paid" ? "paid" : "included",
          state: await stateOf(context.userId, data.bookId, fresh ?? row),
        };
      } catch {
        await db.rpc("release_memory_book_music", {
          _user_id: context.userId,
          _book_id: data.bookId,
          _claim_key: data.claimKey,
        });
        const fresh = await bookRow(context.userId, data.bookId);
        return {
          ok: false,
          error: "failed",
          state: await stateOf(context.userId, data.bookId, fresh ?? row),
        };
      }
    },
  );

/** Uses one already created composition again. Free, and nothing is created. */
export const selectMemoryBookMusicVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; variantId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    variantId: String(input?.variantId ?? "").slice(0, 64),
  }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; state: MemoryBookMusicState | null }> => {
      const row = await bookRow(context.userId, data.bookId);
      if (!row) return { ok: false, state: null };

      const db = await admin();
      const { data: variant } = await db
        .from("memory_book_music_variants")
        .select("id")
        .eq("id", data.variantId)
        .eq("user_id", context.userId)
        .eq("book_id", data.bookId)
        .maybeSingle();
      if (!variant) return { ok: false, state: await stateOf(context.userId, data.bookId, row) };

      await db
        .from("memory_book_projects")
        .update({
          music_source: "created",
          music_variant_id: data.variantId,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", data.bookId)
        .eq("user_id", context.userId);

      const fresh = await bookRow(context.userId, data.bookId);
      return { ok: true, state: await stateOf(context.userId, data.bookId, fresh ?? row) };
    },
  );

/** Removes the background music of this book. Nothing is deleted or charged. */
export const clearMemoryBookMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
  }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; state: MemoryBookMusicState | null }> => {
      const row = await bookRow(context.userId, data.bookId);
      if (!row) return { ok: false, state: null };
      const db = await admin();
      await db
        .from("memory_book_projects")
        .update({
          music_source: "none",
          music_variant_id: null,
          music_track_id: null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", data.bookId)
        .eq("user_id", context.userId);
      const fresh = await bookRow(context.userId, data.bookId);
      return { ok: true, state: await stateOf(context.userId, data.bookId, fresh ?? row) };
    },
  );

/** Remembers whether the music plays and how loud it is, per book. */
export const setMemoryBookMusicPlayback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; enabled?: boolean; volume?: number }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    enabled: typeof input?.enabled === "boolean" ? input.enabled : null,
    volume: typeof input?.volume === "number" ? musicVolumeOf(input.volume) : null,
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const row = await bookRow(context.userId, data.bookId);
    if (!row) return { ok: false };
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.enabled !== null) patch["music_enabled"] = data.enabled;
    if (data.volume !== null) patch["music_volume"] = data.volume;
    const db = await admin();
    await db
      .from("memory_book_projects")
      .update(patch as never)
      .eq("id", data.bookId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** The Project Joy library tracks a customer may choose from, with links. */
export const listMemoryBookMusicLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async (): Promise<{
      tracks: { id: string; title: string; category: string; durationSeconds: number; url: string | null }[];
    }> => {
      const db = await admin();
      const { data } = await db
        .from("music_tracks")
        .select("id, title, category, duration_seconds, storage_bucket, storage_path")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      const tracks = [];
      for (const raw of (data ?? []) as unknown as Row[]) {
        tracks.push({
          id: String(raw.id),
          title: String(raw.title ?? ""),
          category: String(raw.category ?? ""),
          durationSeconds: Number(raw.duration_seconds ?? 0),
          url: await signed(String(raw.storage_bucket ?? ""), String(raw.storage_path ?? "")),
        });
      }
      return { tracks };
    },
  );

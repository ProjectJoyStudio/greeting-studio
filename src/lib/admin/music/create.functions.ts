// ---------------------------------------------------------------------------
// Admin — creating music for the EXISTING Project Joy Music Library.
//
// A created composition is only a draft. It becomes a normal library track
// exclusively when an administrator explicitly publishes it. Nothing here
// touches customer credits or any Memory Book.
// ---------------------------------------------------------------------------

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MUSIC_LIBRARY_BUCKET } from "@/lib/music/types";

type Row = Record<string, unknown>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function isEditor(userId: string): Promise<boolean> {
  const db = await admin();
  const { data } = await db.rpc("is_editor_or_above", { _user_id: userId });
  return data === true;
}

async function signed(bucket: string, path: string): Promise<string | null> {
  const db = await admin();
  const { data } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

export interface AdminMusicDraft {
  id: string;
  title: string;
  prompt: string;
  category: string;
  durationSeconds: number;
  url: string | null;
  createdAt: string;
}

async function listDrafts(): Promise<AdminMusicDraft[]> {
  const db = await admin();
  const { data } = await db
    .from("admin_music_drafts")
    .select("id, title, prompt, category, duration_seconds, bucket, path, created_at")
    .is("published_track_id", null)
    .order("created_at", { ascending: false });
  const out: AdminMusicDraft[] = [];
  for (const raw of (data ?? []) as unknown as Row[]) {
    out.push({
      id: String(raw.id),
      title: String(raw.title ?? ""),
      prompt: String(raw.prompt ?? ""),
      category: String(raw.category ?? "background"),
      durationSeconds: Number(raw.duration_seconds ?? 0),
      url: await signed(String(raw.bucket ?? ""), String(raw.path ?? "")),
      createdAt: String(raw.created_at ?? ""),
    });
  }
  return out;
}

/** Every created composition still waiting for an administrator's decision. */
export const listAdminMusicDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; drafts: AdminMusicDraft[] }> => {
    if (!(await isEditor(context.userId))) return { ok: false, drafts: [] };
    return { ok: true, drafts: await listDrafts() };
  });

/** Creates ONE composition through Eleven Music v2 and keeps it as a draft. */
export const createAdminMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { prompt: string; title?: string; category?: string; seconds?: number }) => ({
      prompt: String(input?.prompt ?? "").slice(0, 1500),
      title: String(input?.title ?? "").slice(0, 120),
      category: String(input?.category ?? "background").slice(0, 40),
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      error?: "forbidden" | "empty_prompt" | "failed";
      drafts: AdminMusicDraft[];
    }> => {
      if (!(await isEditor(context.userId))) return { ok: false, error: "forbidden", drafts: [] };
      if (!data.prompt.trim()) {
        return { ok: false, error: "empty_prompt", drafts: await listDrafts() };
      }

      const db = await admin();
      try {
        const { createMusicComposition } = await import("@/lib/memory-book/music.server");
        const created = await createMusicComposition(data.prompt);
        const path = `drafts/${crypto.randomUUID()}.${created.fileExtension}`;
        const upload = await db.storage
          .from(MUSIC_LIBRARY_BUCKET)
          .upload(path, created.bytes, { contentType: created.contentType, upsert: false });
        if (upload.error) throw new Error(upload.error.message);

        await db.from("admin_music_drafts").insert({
          created_by: context.userId,
          title: data.title || data.prompt.trim().slice(0, 60),
          prompt: data.prompt,
          category: data.category,
          bucket: MUSIC_LIBRARY_BUCKET,
          path,
          duration_seconds: created.durationSeconds,
        } as never);

        return { ok: true, drafts: await listDrafts() };
      } catch {
        return { ok: false, error: "failed", drafts: await listDrafts() };
      }
    },
  );

/**
 * Publishes one approved draft into the EXISTING Project Joy Music Library.
 * The same shared `music_tracks` library is used; no second library exists.
 */
export const publishAdminMusicDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { draftId: string; title?: string; category?: string }) => ({
    draftId: String(input?.draftId ?? "").slice(0, 64),
    title: String(input?.title ?? "").slice(0, 120),
    category: String(input?.category ?? "").slice(0, 40),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; error?: "forbidden" | "failed"; drafts: AdminMusicDraft[] }> => {
      if (!(await isEditor(context.userId))) return { ok: false, error: "forbidden", drafts: [] };
      const db = await admin();
      const { data: draftRow } = await db
        .from("admin_music_drafts")
        .select("id, title, category, bucket, path, duration_seconds, published_track_id")
        .eq("id", data.draftId)
        .maybeSingle();
      const draft = (draftRow ?? null) as Row | null;
      if (!draft || draft.published_track_id) {
        return { ok: false, error: "failed", drafts: await listDrafts() };
      }

      const { data: last } = await db
        .from("music_tracks")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder =
        Number((last?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;

      const { data: track, error } = await db
        .from("music_tracks")
        .insert({
          title: data.title || String(draft.title ?? "Project Joy music"),
          category: data.category || String(draft.category ?? "background"),
          storage_bucket: String(draft.bucket ?? ""),
          storage_path: String(draft.path ?? ""),
          duration_seconds: Number(draft.duration_seconds ?? 0),
          sort_order: nextOrder,
        } as never)
        .select("id")
        .maybeSingle();
      if (error || !track) return { ok: false, error: "failed", drafts: await listDrafts() };

      await db
        .from("admin_music_drafts")
        .update({ published_track_id: String((track as Row).id) } as never)
        .eq("id", data.draftId);

      return { ok: true, drafts: await listDrafts() };
    },
  );

/** Throws away a composition the administrator does not want. */
export const discardAdminMusicDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { draftId: string }) => ({
    draftId: String(input?.draftId ?? "").slice(0, 64),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; error?: "forbidden"; drafts: AdminMusicDraft[] }> => {
      if (!(await isEditor(context.userId))) return { ok: false, error: "forbidden", drafts: [] };
      const db = await admin();
      const { data: draftRow } = await db
        .from("admin_music_drafts")
        .select("bucket, path, published_track_id")
        .eq("id", data.draftId)
        .maybeSingle();
      const draft = (draftRow ?? null) as Row | null;
      if (draft && !draft.published_track_id) {
        await db.storage
          .from(String(draft.bucket ?? ""))
          .remove([String(draft.path ?? "")])
          .catch(() => undefined);
      }
      await db.from("admin_music_drafts").delete().eq("id", data.draftId);
      return { ok: true, drafts: await listDrafts() };
    },
  );

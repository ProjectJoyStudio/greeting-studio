// Adding ONE new track to the shared Project Joy music library.
//
// A new library track is written straight into the working area under its own
// permanent shared address `system/music/<track-id>.<extension>` and then gets
// an independent verified reserve copy. Nothing is written to the older
// storage first, and no later move is needed.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MEMORY_BOOK_R2_BUCKET } from "@/lib/memory-book/materials";

type Row = Record<string, unknown>;

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const raw = dot >= 0 ? fileName.slice(dot + 1) : "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp3";
}

async function isAdmin(context: { supabase: unknown; userId: string }): Promise<boolean> {
  const db = context.supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await db.rpc("is_admin", { _user_id: context.userId });
  return data === true;
}

/** Hands the admin page one short-lived address in the working area. */
export const createLibraryTrackUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName?: string; contentType?: string }) => ({
    fileName: String(input?.fileName ?? "").slice(0, 200),
    contentType: String(input?.contentType ?? "").slice(0, 120) || "audio/mpeg",
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      trackId?: string;
      key?: string;
      uploadUrl?: string;
      contentType?: string;
    }> => {
      if (!(await isAdmin(context))) return { ok: false };

      const { storageFor } = await import("@/lib/storage/registry.server");
      const primary = storageFor("primary");
      // Without the working area the page simply keeps its previous way.
      if (!primary) return { ok: false };

      const trackId = crypto.randomUUID();
      const key = `system/music/${trackId}.${extensionOf(data.fileName)}`;
      const uploadUrl = await primary.signedWriteUrl(key, 60 * 60 * 2, data.contentType);
      if (!uploadUrl) return { ok: false };

      return { ok: true, trackId, key, uploadUrl, contentType: data.contentType };
    },
  );

/**
 * Confirms the new track: the stored file is verified, recorded as the working
 * copy, given its reserve copy and only then listed in the library. A reserve
 * failure never destroys a successful upload — it stays retryable.
 */
export const finalizeLibraryTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      trackId?: string;
      key?: string;
      title?: string;
      category?: string;
      durationSeconds?: number;
    }) => ({
      trackId: String(input?.trackId ?? "").slice(0, 64),
      key: String(input?.key ?? "").slice(0, 400),
      title: String(input?.title ?? "").slice(0, 200),
      category: String(input?.category ?? "background").slice(0, 40),
      durationSeconds: Number(input?.durationSeconds ?? 0) || 0,
    }),
  )
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; backup?: boolean; error?: string }> => {
      if (!(await isAdmin(context))) return { ok: false, error: "forbidden" };
      if (!data.trackId || !data.key.startsWith("system/music/")) {
        return { ok: false, error: "bad_request" };
      }

      const { recordPrimary, backupToReserve } = await import("@/lib/storage/backup.server");
      const stored = await recordPrimary(data.key);
      if (!stored) return { ok: false, error: "not_stored" };

      const { storageFor } = await import("@/lib/storage/registry.server");
      let backup = false;
      if (storageFor("backup")) {
        const res = await backupToReserve(data.key).catch(() => ({ ok: false }) as const);
        backup = res.ok === true;
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: last } = await supabaseAdmin
        .from("music_tracks")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder =
        Number(((last ?? [])[0] as Row | undefined)?.["sort_order"] ?? 0) + 1;

      const { error } = await supabaseAdmin.from("music_tracks").insert({
        id: data.trackId,
        title: data.title || "Project Joy music",
        category: data.category,
        storage_bucket: MEMORY_BOOK_R2_BUCKET,
        storage_path: data.key,
        duration_seconds: data.durationSeconds,
        sort_order: nextOrder,
      } as never);
      if (error) return { ok: false, error: "library_insert_failed" };

      return { ok: true, backup };
    },
  );

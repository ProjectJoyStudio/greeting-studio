// Server-side helpers for the shared Project Joy music library.
//
// A library track may live in the older storage or in the working area. The
// browser cannot address the working area itself, so it asks here for a
// short-lived playable link and the server answers for both locations.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAY_SECONDS = 60 * 60 * 12;

/** Short-lived playable links for stored audio, wherever each file lives. */
export const resolveMusicUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { items?: { bucket: string | null; path: string | null }[] }) => ({
    items: (input?.items ?? []).slice(0, 200).map((item) => ({
      bucket: typeof item?.bucket === "string" ? item.bucket.slice(0, 120) : null,
      path: typeof item?.path === "string" ? item.path.slice(0, 400) : null,
    })),
  }))
  .handler(async ({ data }): Promise<{ urls: (string | null)[] }> => {
    const { memoryBookFileUrl } = await import("@/lib/memory-book/storage.server");
    const urls: (string | null)[] = [];
    for (const item of data.items) {
      urls.push(
        item.bucket && item.path
          ? await memoryBookFileUrl(item.bucket, item.path, PLAY_SECONDS)
          : null,
      );
    }
    return { urls };
  });

/**
 * Removes exactly one stored library audio file, wherever it lives. Deletion
 * stays per area: a reserve copy keeps its own independent life.
 */
export const removeLibraryMusicFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bucket?: string; path?: string }) => ({
    bucket: String(input?.bucket ?? "").slice(0, 120),
    path: String(input?.path ?? "").slice(0, 400),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (isAdmin !== true) return { ok: false };
    if (!data.bucket || !data.path) return { ok: false };
    const { memoryBookFileRemove } = await import("@/lib/memory-book/storage.server");
    await memoryBookFileRemove(data.bucket, data.path);
    return { ok: true };
  });

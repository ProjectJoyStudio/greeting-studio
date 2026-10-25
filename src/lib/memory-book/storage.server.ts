// One place that knows where a Memory Book file really lives.
//
// Older files stay exactly where they are; only new book videos are kept in
// the Cloudflare area. Every caller asks here and never has to care which.

import { MEMORY_BOOK_R2_BUCKET, r2DeleteObject, r2SignedGetUrl } from "./r2.server";

export { MEMORY_BOOK_R2_BUCKET };

export function isR2Bucket(bucket: string | null | undefined): boolean {
  return bucket === MEMORY_BOOK_R2_BUCKET;
}

/** A short-lived read address for one stored file, wherever it lives. */
export async function memoryBookFileUrl(
  bucket: string,
  path: string,
  seconds: number,
  bookId?: string,
): Promise<string | null> {
  if (!bucket || !path) return null;
  const inferredBook = /^users\/[^/]+\/memory-book\/([^/]+)\//.exec(path)?.[1];
  if (bookId || inferredBook) {
    const { resolvePackageAsset } = await import("./storage-package.server");
    const resolved = await resolvePackageAsset(bookId || inferredBook || "", bucket, path);
    bucket = resolved.bucket; path = resolved.path;
    if (resolved.emergency) {
      const { storageFor } = await import("@/lib/storage/registry.server");
      return await storageFor("backup")?.signedReadUrl(path, seconds) ?? null;
    }
  }
  if (isR2Bucket(bucket)) {
    const { storageFor } = await import("@/lib/storage/registry.server");
    return await storageFor("primary")?.signedReadUrl(path, seconds) ?? null;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

/** Removes exactly one stored file, wherever it lives. */
export async function memoryBookFileRemove(bucket: string, path: string): Promise<void> {
  if (!bucket || !path) return;
  if (isR2Bucket(bucket)) {
    if (!(await r2DeleteObject(path))) throw new Error("primary_delete_failed");
    // Only the working copy is gone. The reserve copy in the other area keeps
    // its own independent life and is never deleted along with it.
    const { markPrimaryDeleted } = await import("@/lib/storage/backup.server");
    await markPrimaryDeleted(path);
    return;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw new Error("legacy_delete_failed");
}


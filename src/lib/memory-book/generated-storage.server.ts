// Server-only: where a NEWLY created Memory Book file is stored.
//
// Every new customer file of a book goes to the working area under one stable
// address, is verified there, and then gets its own independent reserve copy.
// Nothing is written to the older area first. When the working area is not
// available at all, the previous area still accepts the file so the customer
// never loses a result.

import { userKey } from "@/lib/storage/keys";
import { storageFor } from "@/lib/storage/registry.server";

import { MEMORY_BOOK_R2_BUCKET } from "./storage.server";

export interface StoredMemoryBookFile {
  bucket: string;
  path: string;
}

export async function storeMemoryBookFile(options: {
  userId: string;
  bookId: string;
  /** Address parts inside the book folder, e.g. ["designs", "cover-xyz.png"]. */
  parts: string[];
  bytes: Uint8Array;
  contentType: string;
  /** Previous area, used only when the working area is unavailable. */
  legacyBucket: string;
  legacyPath: string;
}): Promise<StoredMemoryBookFile> {
  const primary = storageFor("primary");
  if (primary?.isReady()) {
    const key = userKey(options.userId, "memory-book", options.bookId, ...options.parts);
    const stored = await primary.put(
      key,
      options.bytes as unknown as BodyInit,
      options.contentType,
    );
    if (stored) {
      const { recordPrimary, backupToReserve } = await import("@/lib/storage/backup.server");
      const verified = await recordPrimary(key);
      if (verified) {
        // The reserve copy is automatic, but never decides the result: a
        // failing copy stays recorded and retryable, the file stays usable.
        try {
          await backupToReserve(key);
        } catch {
          /* recorded as a failed reserve copy; the working file is untouched */
        }
        return { bucket: MEMORY_BOOK_R2_BUCKET, path: key };
      }
    }
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const upload = await supabaseAdmin.storage
    .from(options.legacyBucket)
    .upload(options.legacyPath, options.bytes, {
      contentType: options.contentType,
      upsert: false,
    });
  if (upload.error) throw new Error(upload.error.message);
  return { bucket: options.legacyBucket, path: options.legacyPath };
}

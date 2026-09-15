// Stores ONE Memory Book video from the browser.
//
// New book videos go to the Cloudflare video area through a short-lived
// address created by the server. Nothing secret ever reaches the browser. If
// that area is not available, the previous storage is used exactly as before,
// so the customer's workflow never changes.

import { supabase } from "@/integrations/supabase/client";

import { MEMORY_BOOK_MATERIALS_BUCKET, MEMORY_BOOK_R2_BUCKET } from "./materials";

interface UploadRequest {
  bookId: string;
  role: "source" | "prepared";
  data: Blob;
  fileName: string;
  contentType: string;
  /** Used only by the previous storage, where the page builds the name. */
  fallbackPath: string;
}

interface UploadTicket {
  ok: boolean;
  storage?: string;
  key?: string;
  uploadUrl?: string;
  contentType?: string;
}

export interface StoredVideo {
  storage: string;
  path: string;
}

/**
 * Returns where the video was stored, or null when storing failed. Nothing is
 * ever reported as stored before the file has really been written.
 */
export async function uploadMemoryBookVideo(
  createUpload: (args: {
    data: {
      bookId: string;
      role?: string;
      fileName?: string;
      extension?: string;
      contentType?: string;
    };
  }) => Promise<UploadTicket>,
  request: UploadRequest,
): Promise<StoredVideo | null> {
  let ticket: UploadTicket = { ok: false };
  try {
    ticket = await createUpload({
      data: {
        bookId: request.bookId,
        role: request.role,
        fileName: request.fileName,
        contentType: request.contentType,
      },
    });
  } catch {
    ticket = { ok: false };
  }

  if (ticket.ok && ticket.uploadUrl && ticket.key) {
    const res = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "content-type": ticket.contentType ?? request.contentType },
      body: request.data,
    });
    if (!res.ok) return null;
    return { storage: ticket.storage ?? MEMORY_BOOK_R2_BUCKET, path: ticket.key };
  }

  const { error } = await supabase.storage
    .from(MEMORY_BOOK_MATERIALS_BUCKET)
    .upload(request.fallbackPath, request.data, {
      upsert: false,
      contentType: request.contentType || undefined,
    });
  if (error) return null;
  return { storage: MEMORY_BOOK_MATERIALS_BUCKET, path: request.fallbackPath };
}

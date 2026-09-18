// Hands the page ONE short-lived address to store ONE Memory Book photo at.
//
// The storage keys never leave the server. The address is only created after
// the book has been confirmed to belong to the signed-in customer, and the
// object name is built here, never taken from the customer.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { MEMORY_BOOK_R2_BUCKET } from "./materials";

type Row = Record<string, unknown>;

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
    .select("id, credits_spent")
    .eq("user_id", context.userId)
    .eq("id", bookId)
    .maybeSingle();
  if (!data || Number(data.credits_spent ?? 0) <= 0) return null;
  return data;
}

/** Only a plain, short extension is ever used, never the customer's own name. */
function extensionOf(fileName: string, fallback: string): string {
  const dot = fileName.lastIndexOf(".");
  const raw = dot >= 0 ? fileName.slice(dot + 1) : "";
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  return clean || fallback;
}

export const createMemoryBookPhotoUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { bookId: string; fileName?: string; contentType?: string }) => ({
      bookId: String(input?.bookId ?? "").slice(0, 64),
      fileName: String(input?.fileName ?? "").slice(0, 200),
      contentType: String(input?.contentType ?? "").slice(0, 120) || "image/jpeg",
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      storage?: string;
      key?: string;
      uploadUrl?: string;
      contentType?: string;
    }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false };

      const { storageFor } = await import("@/lib/storage/registry.server");
      const primary = storageFor("primary");
      // Without the working area configured the page simply keeps using the
      // storage it used before, so nothing breaks.
      if (!primary) return { ok: false };

      const { userKey } = await import("@/lib/storage/keys");
      const extension = extensionOf(data.fileName, "jpg");
      const unique = `${Date.now()}-${crypto.randomUUID()}`;
      // The address never contains a lifecycle status: a photo is not moved
      // because the book becomes completed.
      const key = userKey(
        context.userId,
        "memory-book",
        data.bookId,
        "photos",
        `${unique}.${extension}`,
      );

      const uploadUrl = await primary.signedWriteUrl(key, 60 * 60 * 2, data.contentType);
      if (!uploadUrl) return { ok: false };

      return {
        ok: true,
        storage: MEMORY_BOOK_R2_BUCKET,
        key,
        uploadUrl,
        contentType: data.contentType,
      };
    },
  );

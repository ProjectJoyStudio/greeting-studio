// Hands the page ONE short-lived address to store ONE Memory Book video at.
//
// The Cloudflare keys never leave the server. The address is only created
// after the book has been confirmed to belong to the signed-in customer, and
// the object name is built here, never taken from the customer.

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

/** The place inside the video area that belongs to exactly this book. */
export function memoryBookVideoKey(
  userId: string,
  bookId: string,
  role: "source" | "prepared",
  extension: string,
): string {
  const unique = `${Date.now()}-${crypto.randomUUID()}`;
  return `memory-book/${userId}/${bookId}/${role}-${unique}.${extension}`;
}

export const createMemoryBookVideoUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { bookId: string; role?: string; fileName?: string; extension?: string }) => ({
      bookId: String(input?.bookId ?? "").slice(0, 64),
      role: input?.role === "prepared" ? ("prepared" as const) : ("source" as const),
      fileName: String(input?.fileName ?? "").slice(0, 200),
      extension: String(input?.extension ?? "").slice(0, 10),
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; storage?: string; key?: string; uploadUrl?: string }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false };

      const { r2Ready, r2SignedPutUrl } = await import("./r2.server");
      // Without the Cloudflare area configured the page simply keeps using
      // the storage it used before, so nothing breaks.
      if (!r2Ready()) return { ok: false };

      const extension = data.extension
        ? extensionOf(`x.${data.extension}`, "mp4")
        : extensionOf(data.fileName, "mp4");
      const key = memoryBookVideoKey(context.userId, data.bookId, data.role, extension);
      const uploadUrl = await r2SignedPutUrl(key, 60 * 60 * 6);
      if (!uploadUrl) return { ok: false };

      return { ok: true, storage: MEMORY_BOOK_R2_BUCKET, key, uploadUrl };
    },
  );

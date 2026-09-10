import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Order of the LEAVES of one purchased Memory Book. A leaf always carries its
 * two internal pages: only the order is stored here, never any page content.
 */

type Row = Record<string, unknown>;

/** Reads the leaves of THIS book of the signed-in customer. */
async function ownedBook(context: { supabase: unknown; userId: string }, bookId: string) {
  const db = context.supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: Row | null }> };
        };
      };
    };
  };
  const { data } = await db
    .from("memory_book_projects")
    .select("id, leaves, internal_pages, credits_spent, leaf_order")
    .eq("user_id", context.userId)
    .eq("id", bookId)
    .maybeSingle();
  if (!data || Number(data.credits_spent ?? 0) <= 0) return null;
  const internalPages = Number(data.internal_pages ?? 0);
  const leaves = Number(data.leaves ?? 0) || Math.ceil(internalPages / 2);
  return { leaves, internalPages, stored: data.leaf_order };
}

/** A clean 1…n order, repairing anything unusable that may be stored. */
function normalizeOrder(value: unknown, leaves: number): number[] {
  const base = Array.from({ length: leaves }, (_, i) => i + 1);
  if (!Array.isArray(value)) return base;
  const seen = new Set<number>();
  const order: number[] = [];
  for (const raw of value) {
    const n = Math.round(Number(raw));
    if (n >= 1 && n <= leaves && !seen.has(n)) {
      seen.add(n);
      order.push(n);
    }
  }
  for (const n of base) if (!seen.has(n)) order.push(n);
  return order;
}

export const loadMemoryBookLeafOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
  }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; order: number[]; leaves: number }> => {
      const book = await ownedBook(context, data.bookId);
      if (!book) return { ok: false, order: [], leaves: 0 };
      return {
        ok: true,
        leaves: book.leaves,
        order: normalizeOrder(book.stored, book.leaves),
      };
    },
  );

export const saveMemoryBookLeafOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; order: number[] }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    order: Array.isArray(input?.order) ? input.order.slice(0, 200).map((n) => Number(n)) : [],
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; order: number[] }> => {
    const book = await ownedBook(context, data.bookId);
    if (!book) return { ok: false, order: [] };
    const order = normalizeOrder(data.order, book.leaves);
    const db = context.supabase as unknown as {
      from: (table: string) => {
        update: (values: Record<string, unknown>) => {
          eq: (a: string, b: string) => {
            eq: (a: string, b: string) => Promise<{ error: unknown }>;
          };
        };
      };
    };
    const { error } = await db
      .from("memory_book_projects")
      .update({ leaf_order: order })
      .eq("id", data.bookId)
      .eq("user_id", context.userId);
    return { ok: !error, order };
  });

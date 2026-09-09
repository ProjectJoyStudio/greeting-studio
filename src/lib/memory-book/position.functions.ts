import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The parts of the creation area a customer can be working in. */
export type MemoryBookLastView = "design" | "materials" | "pages";

function viewOf(value: unknown): MemoryBookLastView {
  return value === "materials" || value === "pages" ? value : "design";
}

/**
 * Remembers where the customer stopped working in ONE Memory Book. This only
 * stores a navigation position: no page content is read or changed.
 */
export const saveMemoryBookPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; view: string; page?: number | null }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    view: viewOf(input?.view),
    page:
      Number(input?.page) > 0 && Number(input?.page) < 1000 ? Math.round(Number(input?.page)) : null,
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!data.bookId) return { ok: false };
    const patch: Record<string, unknown> = { last_view: data.view };
    if (data.view === "pages" && data.page) patch.last_page = data.page;
    const { error } = await context.supabase
      .from("memory_book_projects")
      .update(patch)
      .eq("id", data.bookId)
      .eq("user_id", context.userId);
    return { ok: !error };
  });

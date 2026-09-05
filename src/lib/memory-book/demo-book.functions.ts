import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Key of the single app_settings row holding the demonstration book. */
export const MEMORY_BOOK_DEMO_KEY = "memory_book.demo";

export interface MemoryBookDemo {
  /** Link to the finished Memory Book shown in the presentation area. */
  url: string | null;
}

function normalise(value: unknown): MemoryBookDemo {
  if (value && typeof value === "object" && "url" in value) {
    const url = (value as { url: unknown }).url;
    if (typeof url === "string" && url.trim().length > 0) return { url: url.trim() };
  }
  return { url: null };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Public read used by the Memory Book presentation page. */
export const getMemoryBookDemo = createServerFn({ method: "GET" }).handler(
  async (): Promise<MemoryBookDemo> => {
    try {
      const db = await admin();
      const { data } = await db
        .from("app_settings")
        .select("value")
        .eq("key", MEMORY_BOOK_DEMO_KEY)
        .maybeSingle();
      return normalise(data?.value ?? null);
    } catch {
      return { url: null };
    }
  },
);

/** Administrators select or replace the demonstration book. */
export const setMemoryBookDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { url: string | null }) => ({
    url: typeof data?.url === "string" && data.url.trim() ? data.url.trim() : null,
  }))
  .handler(async ({ data, context }): Promise<MemoryBookDemo> => {
    const { data: isAdmin } = await (
      context.supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
      }
    ).rpc("is_admin", { _user_id: context.userId });
    if (isAdmin !== true) throw new Error("forbidden");

    const db = await admin();
    const { error } = await db
      .from("app_settings")
      .upsert(
        { key: MEMORY_BOOK_DEMO_KEY, value: { url: data.url }, updated_by: context.userId },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { url: data.url };
  });

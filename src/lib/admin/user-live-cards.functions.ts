// Administration view of every finished Live Greeting Card on the platform.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminLiveGreetingRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  status: string;
  title: string | null;
  image_prompt: string | null;
  motion_prompt: string;
  motion_prompt_en: string | null;
  duration_seconds: number;
  aspect_ratio: string | null;
  generator_key: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  deleted_at: string | null;
};

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data } = await (context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  }).rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

/** Every generated live greeting card with owner, prompts, media and dates. */
export const listUserLiveGreetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminLiveGreetingRow[]> => {
    await assertAdmin(context as never);
    const { getAdmin } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data, error } = await supabaseAdmin
      .from("live_card_animations")
      .select(
        "id, user_id, status, title, source_card_id, source_bucket, source_path, prompt, prompt_en, duration_seconds, aspect_ratio, generator_key, storage_bucket, storage_path, created_at, deleted_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const cardIds = [...new Set(rows.map((r) => r.source_card_id).filter(Boolean))] as string[];
    const prompts = new Map<string, string>();
    if (cardIds.length) {
      const { data: cards } = await supabaseAdmin
        .from("live_greeting_cards")
        .select("id, prompt")
        .in("id", cardIds);
      for (const card of cards ?? []) prompts.set(card.id, card.prompt ?? "");
    }

    const sign = async (bucket: string | null, path: string | null) => {
      if (!bucket || !path) return null;
      const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
      return signed.data?.signedUrl ?? null;
    };

    const emails = new Map<string, string | null>();
    const out: AdminLiveGreetingRow[] = [];
    for (const row of rows) {
      if (!emails.has(row.user_id)) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
        emails.set(row.user_id, u?.user?.email ?? null);
      }
      out.push({
        id: row.id,
        user_id: row.user_id,
        user_email: emails.get(row.user_id) ?? null,
        status: row.status,
        title: row.title ?? null,
        image_prompt: row.source_card_id ? prompts.get(row.source_card_id) ?? null : null,
        motion_prompt: row.prompt ?? "",
        motion_prompt_en: row.prompt_en ?? null,
        duration_seconds: row.duration_seconds ?? 5,
        aspect_ratio: row.aspect_ratio ?? null,
        generator_key: row.generator_key ?? null,
        image_url: await sign(row.source_bucket, row.source_path),
        video_url: await sign(row.storage_bucket, row.storage_path),
        created_at: row.created_at,
        deleted_at: row.deleted_at ?? null,
      });
    }
    return out;
  });

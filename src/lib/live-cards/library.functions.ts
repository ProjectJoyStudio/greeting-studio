// The finished Live Greeting Cards of one person: everything that has been
// generated successfully is kept here, in storage and in the account.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeTextDesign } from "@/lib/greeting-card/types";
import type { LiveGreetingRecord } from "./types";

const COLUMNS =
  "id, status, title, source_card_id, source_bucket, source_path, prompt, prompt_en, duration_seconds, aspect_ratio, storage_bucket, storage_path, greeting_text, greeting_mode, greeting_keywords, text_design, sound_enabled, is_shared, share_slug, scheduled_send_at, price_credits, created_at, completed_at";

type Row = {
  id: string;
  status: string;
  title: string | null;
  source_card_id: string | null;
  source_bucket: string | null;
  source_path: string | null;
  prompt: string | null;
  prompt_en: string | null;
  duration_seconds: number | null;
  aspect_ratio: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  greeting_text?: string | null;
  greeting_mode?: string | null;
  greeting_keywords?: string[] | null;
  text_design?: unknown;
  sound_enabled: boolean | null;
  is_shared: boolean | null;
  share_slug: string | null;
  scheduled_send_at: string | null;
  price_credits: number | null;
  created_at: string;
  completed_at: string | null;
};

type SignedClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, expires: number) => Promise<{ data: { signedUrl: string } | null }>;
    };
  };
};

export async function buildLiveGreeting(
  client: SignedClient,
  row: Row,
  imagePrompt: string | null,
): Promise<LiveGreetingRecord> {
  const sign = async (bucket: string | null, path: string | null) => {
    if (!bucket || !path) return null;
    const signed = await client.storage.from(bucket).createSignedUrl(path, 60 * 60 * 12);
    return signed.data?.signedUrl ?? null;
  };
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    imagePrompt,
    motionPrompt: row.prompt ?? "",
    motionPromptEnglish: row.prompt_en,
    durationSeconds: row.duration_seconds ?? 5,
    aspectRatio: row.aspect_ratio,
    imageUrl: await sign(row.source_bucket, row.source_path),
    videoUrl: await sign(row.storage_bucket, row.storage_path),
    greetingText: row.greeting_text ?? "",
    greetingMode: row.greeting_mode === "keywords" ? "keywords" : "manual",
    greetingKeywords: row.greeting_keywords ?? [],
    textDesign: normalizeTextDesign(row.text_design),
    // Prepared for later phases — not offered in the interface yet.
    soundEnabled: row.sound_enabled ?? false,
    isShared: row.is_shared ?? false,
    shareSlug: row.share_slug,
    scheduledSendAt: row.scheduled_send_at,
    priceCredits: row.price_credits,
    createdAt: row.completed_at ?? row.created_at,
  };
}

/** Every finished live greeting card of the signed-in person, newest first. */
export const listMyLiveGreetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LiveGreetingRecord[]> => {
    const { data: rows, error } = await context.supabase
      .from("live_card_animations")
      .select(COLUMNS)
      .eq("user_id", context.userId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !rows) return [];

    const cardIds = [...new Set((rows as Row[]).map((r) => r.source_card_id).filter(Boolean))] as string[];
    const prompts = new Map<string, string>();
    if (cardIds.length) {
      const { data: cards } = await context.supabase
        .from("live_greeting_cards")
        .select("id, prompt")
        .in("id", cardIds);
      for (const card of cards ?? []) prompts.set(card.id, card.prompt ?? "");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return Promise.all(
      (rows as Row[]).map((row) =>
        buildLiveGreeting(
          supabaseAdmin as unknown as SignedClient,
          row,
          row.source_card_id ? prompts.get(row.source_card_id) ?? null : null,
        ),
      ),
    );
  });

/**
 * Deleting happens only in the personal account. The record is kept for the
 * configured retention period so administrators can still help.
 */
export const deleteMyLiveGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string }) => {
    const animationId = String(input?.animationId ?? "");
    if (!animationId) throw new Error("animation_required");
    return { animationId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { readRetentionDays } = await import("@/lib/admin/deleted-cards.server");
    const days = await readRetentionDays();
    const now = new Date();
    const { error } = await context.supabase
      .from("live_card_animations")
      .update({
        deleted_at: now.toISOString(),
        purge_after: new Date(now.getTime() + days * 86_400_000).toISOString(),
      })
      .eq("id", data.animationId)
      .eq("user_id", context.userId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * The greeting text is added after the animation, exactly like the greeting
 * card module: same editor, same styling values, saved with the finished card.
 */
export const saveLiveGreetingText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    animationId: string;
    title?: string;
    greetingText?: string;
    greetingMode?: string;
    keywords?: string[];
    textDesign?: unknown;
  }) => {
    const animationId = String(input?.animationId ?? "");
    if (!animationId) throw new Error("animation_required");
    return {
      animationId,
      title: String(input?.title ?? "").slice(0, 160),
      greetingText: String(input?.greetingText ?? "").slice(0, 2000),
      greetingMode: input?.greetingMode === "keywords" ? "keywords" : "manual",
      keywords: (Array.isArray(input?.keywords) ? input!.keywords : [])
        .map((k) => String(k).trim())
        .filter(Boolean)
        .slice(0, 20),
      textDesign: (input?.textDesign ?? {}) as Record<string, unknown>,
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { error } = await context.supabase
      .from("live_card_animations")
      .update({
        title: data.title || null,
        greeting_text: data.greetingText,
        greeting_mode: data.greetingMode,
        greeting_keywords: data.keywords,
        text_design: data.textDesign as never,
        text_saved_at: new Date().toISOString(),
      })
      .eq("id", data.animationId)
      .eq("user_id", context.userId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

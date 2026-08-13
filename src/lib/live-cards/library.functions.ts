// The finished Live Greeting Cards of one person: everything that has been
// generated successfully is kept here, in storage and in the account.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeTextDesign } from "@/lib/greeting-card/types";
import type { LiveGreetingRecord } from "./types";

const COLUMNS =
  "id, status, title, source_card_id, source_bucket, source_path, prompt, prompt_en, duration_seconds, aspect_ratio, storage_bucket, storage_path, final_bucket, final_path, final_mime, final_has_text, finalized_at, error_code, greeting_text, greeting_mode, greeting_keywords, text_design, sound_enabled, is_shared, share_slug, scheduled_send_at, price_credits, created_at, completed_at";

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
  final_bucket?: string | null;
  final_path?: string | null;
  final_mime?: string | null;
  final_has_text?: boolean | null;
  finalized_at?: string | null;
  error_code?: string | null;
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
  const finalized = Boolean(row.finalized_at && row.final_bucket && row.final_path);
  const rawVideoUrl = await sign(row.storage_bucket, row.storage_path);
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
    // A finished card always plays its own final file; the draft plays the
    // plain animation while it is still being edited.
    videoUrl: finalized
      ? await sign(row.final_bucket ?? null, row.final_path ?? null)
      : rawVideoUrl,
    sourceVideoUrl: rawVideoUrl,
    greetingText: row.greeting_text ?? "",
    greetingMode: row.greeting_mode === "keywords" ? "keywords" : "manual",
    greetingKeywords: row.greeting_keywords ?? [],
    textDesign: normalizeTextDesign(row.text_design),
    isFinalized: finalized,
    hasBurnedText: finalized && row.final_has_text === true,
    // Prepared for later phases — not offered in the interface yet.
    soundEnabled: row.sound_enabled ?? false,
    isShared: row.is_shared ?? false,
    shareSlug: row.share_slug,
    scheduledSendAt: row.scheduled_send_at,
    errorCode: row.error_code ?? null,
    priceCredits: row.price_credits,
    createdAt: row.completed_at ?? row.created_at,
  };
}

async function hydrate(
  context: { supabase: { from: (t: string) => any } },
  rows: Row[],
): Promise<LiveGreetingRecord[]> {
  const cardIds = [...new Set(rows.map((r) => r.source_card_id).filter(Boolean))] as string[];
    const prompts = new Map<string, string>();
    if (cardIds.length) {
      const { data: cards } = await context.supabase
        .from("live_greeting_cards")
        .select("id, prompt")
        .in("id", cardIds);
      for (const card of (cards ?? []) as { id: string; prompt: string | null }[]) {
        prompts.set(card.id, card.prompt ?? "");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return Promise.all(
      rows.map((row) =>
        buildLiveGreeting(
          supabaseAdmin as unknown as SignedClient,
          row,
          row.source_card_id ? prompts.get(row.source_card_id) ?? null : null,
        ),
      ),
    );
}

/** Completed live greeting cards of the signed-in person, newest first. */
export const listMyLiveGreetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LiveGreetingRecord[]> => {
    const { data: rows, error } = await context.supabase
      .from("live_card_animations")
      .select(COLUMNS)
      .eq("user_id", context.userId)
      .eq("status", "ready")
      .not("finalized_at", "is", null)
      .is("deleted_at", null)
      .is("delivered_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !rows) return [];
    return hydrate(context as never, rows as Row[]);
  });

/**
 * Drafts: animations that still wait for their greeting. They exist only to
 * continue editing — they can never be downloaded or shared.
 */
export const listMyLiveDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LiveGreetingRecord[]> => {
    const { data: rows, error } = await context.supabase
      .from("live_card_animations")
      .select(COLUMNS)
      .eq("user_id", context.userId)
      .in("status", ["preparing", "queued", "processing", "storing", "ready", "failed"])
      .is("finalized_at", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !rows) return [];
    return hydrate(context as never, rows as Row[]);
  });

/** One draft, used by the text editor to restore the exact editing state. */
export const getLiveGreetingDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string }) => {
    const animationId = String(input?.animationId ?? "");
    if (!animationId) throw new Error("animation_required");
    return { animationId };
  })
  .handler(async ({ data, context }): Promise<LiveGreetingRecord | null> => {
    const { data: row } = await context.supabase
      .from("live_card_animations")
      .select(COLUMNS)
      .eq("id", data.animationId)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .is("delivered_at", null)
      .maybeSingle();
    if (!row) return null;
    const [record] = await hydrate(context as never, [row as Row]);
    return record ?? null;
  });

/**
 * A finished live greeting card is completed the moment it was successfully
 * downloaded or shared. It then leaves the personal account for good: no
 * further download, sharing or reopening. Previewing changes nothing.
 */
export const markLiveGreetingDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string; method?: string }) => {
    const animationId = String(input?.animationId ?? "");
    if (!animationId) throw new Error("animation_required");
    return { animationId, method: String(input?.method ?? "download").slice(0, 20) };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { error } = await context.supabase
      .from("live_card_animations")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", data.animationId)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .is("delivered_at", null);
    if (error) throw new Error(error.message);
    const { logLiveCardEvent } = await import("./lifecycle.server");
    await logLiveCardEvent({
      actorUserId: context.userId,
      ownerUserId: context.userId,
      animationId: data.animationId,
      stage: "notification_sent",
      detail: { delivered_via: data.method },
    });
    return { ok: true };
  });

/**
 * Marks the live greeting card as completed: the rendered file — with the
 * greeting already part of its frames — becomes the version people download
 * and share. The draft stays untouched next to it.
 */
export const finalizeLiveGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    animationId: string;
    storagePath: string;
    mime?: string;
    hasText?: boolean;
    title?: string;
    greetingText?: string;
    textDesign?: unknown;
  }) => {
    const animationId = String(input?.animationId ?? "");
    const storagePath = String(input?.storagePath ?? "");
    if (!animationId) throw new Error("animation_required");
    if (!storagePath) throw new Error("file_required");
    return {
      animationId,
      storagePath,
      mime: String(input?.mime ?? "video/mp4").slice(0, 80),
      hasText: input?.hasText === true,
      title: String(input?.title ?? "").slice(0, 160),
      greetingText: String(input?.greetingText ?? "").slice(0, 2000),
      textDesign: (input?.textDesign ?? {}) as Record<string, unknown>,
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; videoUrl: string | null }> => {
    // Only the person's own folder may ever be linked to their card.
    if (!data.storagePath.startsWith(`${context.userId}/`)) throw new Error("forbidden");
    const { logLiveCardEvent } = await import("./lifecycle.server");
    await logLiveCardEvent({
      actorUserId: context.userId,
      ownerUserId: context.userId,
      animationId: data.animationId,
      stage: "upload_completed",
      detail: { path: data.storagePath, mime: data.mime, has_text: data.hasText },
    });
    const { error } = await context.supabase
      .from("live_card_animations")
      .update({
        title: data.title || null,
        final_bucket: "live-greeting-card-videos",
        final_path: data.storagePath,
        final_mime: data.mime,
        final_has_text: data.hasText,
        // Persist the exact state used for this render in the same write that
        // links the final file. In particular, an intentionally empty greeting
        // clears any older autosaved draft text instead of restoring it later.
        greeting_text: data.greetingText,
        text_design: data.textDesign as never,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", data.animationId)
      .eq("user_id", context.userId)
      .is("deleted_at", null);
    if (error) {
      await logLiveCardEvent({
        actorUserId: context.userId,
        animationId: data.animationId,
        stage: "failed",
        ok: false,
        detail: { step: "database_save", error: error.message },
      });
      throw new Error(`database_save_failed: ${error.message}`);
    }
    await logLiveCardEvent({
      actorUserId: context.userId,
      ownerUserId: context.userId,
      animationId: data.animationId,
      stage: "database_saved",
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage
      .from("live-greeting-card-videos")
      .createSignedUrl(data.storagePath, 60 * 60 * 12);
    return { ok: true, videoUrl: signed.data?.signedUrl ?? null };
  });

/**
 * The editor reports every step of the final rendering, so a card that fails
 * at the last moment can always be traced and delivered by hand.
 */
export const recordLiveCardStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string; stage: string; ok?: boolean; detail?: string }) => ({
    animationId: String(input?.animationId ?? ""),
    stage: String(input?.stage ?? "").slice(0, 40),
    ok: input?.ok !== false,
    detail: String(input?.detail ?? "").slice(0, 500),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { logLiveCardEvent } = await import("./lifecycle.server");
    await logLiveCardEvent({
      actorUserId: context.userId,
      ownerUserId: context.userId,
      animationId: data.animationId || null,
      stage: data.stage as never,
      ok: data.ok,
      detail: data.detail ? { detail: data.detail } : undefined,
    });
    return { ok: true };
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

/**
 * Background generations of the signed-in person are finished here, so a card
 * whose creator left the page is completed and lands in the personal account
 * as an unfinished live greeting card.
 */
export const syncMyLiveCardAnimations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ finished: number }> => {
    const { reconcileUserAnimations } = await import("./reconcile.server");
    return { finished: await reconcileUserAnimations(context.userId) };
  });

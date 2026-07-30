import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LiveCardAsset, LiveCardResult } from "./types";

const COLUMNS =
  "id, status, prompt, prompt_en, source, session_id, aspect_ratio, generator_key, generator_model, storage_bucket, storage_path, duration_seconds, price_credits, video_storage_bucket, video_storage_path, video_status, created_at";

type Row = {
  id: string;
  status: string;
  prompt: string | null;
  prompt_en: string | null;
  session_id: string | null;
  aspect_ratio: string | null;
  generator_key: string | null;
  generator_model: string | null;
  source: string | null;
  storage_bucket: string;
  storage_path: string;
  duration_seconds: number | null;
  price_credits: number | null;
  video_storage_bucket: string | null;
  video_storage_path: string | null;
  video_status: string | null;
  created_at: string;
};

async function toAsset(row: Row): Promise<LiveCardAsset> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const signed = await supabaseAdmin.storage
    .from(row.storage_bucket)
    .createSignedUrl(row.storage_path, 60 * 60 * 12);
  const video =
    row.video_storage_bucket && row.video_storage_path
      ? await supabaseAdmin.storage
          .from(row.video_storage_bucket)
          .createSignedUrl(row.video_storage_path, 60 * 60 * 12)
      : null;
  return {
    id: row.id,
    status: row.status,
    prompt: row.prompt ?? "",
    promptEnglish: row.prompt_en ?? null,
    sessionId: row.session_id ?? null,
    aspectRatio: row.aspect_ratio ?? null,
    generatorKey: row.generator_key ?? null,
    selected: row.status === "selected" || row.status === "image_selected",
    source: row.source === "upload" ? "upload" : "generated",
    createdAt: row.created_at,
    imageUrl: signed.data?.signedUrl ?? null,
    durationSeconds: row.duration_seconds,
    priceCredits: row.price_credits,
    videoUrl: video?.data?.signedUrl ?? null,
    videoStatus: row.video_status,
  };
}

/** Creates the artwork through the internal routing layer and stores it. */
export const generateLiveCardImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; aspectRatio?: string; promptLang?: string; sessionId?: string }) => {
    const prompt = String(input?.prompt ?? "").trim();
    if (prompt.length < 3) throw new Error("prompt_too_short");
    const ratio = String(input?.aspectRatio ?? "1:1");
    return {
      prompt: prompt.slice(0, 1000),
      aspectRatio: ["1:1", "4:5", "9:16", "16:9"].includes(ratio) ? ratio : "1:1",
      promptLang: String(input?.promptLang ?? "").slice(0, 8),
      sessionId: String(input?.sessionId ?? "").slice(0, 64) || null,
    };
  })
  .handler(async ({ data, context }): Promise<LiveCardResult> => {
    const { routeImageRequest } = await import("./generators/router.server");
    const { GeneratorError } = await import("./generators/contracts.server");
    const { translatePromptToEnglish } = await import("@/lib/ai/prompt-translate.server");
    const { liveCardsImageBucket } = await import("./env.server");

    // Universal translation layer — the engine only ever receives English.
    const translated = await translatePromptToEnglish(data.prompt, "image");

    let routed;
    try {
      routed = await routeImageRequest({
        prompt: translated.english,
        aspectRatio: data.aspectRatio,
      });
    } catch (err) {
      const known = err instanceof GeneratorError;
      return {
        ok: false,
        errorCode: known ? err.code : "unknown",
        errorMessage: err instanceof Error ? err.message : "The picture could not be created.",
      };
    }

    const res = await fetch(routed.url);
    if (!res.ok) {
      return { ok: false, errorCode: "download_failed", errorMessage: `Could not fetch the picture (${res.status}).` };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const bucket = liveCardsImageBucket();
    const storagePath = `${context.userId}/${crypto.randomUUID()}.${routed.fileExtension}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upload = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, bytes, { contentType: routed.contentType, upsert: false });
    if (upload.error) return { ok: false, errorCode: "storage_failed", errorMessage: upload.error.message };

    const { data: row, error } = await context.supabase
      .from("live_greeting_cards")
      .insert({
        user_id: context.userId,
        status: "not_selected",
        session_id: data.sessionId,
        aspect_ratio: data.aspectRatio,
        prompt: data.prompt,
        prompt_en: translated.english,
        prompt_lang: data.promptLang || null,
        source: "generated",
        generator_key: routed.generatorKey,
        generator_model: routed.generatorModel,
        storage_bucket: bucket,
        storage_path: storagePath,
        metadata: { aspect_ratio: data.aspectRatio },
      })
      .select(COLUMNS)
      .single();
    if (error || !row) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]);
      return { ok: false, errorCode: "db_failed", errorMessage: error?.message ?? "Could not store the picture." };
    }

    return { ok: true, card: await toAsset(row as Row) };
  });

/** Stores a picture the person uploaded themselves in the same section storage. */
export const uploadLiveCardImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileBase64: string; contentType: string; prompt?: string; aspectRatio?: string; sessionId?: string }) => {
    const fileBase64 = String(input?.fileBase64 ?? "");
    if (!fileBase64) throw new Error("file_required");
    if (fileBase64.length > 14_000_000) throw new Error("file_too_large");
    const contentType = String(input?.contentType ?? "image/png");
    if (!/^image\/(png|jpe?g|webp)$/.test(contentType)) throw new Error("unsupported_type");
    return {
      fileBase64,
      contentType,
      prompt: String(input?.prompt ?? "").slice(0, 1000),
      aspectRatio: String(input?.aspectRatio ?? "1:1"),
      sessionId: String(input?.sessionId ?? "").slice(0, 64) || null,
    };
  })
  .handler(async ({ data, context }): Promise<LiveCardResult> => {
    const { liveCardsImageBucket } = await import("./env.server");
    const bucket = liveCardsImageBucket();
    const binary = atob(data.fileBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    const ext = data.contentType === "image/png" ? "png" : data.contentType === "image/webp" ? "webp" : "jpg";
    const storagePath = `${context.userId}/${crypto.randomUUID()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upload = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, bytes, { contentType: data.contentType, upsert: false });
    if (upload.error) return { ok: false, errorCode: "storage_failed", errorMessage: upload.error.message };

    const { data: row, error } = await context.supabase
      .from("live_greeting_cards")
      .insert({
        user_id: context.userId,
        status: "not_selected",
        session_id: data.sessionId,
        aspect_ratio: data.aspectRatio,
        prompt: data.prompt,
        source: "upload",
        storage_bucket: bucket,
        storage_path: storagePath,
        metadata: { aspect_ratio: data.aspectRatio },
      })
      .select(COLUMNS)
      .single();
    if (error || !row) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]);
      return { ok: false, errorCode: "db_failed", errorMessage: error?.message ?? "Could not store the picture." };
    }

    return { ok: true, card: await toAsset(row as Row) };
  });

/** The person's own live greeting cards, newest first. */
export const listOwnLiveCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { sessionId?: string }) => ({
    sessionId: String(input?.sessionId ?? "").slice(0, 64) || null,
  }))
  .handler(async ({ data: input, context }): Promise<LiveCardAsset[]> => {
    let query = context.supabase
      .from("live_greeting_cards")
      .select(COLUMNS)
      .is("deleted_at", null);
    if (input.sessionId) query = query.eq("session_id", input.sessionId);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(40);
    if (error || !data) return [];
    return Promise.all((data as Row[]).map(toAsset));
  });

/**
 * Marks a picture as the one the person wants to bring to life. It becomes the
 * current image of the live greeting card and is the input of the animation
 * phase, which is connected in the next step.
 */
export const selectLiveCardImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => {
    const cardId = String(input?.cardId ?? "");
    if (!cardId) throw new Error("card_required");
    return { cardId };
  })
  .handler(async ({ data, context }): Promise<LiveCardResult> => {
    const { data: row, error } = await context.supabase
      .from("live_greeting_cards")
      .update({ status: "selected" })
      .eq("id", data.cardId)
      .is("deleted_at", null)
      .select(COLUMNS)
      .single();

    // Only one picture of a creation session may stay selected.
    if (row) {
      const selectedRow = row as Row;
      const reset = context.supabase
        .from("live_greeting_cards")
        .update({ status: "not_selected" })
        .eq("user_id", context.userId)
        .neq("id", selectedRow.id)
        .in("status", ["selected", "image_selected"])
        .is("deleted_at", null);
      await (selectedRow.session_id
        ? reset.eq("session_id", selectedRow.session_id)
        : reset.is("session_id", null));
    }
    if (error || !row) {
      return { ok: false, errorCode: "db_failed", errorMessage: error?.message ?? "Could not select the picture." };
    }
    return { ok: true, card: await toAsset(row as Row) };
  });

/**
 * "Generate another": the current source image is not destroyed. Exactly like a
 * rejected greeting card, it is soft-deleted and kept for the configured
 * retention period, visible to administrators in the recycle bin.
 */
export const discardLiveCardImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => {
    const cardId = String(input?.cardId ?? "");
    if (!cardId) throw new Error("card_required");
    return { cardId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { readRetentionDays } = await import("@/lib/admin/deleted-cards.server");
    const days = await readRetentionDays();
    const now = new Date();
    const purgeAfter = new Date(now.getTime() + days * 86_400_000);

    const { error } = await context.supabase
      .from("live_greeting_cards")
      .update({
        status: "discarded",
        deleted_at: now.toISOString(),
        purge_after: purgeAfter.toISOString(),
      })
      .eq("id", data.cardId)
      .eq("user_id", context.userId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

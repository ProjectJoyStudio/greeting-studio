import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LiveCardAsset, LiveCardResult } from "./types";

const COLUMNS =
  "id, status, prompt, source, storage_bucket, storage_path, duration_seconds, price_credits, video_storage_bucket, video_storage_path, video_status, created_at";

type Row = {
  id: string;
  status: string;
  prompt: string | null;
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
  .inputValidator((input: { prompt: string; aspectRatio?: string; promptLang?: string }) => {
    const prompt = String(input?.prompt ?? "").trim();
    if (prompt.length < 3) throw new Error("prompt_too_short");
    const ratio = String(input?.aspectRatio ?? "1:1");
    return {
      prompt: prompt.slice(0, 1000),
      aspectRatio: ["1:1", "4:5", "9:16", "16:9"].includes(ratio) ? ratio : "1:1",
      promptLang: String(input?.promptLang ?? "").slice(0, 8),
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
        status: "image_ready",
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
  .inputValidator((input: { fileBase64: string; contentType: string; prompt?: string; aspectRatio?: string }) => {
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
        status: "image_ready",
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
  .handler(async ({ context }): Promise<LiveCardAsset[]> => {
    const { data, error } = await context.supabase
      .from("live_greeting_cards")
      .select(COLUMNS)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error || !data) return [];
    return Promise.all((data as Row[]).map(toAsset));
  });
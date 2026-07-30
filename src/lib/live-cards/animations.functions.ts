// Server side of the animation step of the Live Greeting Cards section.
// Generation is asynchronous: the engine accepts the work, the record is stored
// immediately, and the person may leave the page while it finishes.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AnimationResult, AnimationStatus, LiveCardAnimation } from "./types";

const COLUMNS =
  "id, status, source_card_id, source_bucket, source_path, prompt, prompt_en, duration_seconds, aspect_ratio, storage_bucket, storage_path, generator_key, prediction_id, error_code, error_message, created_at";

type Row = {
  id: string;
  status: string;
  source_card_id: string | null;
  source_bucket: string | null;
  source_path: string | null;
  prompt: string | null;
  prompt_en: string | null;
  duration_seconds: number | null;
  aspect_ratio: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  generator_key: string | null;
  prediction_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
};

const STATUSES: AnimationStatus[] = ["preparing", "queued", "processing", "storing", "ready", "failed"];

async function toAnimation(row: Row): Promise<LiveCardAnimation> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const image =
    row.source_bucket && row.source_path
      ? await supabaseAdmin.storage.from(row.source_bucket).createSignedUrl(row.source_path, 60 * 60 * 12)
      : null;
  const video =
    row.storage_bucket && row.storage_path
      ? await supabaseAdmin.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 60 * 60 * 12)
      : null;
  return {
    id: row.id,
    status: (STATUSES.includes(row.status as AnimationStatus) ? row.status : "processing") as AnimationStatus,
    sourceCardId: row.source_card_id,
    sourceImageUrl: image?.data?.signedUrl ?? null,
    prompt: row.prompt ?? "",
    promptEnglish: row.prompt_en,
    durationSeconds: row.duration_seconds ?? 5,
    aspectRatio: row.aspect_ratio,
    videoUrl: video?.data?.signedUrl ?? null,
    errorCode: row.error_code,
    createdAt: row.created_at,
  };
}

/** Durations offered by the active engine — nothing is hardcoded in the page. */
export const getAnimationOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ durations: number[]; available: boolean }> => {
    const { availableDurations, resolveVideoGenerators } = await import("./generators/router.server");
    return { durations: availableDurations(), available: resolveVideoGenerators().length > 0 };
  });

/** Hands the chosen picture and the motion description to the animation engine. */
export const startLiveCardAnimation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    cardId: string;
    prompt: string;
    promptLang?: string;
    durationSeconds?: number;
    sessionId?: string;
  }) => {
    const cardId = String(input?.cardId ?? "");
    if (!cardId) throw new Error("card_required");
    const prompt = String(input?.prompt ?? "").trim();
    if (prompt.length < 3) throw new Error("prompt_too_short");
    return {
      cardId,
      prompt: prompt.slice(0, 1000),
      promptLang: String(input?.promptLang ?? "").slice(0, 8),
      durationSeconds: Number(input?.durationSeconds ?? 0) || 0,
      sessionId: String(input?.sessionId ?? "").slice(0, 64) || null,
    };
  })
  .handler(async ({ data, context }): Promise<AnimationResult> => {
    const { availableDurations, startVideoRequest } = await import("./generators/router.server");
    const { GeneratorError } = await import("./generators/contracts.server");
    const { translatePromptToEnglish } = await import("@/lib/ai/prompt-translate.server");
    const { liveCardsVideoResolution } = await import("./env.server");

    const { data: card, error: cardError } = await context.supabase
      .from("live_greeting_cards")
      .select("id, storage_bucket, storage_path, aspect_ratio")
      .eq("id", data.cardId)
      .is("deleted_at", null)
      .single();
    if (cardError || !card) {
      return { ok: false, errorCode: "image_missing", errorMessage: "The source picture is not available." };
    }

    const durations = availableDurations();
    const duration = durations.includes(data.durationSeconds) ? data.durationSeconds : durations[0] ?? 5;

    // Universal translation layer — the engine only ever receives English.
    const translated = await translatePromptToEnglish(data.prompt, "animation");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage
      .from(card.storage_bucket)
      .createSignedUrl(card.storage_path, 60 * 60 * 2);
    const imageUrl = signed.data?.signedUrl;
    if (!imageUrl) {
      return { ok: false, errorCode: "image_missing", errorMessage: "The source picture could not be read." };
    }

    const base = {
      user_id: context.userId,
      session_id: data.sessionId,
      source_card_id: card.id,
      source_bucket: card.storage_bucket,
      source_path: card.storage_path,
      prompt: data.prompt,
      prompt_en: translated.english,
      prompt_lang: data.promptLang || null,
      duration_seconds: duration,
      aspect_ratio: card.aspect_ratio,
      resolution: liveCardsVideoResolution(),
    };

    try {
      const routed = await startVideoRequest({
        imageUrl,
        prompt: translated.english,
        durationSeconds: duration,
        aspectRatio: card.aspect_ratio ?? "1:1",
        resolution: liveCardsVideoResolution(),
      });
      const { data: row, error } = await context.supabase
        .from("live_card_animations")
        .insert({
          ...base,
          status: "queued",
          generator_key: routed.generatorKey,
          generator_model: routed.generatorModel,
          prediction_id: routed.jobId,
        })
        .select(COLUMNS)
        .single();
      if (error || !row) {
        return { ok: false, errorCode: "db_failed", errorMessage: error?.message ?? "Could not store the animation." };
      }
      return { ok: true, animation: await toAnimation(row as Row) };
    } catch (err) {
      const known = err instanceof GeneratorError;
      const errorCode = known ? err.code : "unknown";
      const errorMessage = err instanceof Error ? err.message : "The animation could not be started.";
      // The failure is recorded for administrators; nothing the person typed is lost.
      await context.supabase
        .from("live_card_animations")
        .insert({ ...base, status: "failed", error_code: errorCode, error_message: errorMessage });
      return { ok: false, errorCode, errorMessage };
    }
  });

/**
 * Reads the current state of one animation and, once the engine is done,
 * stores the finished video in the dedicated video storage.
 */
export const refreshLiveCardAnimation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string }) => {
    const animationId = String(input?.animationId ?? "");
    if (!animationId) throw new Error("animation_required");
    return { animationId };
  })
  .handler(async ({ data, context }): Promise<AnimationResult> => {
    const { data: row, error } = await context.supabase
      .from("live_card_animations")
      .select(COLUMNS)
      .eq("id", data.animationId)
      .single();
    if (error || !row) {
      return { ok: false, errorCode: "not_found", errorMessage: "The animation was not found." };
    }
    const current = row as Row;
    if (current.status === "ready" || current.status === "failed" || !current.prediction_id) {
      return { ok: true, animation: await toAnimation(current) };
    }

    const { pollVideoRequest } = await import("./generators/router.server");
    const progress = await pollVideoRequest(current.generator_key ?? "", current.prediction_id);

    type AnimationPatch = {
      status: string;
      storage_bucket?: string;
      storage_path?: string;
      error_code?: string;
      error_message?: string;
      completed_at?: string;
    };

    async function save(patch: AnimationPatch): Promise<AnimationResult> {
      const { data: updated } = await context.supabase
        .from("live_card_animations")
        .update(patch)
        .eq("id", current.id)
        .select(COLUMNS)
        .single();
      return { ok: true, animation: await toAnimation((updated ?? current) as Row) };
    }

    if (progress.state === "queued") return save({ status: "queued" });
    if (progress.state === "processing") return save({ status: "processing" });
    if (progress.state === "failed") {
      return save({
        status: "failed",
        error_code: progress.errorCode,
        error_message: progress.errorMessage,
        completed_at: new Date().toISOString(),
      });
    }

    // Succeeded — move the finished video into its own storage.
    const { liveCardsVideoBucket } = await import("./env.server");
    const bucket = liveCardsVideoBucket();
    const res = await fetch(progress.url);
    if (!res.ok) {
      return save({
        status: "failed",
        error_code: "download_failed",
        error_message: `Could not fetch the animation (${res.status}).`,
      });
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const storagePath = `${context.userId}/${current.id}.${progress.fileExtension}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upload = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, bytes, { contentType: progress.contentType, upsert: true });
    if (upload.error) {
      return save({ status: "failed", error_code: "storage_failed", error_message: upload.error.message });
    }
    return save({
      status: "ready",
      storage_bucket: bucket,
      storage_path: storagePath,
      completed_at: new Date().toISOString(),
    });
  });

/** Animations of the current creation session, newest first. */
export const listLiveCardAnimations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { sessionId?: string }) => ({
    sessionId: String(input?.sessionId ?? "").slice(0, 64) || null,
  }))
  .handler(async ({ data, context }): Promise<LiveCardAnimation[]> => {
    let query = context.supabase
      .from("live_card_animations")
      .select(COLUMNS)
      .is("deleted_at", null);
    if (data.sessionId) query = query.eq("session_id", data.sessionId);
    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(20);
    if (error || !rows) return [];
    return Promise.all((rows as Row[]).map(toAnimation));
  });

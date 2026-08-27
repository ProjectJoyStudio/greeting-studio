// Server side of the animation step of the Live Greeting Cards section.
// Generation is asynchronous: the engine accepts the work, the record is stored
// immediately, and the person may leave the page while it finishes.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AnimationResult, AnimationStatus, LiveCardAnimation } from "./types";

const COLUMNS =
  "id, status, source_card_id, source_bucket, source_path, prompt, prompt_en, duration_seconds, aspect_ratio, storage_bucket, storage_path, generator_key, prediction_id, error_code, error_message, created_at, session_id, credits_charged, metadata";

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
  session_id?: string | null;
  credits_charged?: number | null;
  metadata?: Record<string, unknown> | null;
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
    const { startVideoRequest } = await import("./generators/router.server");
    const { GeneratorError } = await import("./generators/contracts.server");
    const { translatePromptToEnglish } = await import("@/lib/ai/prompt-translate.server");
    const { liveCardsVideoResolution } = await import("./env.server");
    const { normaliseAnimationDuration } = await import("./duration-pricing");
    const { animationDurationCredits } = await import("./duration-pricing");
    const requestId = crypto.randomUUID();

    const { data: card, error: cardError } = await context.supabase
      .from("live_greeting_cards")
      .select("id, storage_bucket, storage_path, aspect_ratio")
      .eq("id", data.cardId)
      .is("deleted_at", null)
      .single();
    if (cardError || !card) {
      return { ok: false, errorCode: "image_missing", errorMessage: "The source picture is not available." };
    }

    // The person's choice is used as it is; only impossible values are clamped.
    const duration = normaliseAnimationDuration(data.durationSeconds);
    const price = animationDurationCredits(duration);

    // One live greeting card is animated once. A double click, a refresh or a
    // repeated request returns the animation that already exists instead of
    // starting — and paying for — a second one.
    const { data: existing } = await context.supabase
      .from("live_card_animations")
      .select(COLUMNS)
      .eq("user_id", context.userId)
      .eq("source_card_id", card.id)
      .in("status", ["preparing", "queued", "processing", "storing", "ready"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return { ok: true, animation: await toAnimation(existing as Row) };
    }

    // The price is taken before the paid provider request is created; the
    // wallet is locked in the database, so the balance can never go negative.
    const { supabaseAdmin: wallet } = await import("@/integrations/supabase/client.server");
    const { data: charge, error: chargeError } = await wallet.rpc("charge_live_card_animation", {
      _user_id: context.userId,
      _price: price,
      _duration: duration,
    });
    const charged = (charge ?? {}) as { ok?: boolean; error?: string; balance?: number };
    if (chargeError || !charged.ok) {
      return {
        ok: false,
        errorCode: charged.error ?? "charge_failed",
        errorMessage: "Not enough credits for this animation.",
      };
    }

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
      credits_charged: price,
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
      const { logLiveCardEvent } = await import("./lifecycle.server");
      await logLiveCardEvent({
        actorUserId: context.userId,
        ownerUserId: context.userId,
        animationId: row.id,
        stage: "generation_started",
        detail: {
          requestId,
          userId: context.userId,
          generator: routed.generatorKey,
          model: routed.generatorModel,
          requestedDurationSeconds: data.durationSeconds || null,
          selectedDurationSeconds: duration,
          sentDurationSeconds: duration,
          status: "queued",
        },
      });
      return { ok: true, animation: await toAnimation(row as Row) };
    } catch (err) {
      const known = err instanceof GeneratorError;
      const errorCode = known ? err.code : "unknown";
      const errorMessage = err instanceof Error ? err.message : "The animation could not be started.";
      // Nothing was produced — the credits go straight back.
      await wallet.rpc("refund_live_card_animation", {
        _user_id: context.userId,
        _price: price,
        _reason: errorCode,
      });
      // A refused engine request is a technical state of the same project, not
      // a new creation of the person: no card is written, so nothing extra can
      // ever appear in the personal cabinet. The attempt is kept in the
      // administrator's activity log instead, with everything needed to trace it.
      const { logLiveCardEvent } = await import("./lifecycle.server");
      await logLiveCardEvent({
        actorUserId: context.userId,
        ownerUserId: context.userId,
        animationId: null,
        stage: "failed",
        ok: false,
        detail: {
          requestId,
          step: "generation",
          sourceCardId: card.id,
          sessionId: data.sessionId,
          selectedDurationSeconds: duration,
          errorCode,
          errorMessage,
        },
      });

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
      sound_enabled?: boolean;
      completed_at?: string;
    };

    async function save(patch: AnimationPatch): Promise<AnimationResult> {
      // A generation that ends technically without a video must never keep the
      // customer's credits. The refund happens exactly once, and the record
      // remembers it, so a repeated poll can never pay twice.
      let extra: Record<string, unknown> = {};
      const alreadyRefunded = Boolean(
        (current.metadata as { refunded?: boolean } | null | undefined)?.refunded,
      );
      if (patch.status === "failed" && !alreadyRefunded && (current.credits_charged ?? 0) > 0) {
        const { supabaseAdmin: wallet } = await import("@/integrations/supabase/client.server");
        await wallet.rpc("refund_live_card_animation", {
          _user_id: context.userId,
          _price: current.credits_charged ?? 0,
          _reason: patch.error_code ?? "generation_failed",
        });
        extra = {
          metadata: { ...(current.metadata ?? {}), refunded: true },
          credits_charged: 0,
        };
      }
      const { data: updated } = await context.supabase
        .from("live_card_animations")
        .update({ ...patch, ...extra })
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
    // Project Joy never keeps the sound the engine invents by itself.
    const { stripAudioTrack } = await import("./mp4-audio.server");
    const silent = stripAudioTrack(bytes);
    const { readMp4DurationSeconds } = await import("./mp4-duration.server");
    const deliveredDuration = readMp4DurationSeconds(bytes);
    const storagePath = `${context.userId}/${current.id}.${progress.fileExtension}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upload = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, silent, { contentType: progress.contentType, upsert: true });
    if (upload.error) {
      const { logLiveCardEvent } = await import("./lifecycle.server");
      await logLiveCardEvent({
        actorUserId: context.userId,
        animationId: current.id,
        stage: "failed",
        ok: false,
        detail: { step: "storage_upload", error: upload.error.message },
      });
      return save({ status: "failed", error_code: "storage_failed", error_message: upload.error.message });
    }
    const { logLiveCardEvent } = await import("./lifecycle.server");
    await logLiveCardEvent({
      actorUserId: context.userId,
      ownerUserId: context.userId,
      animationId: current.id,
      stage: "generation_completed",
      detail: {
        bucket,
        path: storagePath,
        model: current.generator_key,
        selectedDurationSeconds: current.duration_seconds,
        returnedDurationSeconds: deliveredDuration,
        durationMismatch:
          deliveredDuration !== null &&
          current.duration_seconds !== null &&
          Math.abs(deliveredDuration - current.duration_seconds) > 0.75,
      },
    });
    return save({
      status: "ready",
      storage_bucket: bucket,
      storage_path: storagePath,
      sound_enabled: false,
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
      .is("deleted_at", null)
      // A delivered card has finished its life; it is never restored into the
      // creation page as an editable animation again.
      .is("delivered_at", null);
    if (data.sessionId) query = query.eq("session_id", data.sessionId);
    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(20);
    if (error || !rows) return [];
    return Promise.all((rows as Row[]).map(toAnimation));
  });

/**
 * Starts the same animation again after a failure. The existing record is
 * reused, so one generation never produces two cards in the account.
 */
export const retryLiveCardAnimation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string }) => {
    const animationId = String(input?.animationId ?? "");
    if (!animationId) throw new Error("animation_required");
    return { animationId };
  })
  .handler(async ({ data, context }): Promise<AnimationResult> => {
    const { data: row } = await context.supabase
      .from("live_card_animations")
      .select(COLUMNS)
      .eq("id", data.animationId)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    const current = row as Row | null;
    if (!current) return { ok: false, errorCode: "not_found", errorMessage: "The animation was not found." };
    if (current.status !== "failed") return { ok: true, animation: await toAnimation(current) };
    if (!current.source_bucket || !current.source_path) {
      return { ok: false, errorCode: "image_missing", errorMessage: "The source picture is not available." };
    }

    const { startVideoRequest } = await import("./generators/router.server");
    const { liveCardsVideoResolution } = await import("./env.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage
      .from(current.source_bucket)
      .createSignedUrl(current.source_path, 60 * 60 * 2);
    const imageUrl = signed.data?.signedUrl;
    if (!imageUrl) {
      return { ok: false, errorCode: "image_missing", errorMessage: "The source picture could not be read." };
    }

    try {
      const routed = await startVideoRequest({
        imageUrl,
        prompt: current.prompt_en ?? current.prompt ?? "",
        durationSeconds: current.duration_seconds ?? 5,
        aspectRatio: current.aspect_ratio ?? "1:1",
        resolution: liveCardsVideoResolution(),
      });
      const { data: updated } = await context.supabase
        .from("live_card_animations")
        .update({
          status: "queued",
          generator_key: routed.generatorKey,
          generator_model: routed.generatorModel,
          prediction_id: routed.jobId,
          error_code: null,
          error_message: null,
          completed_at: null,
        })
        .eq("id", current.id)
        .select(COLUMNS)
        .single();
      const { logLiveCardEvent } = await import("./lifecycle.server");
      await logLiveCardEvent({
        actorUserId: context.userId,
        ownerUserId: context.userId,
        animationId: current.id,
        stage: "generation_started",
        detail: { retry: true, generator: routed.generatorKey },
      });
      return { ok: true, animation: await toAnimation((updated ?? current) as Row) };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "The animation could not be started.";
      return { ok: false, errorCode: "retry_failed", errorMessage };
    }
  });

// Server-only life of the finished personal video greeting.
//
// The film is made in two stages, one after the other, entirely on its own:
//
//   1. the approved starting scene becomes a SILENT moving picture;
//   2. the greeting voice already prepared on page two is given to the mouth
//      of the person who really speaks.
//
// The customer never sees the silent film and never starts the second stage.
// When stage two fails, stage one is kept and only the lip movement is tried
// again — the customer is never charged twice for one technical failure.

import type { PvgVideoJob, PvgVideoStatus } from "./video-render";

export const VIDEO_COLUMNS =
  "id, project_id, user_id, job_id, status, stage, duration_seconds, scene_sounds, credits_charged, prediction_id, storage_bucket, storage_path, error_code, error_message, created_at, variant_index, action_description, is_selected, video_generator_key, video_generator_model, video_prediction_id, video_resolution, video_audio_enabled, video_predict_seconds, video_cost_usd, silent_bucket, silent_path, lipsync_generator_key, lipsync_generator_model, lipsync_prediction_id, lipsync_active_speaker, lipsync_predict_seconds, lipsync_cost_usd";

export interface VideoRow {
  id: string;
  project_id: string;
  user_id: string;
  job_id: string;
  status: string;
  stage?: string | null;
  duration_seconds: number;
  scene_sounds: boolean;
  credits_charged: number;
  prediction_id: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  variant_index?: number | null;
  action_description?: string | null;
  is_selected?: boolean | null;
  video_generator_key?: string | null;
  video_generator_model?: string | null;
  video_prediction_id?: string | null;
  video_resolution?: string | null;
  video_audio_enabled?: boolean | null;
  video_predict_seconds?: number | null;
  video_cost_usd?: number | null;
  silent_bucket?: string | null;
  silent_path?: string | null;
  lipsync_generator_key?: string | null;
  lipsync_generator_model?: string | null;
  lipsync_prediction_id?: string | null;
  lipsync_active_speaker?: boolean | null;
  lipsync_predict_seconds?: number | null;
  lipsync_cost_usd?: number | null;
}

export function pvgVideoBucket(): string {
  return process.env["PVG_VIDEO_BUCKET"] || "generated-videos";
}

function statusOf(value: string): PvgVideoStatus {
  return ["pending", "processing", "lipsync", "assets", "ready", "failed", "lipsync_failed"].includes(
    value,
  )
    ? (value as PvgVideoStatus)
    : "pending";
}

export async function toVideoJob(row: VideoRow): Promise<PvgVideoJob> {
  const status = statusOf(row.status);
  let videoUrl: string | null = null;
  if (status === "ready" && row.storage_bucket && row.storage_path) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { pvgSignedUrlTtl } = await import("./env.server");
    const signed = await supabaseAdmin.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, pvgSignedUrlTtl());
    videoUrl = signed.data?.signedUrl ?? null;
  }
  const videoCost = Number(row.video_cost_usd ?? 0);
  const lipsyncCost = Number(row.lipsync_cost_usd ?? 0);
  return {
    id: row.id,
    status,
    durationSeconds: row.duration_seconds,
    sceneSounds: Boolean(row.scene_sounds),
    creditsCharged: row.credits_charged,
    videoUrl,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    variantIndex: row.variant_index ?? 1,
    isSelected: Boolean(row.is_selected),
    actionDescription: row.action_description ?? "",
    tech: {
      stage: (row.stage as PvgVideoJob["tech"]["stage"]) ?? "silent_video",
      videoGenerator: row.video_generator_key ?? null,
      videoModel: row.video_generator_model ?? null,
      videoPredictionId: row.video_prediction_id ?? null,
      videoResolution: row.video_resolution ?? null,
      videoAudioEnabled: Boolean(row.video_audio_enabled),
      videoCostUsd: videoCost,
      lipsyncGenerator: row.lipsync_generator_key ?? null,
      lipsyncModel: row.lipsync_generator_model ?? null,
      lipsyncPredictionId: row.lipsync_prediction_id ?? null,
      lipsyncActiveSpeaker: row.lipsync_active_speaker ?? null,
      lipsyncCostUsd: lipsyncCost,
      totalCostUsd: Math.round((videoCost + lipsyncCost) * 10_000) / 10_000,
    },
  };
}

/**
 * Marks one finished film as the one the customer prefers. Choosing between
 * films that already exist never costs a credit.
 */
export async function markSelectedVariant(projectId: string, videoId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("pvg_videos")
    .update({ is_selected: false } as never)
    .eq("project_id", projectId);
  await supabaseAdmin
    .from("pvg_videos")
    .update({ is_selected: true } as never)
    .eq("id", videoId);
}

/** Gives back exactly what one failed film took, and never more. */
export async function refundVideo(row: VideoRow, reason: string): Promise<void> {
  if (row.credits_charged <= 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: wallet } = await supabaseAdmin
    .from("credit_wallets")
    .select("id, balance, lifetime_spent")
    .eq("user_id", row.user_id)
    .maybeSingle();
  const w = wallet as { id: string; balance: number; lifetime_spent: number } | null;
  if (!w) return;
  await supabaseAdmin
    .from("credit_wallets")
    .update({
      balance: w.balance + row.credits_charged,
      lifetime_spent: Math.max(0, w.lifetime_spent - row.credits_charged),
    })
    .eq("id", w.id);
  await supabaseAdmin.from("credit_transactions").insert({
    wallet_id: w.id,
    user_id: row.user_id,
    txn_type: "refund",
    amount: row.credits_charged,
    balance_after: w.balance + row.credits_charged,
    description: "Personal video greeting — refund for a film that could not be made",
    metadata: { project_id: row.project_id, video_id: row.id, reason },
  });
  await supabaseAdmin
    .from("pvg_videos")
    .update({ credits_charged: 0 } as never)
    .eq("id", row.id);
}

/**
 * Moves one running film forward, whichever stage it is in. It runs with
 * service rights, so the work completes even when nobody is on the page.
 * Never throws.
 */
export async function reconcileVideo(videoId: string): Promise<PvgVideoStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pvg_videos")
    .select(VIDEO_COLUMNS)
    .eq("id", videoId)
    .maybeSingle();
  const row = data as VideoRow | null;
  if (!row) return "failed";
  if (["ready", "failed", "lipsync_failed"].includes(row.status)) return statusOf(row.status);

  const patch = async (values: Record<string, unknown>) => {
    await supabaseAdmin
      .from("pvg_videos")
      .update(values as never)
      .eq("id", row.id);
  };

  const { pollStage, stageCostUsd } = await import("./generator/pipeline.server");

  // ---- stage two: the lip movement --------------------------------------
  if (row.stage === "lipsync") {
    if (!row.lipsync_prediction_id) return statusOf(row.status);
    const progress = await pollStage(row.lipsync_prediction_id);
    if (progress.state === "processing") {
      if (row.status !== "lipsync") await patch({ status: "lipsync" });
      return "lipsync";
    }
    if (progress.state === "failed") {
      // The silent film is kept: only the lip movement is tried again, free.
      await patch({
        status: "lipsync_failed",
        error_code: progress.errorCode,
        error_message: progress.errorMessage,
      });
      return "lipsync_failed";
    }
    await patch({ status: "assets" });
    try {
      const bucket = pvgVideoBucket();
      const res = await fetch(progress.url);
      if (!res.ok) throw new Error(`download_failed_${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const storagePath = `${row.user_id}/${row.project_id}/${crypto.randomUUID()}.${progress.fileExtension}`;
      const upload = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, bytes, { contentType: progress.contentType, upsert: false });
      if (upload.error) throw new Error(upload.error.message);
      await patch({
        status: "ready",
        stage: "done",
        storage_bucket: bucket,
        storage_path: storagePath,
        lipsync_predict_seconds: progress.predictSeconds,
        lipsync_cost_usd: stageCostUsd(
          "lipsync",
          row.lipsync_generator_key ?? "",
          row.duration_seconds,
        ),
        error_code: null,
        error_message: null,
        completed_at: new Date().toISOString(),
      });
      // A brand new film becomes the preferred one; earlier variants stay.
      await markSelectedVariant(row.project_id, row.id);
      await supabaseAdmin
        .from("pvg_projects")
        .update({ status: "video_ready" } as never)
        .eq("id", row.project_id);
      return "ready";
    } catch (err) {
      await patch({
        status: "lipsync_failed",
        error_code: "storage_failed",
        error_message:
          err instanceof Error ? err.message.slice(0, 300) : "The film could not be stored.",
      });
      return "lipsync_failed";
    }
  }

  // ---- stage one: the silent moving picture ------------------------------
  const predictionId = row.video_prediction_id ?? row.prediction_id;
  if (!predictionId) return statusOf(row.status);
  const progress = await pollStage(predictionId);

  if (progress.state === "processing") {
    if (row.status !== "processing") await patch({ status: "processing" });
    return "processing";
  }
  if (progress.state === "failed") {
    await patch({
      status: "failed",
      error_code: progress.errorCode,
      error_message: progress.errorMessage,
      completed_at: new Date().toISOString(),
    });
    await refundVideo(row, progress.errorCode);
    await supabaseAdmin
      .from("pvg_projects")
      .update({ status: "video_failed" } as never)
      .eq("id", row.project_id);
    return "failed";
  }

  // The silent film exists: it is kept safely, then given its voice.
  try {
    const bucket = pvgVideoBucket();
    const res = await fetch(progress.url);
    if (!res.ok) throw new Error(`download_failed_${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const silentPath = `${row.user_id}/${row.project_id}/silent-${crypto.randomUUID()}.${progress.fileExtension}`;
    const upload = await supabaseAdmin.storage
      .from(bucket)
      .upload(silentPath, bytes, { contentType: progress.contentType, upsert: false });
    if (upload.error) throw new Error(upload.error.message);
    await patch({
      silent_bucket: bucket,
      silent_path: silentPath,
      video_predict_seconds: progress.predictSeconds,
      video_cost_usd: stageCostUsd(
        "silent_video",
        row.video_generator_key ?? "",
        row.duration_seconds,
      ),
    });
  } catch (err) {
    await patch({
      status: "failed",
      error_code: "storage_failed",
      error_message:
        err instanceof Error ? err.message.slice(0, 300) : "The film could not be stored.",
      completed_at: new Date().toISOString(),
    });
    await refundVideo(row, "storage_failed");
    return "failed";
  }

  const { data: fresh } = await supabaseAdmin
    .from("pvg_videos")
    .select(VIDEO_COLUMNS)
    .eq("id", row.id)
    .maybeSingle();
  return await beginLipsync((fresh as VideoRow | null) ?? row);
}

/**
 * Hands one finished silent film to the lip-sync stage together with the
 * greeting voice this order already owns. Nothing is charged here.
 */
export async function beginLipsync(row: VideoRow): Promise<PvgVideoStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const patch = async (values: Record<string, unknown>) => {
    await supabaseAdmin
      .from("pvg_videos")
      .update(values as never)
      .eq("id", row.id);
  };
  try {
    if (!row.silent_bucket || !row.silent_path) throw new Error("missing_silent_video");
    const { pvgSignedUrlTtl } = await import("./env.server");
    const signed = await supabaseAdmin.storage
      .from(row.silent_bucket)
      .createSignedUrl(row.silent_path, pvgSignedUrlTtl());
    const videoUrl = signed.data?.signedUrl;
    if (!videoUrl) throw new Error("missing_silent_video");

    const { readVoiceover } = await import("./voice/voice.server");
    const voiceover = await readVoiceover(row.project_id);
    const audioUrl = voiceover?.audioUrl ?? null;
    if (!audioUrl) throw new Error("missing_greeting_audio");

    const { count } = await supabaseAdmin
      .from("pvg_people")
      .select("id", { count: "exact", head: true })
      .eq("project_id", row.project_id);

    const { startLipsync } = await import("./generator/pipeline.server");
    const started = await startLipsync({
      videoUrl,
      audioUrl,
      multipleFaces: (count ?? 1) > 1,
    });
    await patch({
      status: "lipsync",
      stage: "lipsync",
      lipsync_generator_key: started.engineKey,
      lipsync_generator_model: started.model,
      lipsync_prediction_id: started.predictionId,
      lipsync_active_speaker: started.activeSpeaker,
      error_code: null,
      error_message: null,
    });
    return "lipsync";
  } catch (err) {
    await patch({
      status: "lipsync_failed",
      stage: "lipsync",
      error_code: "lipsync_start_failed",
      error_message:
        err instanceof Error ? err.message.slice(0, 300) : "The lip movement could not be started.",
    });
    return "lipsync_failed";
  }
}

/** Finishes every running film across the platform. */
export async function reconcilePendingVideos(limit = 20): Promise<{ checkedVideos: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pvg_videos")
    .select("id")
    .in("status", ["pending", "processing", "lipsync", "assets"])
    .order("created_at", { ascending: true })
    .limit(limit);
  const rows = (data ?? []) as { id: string }[];
  for (const row of rows) await reconcileVideo(row.id);
  return { checkedVideos: rows.length };
}
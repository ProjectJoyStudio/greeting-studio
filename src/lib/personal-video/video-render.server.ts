// Server-only life of the finished personal video greeting.
//
// One single stage: the approved starting scene and the finished greeting
// voice go to the final-video engine, which returns the speaking film. The
// voice heard in that film is the greeting voice itself — Project Joy never
// lays the same speech over it again. Only the chosen background music, if
// any, is added on top during playback.

import type { PvgVideoJob, PvgVideoStatus } from "./video-render";

export const VIDEO_COLUMNS =
  "id, project_id, user_id, job_id, status, duration_seconds, scene_sounds, credits_charged, prediction_id, generator_key, generator_model, storage_bucket, storage_path, error_code, error_message, created_at, variant_index, action_description, is_selected, video_generator_key, video_generator_model, video_prediction_id, video_predict_seconds, video_cost_usd, audio_seconds, speaker_person_id, delivered_at";

export interface VideoRow {
  id: string;
  project_id: string;
  user_id: string;
  job_id: string;
  status: string;
  duration_seconds: number;
  scene_sounds: boolean;
  credits_charged: number;
  prediction_id: string | null;
  generator_key?: string | null;
  generator_model?: string | null;
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
  video_predict_seconds?: number | null;
  video_cost_usd?: number | null;
  audio_seconds?: number | null;
  speaker_person_id?: string | null;
  /** Set once the customer downloaded or shared this film. */
  delivered_at?: string | null;
}

export function pvgVideoBucket(): string {
  return process.env["PVG_VIDEO_BUCKET"] || "generated-videos";
}

function statusOf(value: string): PvgVideoStatus {
  if (["pending", "processing", "assets", "ready", "failed"].includes(value)) {
    return value as PvgVideoStatus;
  }
  // Films from the retired two-stage pipeline are simply shown as running.
  return value === "lipsync" ? "processing" : "failed";
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
      generator: row.video_generator_key ?? row.generator_key ?? null,
      model: row.video_generator_model ?? row.generator_model ?? null,
      predictionId: row.video_prediction_id ?? row.prediction_id ?? null,
      audioSeconds: Number(row.audio_seconds ?? 0),
      speakerPersonId: row.speaker_person_id ?? null,
      costUsd: Number(row.video_cost_usd ?? 0),
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
  const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("refund_pvg_video_credits", {
    _video_id: row.id,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
}

/**
 * Moves one running film forward. It runs with service rights, so the work
 * completes even when nobody is on the page. Never throws.
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
  if (["ready", "failed"].includes(row.status)) return statusOf(row.status);

  const patch = async (values: Record<string, unknown>) => {
    await supabaseAdmin
      .from("pvg_videos")
      .update(values as never)
      .eq("id", row.id);
  };

  const predictionId = row.video_prediction_id ?? row.prediction_id;
  if (!predictionId) return statusOf(row.status);

  const { pollStage, finalVideoCostUsd } = await import("./generator/pipeline.server");
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
      storage_bucket: bucket,
      storage_path: storagePath,
      video_predict_seconds: progress.predictSeconds,
      video_cost_usd: finalVideoCostUsd(
        row.video_generator_key ?? "",
        Number(row.audio_seconds ?? row.duration_seconds ?? 0),
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
      status: "failed",
      error_code: "storage_failed",
      error_message:
        err instanceof Error ? err.message.slice(0, 300) : "The film could not be stored.",
      completed_at: new Date().toISOString(),
    });
    await refundVideo(row, "storage_failed");
    return "failed";
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

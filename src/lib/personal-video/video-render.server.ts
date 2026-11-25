// Server-only life of the finished personal video greeting.
//
// One single stage: the approved starting scene and the finished greeting
// voice go to the final-video engine, which returns the speaking film. The
// voice heard in that film is the greeting voice itself — Project Joy never
// lays the same speech over it again. Only the chosen background music, if
// any, is added on top during playback.

import type { PvgVideoJob, PvgVideoStatus } from "./video-render";

export const VIDEO_COLUMNS =
  "id, project_id, user_id, job_id, status, duration_seconds, scene_sounds, credits_charged, prediction_id, generator_key, generator_model, storage_bucket, storage_path, error_code, error_message, created_at, variant_index, action_description, is_selected, video_generator_key, video_generator_model, video_prediction_id, video_predict_seconds, video_cost_usd, audio_seconds, speaker_person_id, delivered_at, mix_storage_path, mix_signature, submission_state, charge_txn_id, reconcile_token, reconcile_until, updated_at, dispatch_fingerprint, dispatched_at, needs_review, reconcile_attempts";

export interface VideoRow {
  id: string;
  project_id: string;
  user_id: string;
  job_id: string;
  status: string;
  submission_state?: string | null;
  charge_txn_id?: string | null;
  reconcile_token?: string | null;
  reconcile_until?: string | null;
  updated_at?: string;
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
  /** The very same film, but with the chosen music already inside it. */
  mix_storage_path?: string | null;
  mix_signature?: string | null;
  dispatch_fingerprint?: string | null;
  dispatched_at?: string | null;
  needs_review?: boolean | null;
  reconcile_attempts?: number | null;
}

/** How long an operation may stay unresolved before an administrator must look at it. */
export const PVG_UNCERTAIN_REVIEW_MS = 45 * 60_000;
export const PVG_MAX_OPEN_MS = 3 * 60 * 60_000;
export const PVG_MAX_TRANSIENT_ATTEMPTS = 8;

/** Bounded exponential backoff for repeated provider/polling errors. */
export function pvgBackoffMs(attempts: number): number {
  return Math.min(30 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));
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
    // The mixed film — voice and music together — is the authoritative asset
    // as soon as it exists; the page and the download both play this one.
    const path = row.mix_storage_path ?? row.storage_path;
    const signed = await supabaseAdmin.storage
      .from(row.storage_bucket)
      .createSignedUrl(path, pvgSignedUrlTtl());
    videoUrl = signed.data?.signedUrl ?? null;
  }
  return {
    id: row.id,
    status,
    durationSeconds: row.duration_seconds,
    sceneSounds: Boolean(row.scene_sounds),
    creditsCharged: row.credits_charged,
    paymentUncertain: row.submission_state === "uncertain",
    videoUrl,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    variantIndex: row.variant_index ?? 1,
    isSelected: Boolean(row.is_selected),
    actionDescription: row.action_description ?? "",
    mixSignature: row.mix_storage_path ? (row.mix_signature ?? null) : null,
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

/**
 * Gives back exactly what one failed film took, and never more. Returns the
 * number of credits that really went back to the wallet: 0 means there was
 * nothing left to return, because the same film was already refunded once.
 */
export async function refundVideo(row: VideoRow, reason: string): Promise<number> {
  if (row.credits_charged <= 0) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: number | null; error: { message: string } | null }>;
  const { data, error } = await rpc("refund_pvg_video_credits", {
    _video_id: row.id,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
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
  if (row.status === "ready" || (row.status === "failed" && row.credits_charged <= 0))
    return statusOf(row.status);
  const lease = crypto.randomUUID();
  const claim = await supabaseAdmin.rpc("claim_pvg_video_reconcile", {
    _video_id: row.id,
    _token: lease,
  });
  if (claim.error || !claim.data) return statusOf(row.status);
  try {
    // Re-read after acquiring the lease: another request may have finished while we waited.
    const fresh = await supabaseAdmin
      .from("pvg_videos")
      .select(VIDEO_COLUMNS)
      .eq("id", row.id)
      .maybeSingle();
    if (!fresh.data || fresh.data.status === "ready") return "ready";
    Object.assign(row, fresh.data);
    if (row.status === "failed") {
      await refundVideo(row, row.error_code ?? "generation_failed");
      return "failed";
    }

    const patch = async (values: Record<string, unknown>) => {
      await supabaseAdmin
        .from("pvg_videos")
        .update(values as never)
        .eq("id", row.id)
        .eq("reconcile_token", lease)
        .in("status", ["pending", "processing", "lipsync", "assets"]);
    };

    // Flagged operations wait for an administrator; nothing automatic happens.
    if (row.needs_review) return statusOf(row.status);
    const now = Date.now();
    const flag = async (reason: string) => {
      await patch({
        needs_review: true,
        review_reason: reason,
        review_flagged_at: new Date().toISOString(),
        last_reconcile_at: new Date().toISOString(),
      });
    };
    const backoff = async (error: string) => {
      const attempts = Number(row.reconcile_attempts ?? 0) + 1;
      if (attempts >= PVG_MAX_TRANSIENT_ATTEMPTS) return flag(`repeated_errors:${error}`);
      await patch({
        reconcile_attempts: attempts,
        last_reconcile_error: error,
        last_reconcile_at: new Date().toISOString(),
        next_reconcile_at: new Date(now + pvgBackoffMs(attempts)).toISOString(),
      });
    };
    if (now - Date.parse(row.created_at) > PVG_MAX_OPEN_MS) {
      await flag("open_too_long");
      return statusOf(row.status);
    }

    let predictionId = row.video_prediction_id ?? row.prediction_id;
    // A Replicate request whose response (and job ID) was lost: look for the
    // exact submission at the provider. Never resubmit, never refund here.
    if (
      !predictionId &&
      (row.submission_state === "uncertain" || row.submission_state === "dispatching") &&
      row.dispatch_fingerprint
    ) {
      const { findLostReplicatePrediction, engineModel } = await import(
        "./generator/pipeline.server"
      );
      const model = engineModel(row.video_generator_key);
      const found = model
        ? await findLostReplicatePrediction(
            model,
            row.dispatch_fingerprint,
            row.dispatched_at ?? row.created_at,
          )
        : null;
      if (found) {
        await patch({
          video_prediction_id: found,
          prediction_id: found,
          submission_state: "accepted",
          status: "processing",
        });
        predictionId = found;
      } else if (now - Date.parse(row.dispatched_at ?? row.created_at) > PVG_UNCERTAIN_REVIEW_MS) {
        await flag("submission_outcome_unknown");
        return statusOf(row.status);
      } else {
        await backoff("submission_outcome_unknown");
        return statusOf(row.status);
      }
    }
    if (!predictionId) {
      const stale = Date.now() - Date.parse(row.created_at) > 10 * 60_000;
      if (stale && row.submission_state === "paid") {
        await patch({
          status: "failed",
          submission_state: "rejected",
          error_code: "submission_not_started",
        });
        await refundVideo(row, "submission_not_started");
        return "failed";
      }
      if (stale && row.submission_state === "dispatching")
        await patch({ submission_state: "uncertain", error_code: "submission_uncertain" });
      return statusOf(row.status);
    }

    const { pollStage, finalVideoCostUsd } = await import("./generator/pipeline.server");
    let progress;
    try {
      progress = await pollStage(predictionId);
    } catch {
      return statusOf(row.status);
    }

    if (progress.state === "processing") {
      if (progress.unknown) {
        await flag("provider_job_not_found");
        return statusOf(row.status);
      }
      if (progress.transient) {
        await backoff("provider_unreachable");
        return statusOf(row.status);
      }
      await patch({
        ...(row.status !== "processing" ? { status: "processing" } : {}),
        reconcile_attempts: 0,
        last_reconcile_error: null,
        last_reconcile_at: new Date().toISOString(),
        next_reconcile_at: new Date(now + 20_000).toISOString(),
      });
      return "processing";
    }
    if (progress.state === "failed") {
      await patch({
        status: "failed",
        error_code: progress.errorCode,
        error_message: progress.errorMessage,
        completed_at: new Date().toISOString(),
      });
      // The refund is attempted here and nowhere else for this film. If it
      // cannot be completed the charge stays visible on the film, so nobody is
      // ever told that credits came back when they did not.
      try {
        await refundVideo(row, progress.errorCode);
      } catch {
        // Left charged on purpose; the next reconcile pass tries again.
      }

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
  } finally {
    await supabaseAdmin
      .from("pvg_videos")
      .update({ reconcile_token: null, reconcile_until: null })
      .eq("id", row.id)
      .eq("reconcile_token", lease);
  }
}

/** Finishes every running film across the platform. */
export async function reconcilePendingVideos(limit = 20): Promise<{ checkedVideos: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pvg_videos")
    .select("id")
    .or("status.in.(pending,processing,lipsync,assets),and(status.eq.failed,credits_charged.gt.0)")
    .eq("needs_review", false)
    .or(`next_reconcile_at.is.null,next_reconcile_at.lte.${new Date().toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(limit);
  const rows = (data ?? []) as { id: string }[];
  for (const row of rows) await reconcileVideo(row.id);
  return { checkedVideos: rows.length };
}

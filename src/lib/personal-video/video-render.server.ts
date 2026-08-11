// Server-only life of the finished personal video greeting: storing the film,
// finishing it in the background and returning credits when it fails.

import type { PvgVideoJob, PvgVideoStatus } from "./video-render";

export const VIDEO_COLUMNS =
  "id, project_id, user_id, job_id, status, duration_seconds, scene_sounds, credits_charged, prediction_id, storage_bucket, storage_path, error_code, error_message, created_at, variant_index, action_description, is_selected";

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
  storage_bucket: string | null;
  storage_path: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  variant_index?: number | null;
  action_description?: string | null;
  is_selected?: boolean | null;
}

export function pvgVideoBucket(): string {
  return process.env["PVG_VIDEO_BUCKET"] || "generated-videos";
}

function statusOf(value: string): PvgVideoStatus {
  return ["pending", "processing", "assets", "ready", "failed"].includes(value)
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
 * Finishes one running film when the engine is done with it. It runs with
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
  if (row.status === "ready" || row.status === "failed") return statusOf(row.status);
  if (!row.prediction_id) return statusOf(row.status);

  const { pollVideoRender } = await import("./generator/video-engine.server");
  const progress = await pollVideoRender(row.prediction_id);

  const patch = async (values: Record<string, unknown>) => {
    await supabaseAdmin
      .from("pvg_videos")
      .update(values as never)
      .eq("id", row.id);
  };

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

  // The film exists: it is stored safely before anybody is told about it.
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
      completed_at: new Date().toISOString(),
    });
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
    .in("status", ["pending", "processing", "assets"])
    .not("prediction_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  const rows = (data ?? []) as { id: string }[];
  for (const row of rows) await reconcileVideo(row.id);
  return { checkedVideos: rows.length };
}
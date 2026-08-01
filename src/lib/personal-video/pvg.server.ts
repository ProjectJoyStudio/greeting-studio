// Server-only helpers of the Personal Video Greeting section: signed links,
// row mapping and the background completion of running starting scenes.

import type { PvgFaceQuality, PvgPerson, PvgProject, PvgScene, PvgSceneStatus } from "./types";

export const PROJECT_COLUMNS =
  "id, recipient_name, occasion, scene_description, status, generations_used, generations_limit, credits_charged, selected_scene_id, updated_at";
export const PERSON_COLUMNS =
  "id, project_id, name, position, optimized_bucket, optimized_path, original_bucket, original_path, extra_photos, face_quality, source";
export const SCENE_COLUMNS =
  "id, project_id, variation_index, status, storage_bucket, storage_path, error_code, error_message, prediction_id, created_at";

export interface ProjectRow {
  id: string;
  recipient_name: string | null;
  occasion: string | null;
  scene_description: string | null;
  status: string;
  generations_used: number;
  generations_limit: number;
  credits_charged: number;
  selected_scene_id: string | null;
  updated_at: string;
}

export interface PersonRow {
  id: string;
  project_id: string;
  name: string | null;
  position: number;
  optimized_bucket: string | null;
  optimized_path: string | null;
  original_bucket: string | null;
  original_path: string | null;
  extra_photos: unknown;
  face_quality: string;
  source: string;
}

export interface SceneRow {
  id: string;
  project_id: string;
  variation_index: number;
  status: string;
  storage_bucket: string | null;
  storage_path: string | null;
  error_code: string | null;
  error_message: string | null;
  prediction_id: string | null;
  created_at: string;
}

export async function signedUrl(bucket: string | null, path: string | null): Promise<string | null> {
  if (!bucket || !path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { pvgSignedUrlTtl } = await import("./env.server");
  const res = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, pvgSignedUrlTtl());
  return res.data?.signedUrl ?? null;
}

export async function toPerson(row: PersonRow): Promise<PvgPerson> {
  const quality: PvgFaceQuality =
    row.face_quality === "good" || row.face_quality === "low" ? row.face_quality : "unknown";
  return {
    id: row.id,
    name: row.name ?? "",
    position: row.position,
    photoUrl: await signedUrl(row.optimized_bucket, row.optimized_path),
    faceQuality: quality,
    source: row.source === "group" ? "group" : "individual",
    extraPhotoCount: Array.isArray(row.extra_photos) ? row.extra_photos.length : 0,
  };
}

export async function toScene(row: SceneRow): Promise<PvgScene> {
  const status: PvgSceneStatus = ["pending", "processing", "ready", "failed"].includes(row.status)
    ? (row.status as PvgSceneStatus)
    : "pending";
  return {
    id: row.id,
    variationIndex: row.variation_index,
    status,
    imageUrl: status === "ready" ? await signedUrl(row.storage_bucket, row.storage_path) : null,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export function toProjectShell(row: ProjectRow): Omit<PvgProject, "people" | "scenes"> {
  return {
    id: row.id,
    recipientName: row.recipient_name ?? "",
    occasion: row.occasion ?? "",
    sceneDescription: row.scene_description ?? "",
    status: row.status,
    generationsUsed: row.generations_used,
    generationsLimit: row.generations_limit,
    creditsCharged: row.credits_charged,
    selectedSceneId: row.selected_scene_id,
    updatedAt: row.updated_at,
  };
}

/**
 * Finishes one running starting scene when the engine is done with it. It runs
 * with service rights, so the work completes even when nobody is on the page.
 * Never throws.
 */
export async function reconcileScene(sceneId: string): Promise<PvgSceneStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pvg_scenes")
    .select("id, user_id, status, prediction_id")
    .eq("id", sceneId)
    .maybeSingle();
  const row = data as { id: string; user_id: string; status: string; prediction_id: string | null } | null;
  if (!row || !row.prediction_id) return "pending";
  if (row.status === "ready" || row.status === "failed") return row.status;

  const { pollSceneRender } = await import("./generator/flux2-dev.server");
  const progress = await pollSceneRender(row.prediction_id);

  const patch = async (values: Record<string, unknown>) => {
    await supabaseAdmin.from("pvg_scenes").update(values as never).eq("id", row.id);
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
    return "failed";
  }

  try {
    const { pvgSceneBucket } = await import("./env.server");
    const bucket = pvgSceneBucket();
    const res = await fetch(progress.url);
    if (!res.ok) throw new Error(`download_failed_${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const storagePath = `${row.user_id}/${crypto.randomUUID()}.${progress.fileExtension}`;
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
    return "ready";
  } catch (err) {
    await patch({
      status: "failed",
      error_code: "storage_failed",
      error_message: err instanceof Error ? err.message.slice(0, 300) : "The picture could not be stored.",
      completed_at: new Date().toISOString(),
    });
    return "failed";
  }
}

/** Finishes every running starting scene across the platform. */
export async function reconcilePendingScenes(limit = 40): Promise<{ checked: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pvg_scenes")
    .select("id")
    .in("status", ["pending", "processing"])
    .not("prediction_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  const rows = (data ?? []) as { id: string }[];
  for (const row of rows) await reconcileScene(row.id);
  return { checked: rows.length };
}
// Server-only helpers of the Personal Video Greeting section: signed links,
// row mapping and the background completion of running starting scenes.

import type { PvgFaceQuality, PvgPerson, PvgProject, PvgScene, PvgSceneStatus } from "./types";
import { clampDuration, PVS_DEFAULT_SECONDS } from "./video-setup";

export const PROJECT_COLUMNS =
  "id, recipient_name, occasion, scene_description, status, generations_used, generations_limit, credits_charged, selected_scene_id, updated_at, created_at, video_duration_seconds, greeting_mode, greeting_text, greeting_keywords, workflow_step, order_cost, version, last_saved_at, credit_history, deleted_at, purge_after, speech_mode, sync_mode, chorus_voice_ids";
export const PERSON_COLUMNS =
  "id, project_id, name, position, optimized_bucket, optimized_path, original_bucket, original_path, extra_photos, face_quality, source, voice_id, voice_name, voice_source, voice_category, voice_confirmed, part_text, recording_bucket, recording_path, recording_duration_seconds";
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
  created_at?: string | null;
  workflow_step?: string | null;
  order_cost?: number | null;
  version?: number | null;
  last_saved_at?: string | null;
  credit_history?: unknown;
  deleted_at?: string | null;
  purge_after?: string | null;
  video_duration_seconds?: number | null;
  greeting_mode?: string | null;
  greeting_text?: string | null;
  greeting_keywords?: string | null;
  speech_mode?: string | null;
  sync_mode?: string | null;
  chorus_voice_ids?: unknown;
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
  voice_id?: string | null;
  voice_name?: string | null;
  voice_source?: string | null;
  voice_category?: string | null;
  voice_confirmed?: boolean | null;
  part_text?: string | null;
  recording_bucket?: string | null;
  recording_path?: string | null;
  recording_duration_seconds?: number | null;
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

export async function signedUrl(
  bucket: string | null,
  path: string | null,
): Promise<string | null> {
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
    voiceId: row.voice_id ?? null,
    voiceName: row.voice_name ?? null,
    voiceSource:
      row.voice_source === "recording"
        ? "recording"
        : row.voice_source === "library"
          ? "library"
          : null,
    voiceCategory:
      row.voice_category === "female" ||
      row.voice_category === "male" ||
      row.voice_category === "children"
        ? row.voice_category
        : null,
    voiceConfirmed: Boolean(row.voice_confirmed),
    partText: row.part_text ?? "",
    recordingUrl: await signedUrl(row.recording_bucket ?? null, row.recording_path ?? null),
    recordingDurationSeconds: Number(row.recording_duration_seconds ?? 0),
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
    createdAt: row.created_at ?? row.updated_at,
    workflowStep: row.workflow_step === "video" ? "video" : "scene",
    orderCost: row.order_cost ?? 0,
    version: row.version ?? 0,
    lastSavedAt: row.last_saved_at ?? row.updated_at,
    creditHistory: Array.isArray(row.credit_history)
      ? (row.credit_history as PvgProject["creditHistory"])
      : [],
    videoSetup: {
      durationSeconds: clampDuration(row.video_duration_seconds ?? PVS_DEFAULT_SECONDS),
      greetingMode: row.greeting_mode === "keywords" ? "keywords" : "manual",
      greetingText: row.greeting_text ?? "",
      greetingKeywords: row.greeting_keywords ?? "",
    },
    speechMode:
      row.speech_mode === "parts" || row.speech_mode === "chorus" ? row.speech_mode : "single",
    syncMode: row.sync_mode === "simultaneous" ? "simultaneous" : "delayed",
    chorusVoiceIds: Array.isArray(row.chorus_voice_ids)
      ? (row.chorus_voice_ids as unknown[]).filter((v): v is string => typeof v === "string")
      : [],
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
  const row = data as {
    id: string;
    user_id: string;
    status: string;
    prediction_id: string | null;
  } | null;
  if (!row || !row.prediction_id) return "pending";
  if (row.status === "ready" || row.status === "failed") return row.status;

  const { pollSceneRender } = await import("./generator/image-engine.server");
  const progress = await pollSceneRender(row.prediction_id);

  const patch = async (values: Record<string, unknown>) => {
    await supabaseAdmin
      .from("pvg_scenes")
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
      error_message:
        err instanceof Error ? err.message.slice(0, 300) : "The picture could not be stored.",
      completed_at: new Date().toISOString(),
    });
    return "failed";
  }
}

/** Finishes every running starting scene across the platform. */
export async function purgeProjectFiles(projectId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: people }, { data: scenes }] = await Promise.all([
    supabaseAdmin
      .from("pvg_people")
      .select("optimized_bucket, optimized_path, original_bucket, original_path, extra_photos")
      .eq("project_id", projectId),
    supabaseAdmin
      .from("pvg_scenes")
      .select("storage_bucket, storage_path, prediction_id, status")
      .eq("project_id", projectId),
  ]);

  const byBucket = new Map<string, string[]>();
  const add = (bucket: string | null | undefined, path: string | null | undefined) => {
    if (!bucket || !path) return;
    const list = byBucket.get(bucket) ?? [];
    list.push(path);
    byBucket.set(bucket, list);
  };

  for (const row of (people ?? []) as Array<Record<string, unknown>>) {
    add(row["optimized_bucket"] as string, row["optimized_path"] as string);
    add(row["original_bucket"] as string, row["original_path"] as string);
    const extra = row["extra_photos"];
    if (Array.isArray(extra)) {
      for (const item of extra) {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          add(rec["bucket"] as string, rec["path"] as string);
        }
      }
    }
  }
  for (const row of (scenes ?? []) as Array<Record<string, unknown>>) {
    add(row["storage_bucket"] as string, row["storage_path"] as string);
  }

  // Stop anything still rendering; results that arrive later have no row left.
  const running = ((scenes ?? []) as Array<Record<string, unknown>>).filter(
    (row) => row["prediction_id"] && row["status"] !== "ready" && row["status"] !== "failed",
  );
  if (running.length > 0) {
    const { cancelSceneRender } = await import("./generator/image-engine.server");
    await Promise.all(running.map((row) => cancelSceneRender(row["prediction_id"] as string)));
  }

  for (const [bucket, paths] of byBucket) {
    if (paths.length > 0) await supabaseAdmin.storage.from(bucket).remove(paths);
  }
}

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

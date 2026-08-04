// Server-only home of the recordings people speak themselves. Project Joy
// keeps the original recording, the prepared recording it uses today and a
// reserved place for the richer version of a participant's own voice later.

import type { PvgVoiceRecording } from "./recordings";

const RECORDING_BUCKET = "voice-samples";
const SIGNED_TTL = 60 * 60 * 12;

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

async function signed(bucket: string | null, path: string | null): Promise<string | null> {
  if (!bucket || !path) return null;
  const db = await admin();
  const res = await db.storage.from(bucket).createSignedUrl(path, SIGNED_TTL);
  return res.data?.signedUrl ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toRecording(row: Record<string, any>): Promise<PvgVoiceRecording> {
  const [originalUrl, processedUrl, enhancedUrl] = await Promise.all([
    signed(row["original_bucket"], row["original_path"]),
    signed(row["processed_bucket"], row["processed_path"]),
    signed(row["enhanced_bucket"], row["enhanced_path"]),
  ]);
  const version = (row["active_version"] ?? "processed") as PvgVoiceRecording["activeVersion"];
  const active =
    version === "enhanced"
      ? (enhancedUrl ?? processedUrl ?? originalUrl)
      : version === "original"
        ? (originalUrl ?? processedUrl)
        : (processedUrl ?? originalUrl);
  return {
    personId: row["person_id"],
    language: row["language"] ?? "en",
    durationSeconds: Number(row["duration_seconds"] ?? 0),
    activeVersion: version,
    activeUrl: active,
    originalUrl,
    processedUrl,
    enhancedUrl,
    processingStatus: row["processing_status"] ?? "pending",
    processingError: row["processing_error"] ?? null,
    voiceModelStatus: row["voice_model_status"] ?? "not_requested",
    voiceModelId: row["voice_model_id"] ?? null,
    permissionConfirmed: Boolean(row["permission_confirmed"]),
    permissionConfirmedAt: row["permission_confirmed_at"] ?? null,
  };
}

/** Every personal recording of one project, restored exactly as it was left. */
export async function listRecordings(projectId: string): Promise<PvgVoiceRecording[]> {
  const db = await admin();
  const { data } = await db.from("pvg_voice_recordings").select("*").eq("project_id", projectId);
  if (!Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Promise.all((data as Record<string, any>[]).map(toRecording));
}

async function upload(
  bucket: string,
  path: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const db = await admin();
  const bytes = new Uint8Array(Buffer.from(base64, "base64"));
  if (bytes.byteLength === 0) throw new Error("recording_empty");
  const res = await db.storage
    .from(bucket)
    .upload(path, bytes, { contentType: mimeType, upsert: true });
  if (res.error) throw new Error(res.error.message);
}

/**
 * Keeps one participant's own recording: the original exactly as it arrived and
 * the prepared version Project Joy uses in the finished greeting. Nothing about
 * this is ever chosen by the person — it simply happens.
 */
export async function savePersonRecording(args: {
  projectId: string;
  personId: string;
  userId: string;
  language: string;
  originalBase64: string;
  originalMime: string;
  extension: string;
  processedBase64: string;
  processedMime: string;
  durationSeconds: number;
  permissionConfirmed: boolean;
}): Promise<PvgVoiceRecording> {
  const db = await admin();
  const { data: previous } = await db
    .from("pvg_voice_recordings")
    .select("original_bucket, original_path, processed_bucket, processed_path")
    .eq("person_id", args.personId)
    .maybeSingle();

  const safe = (args.extension || "webm").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm";
  const stamp = Date.now();
  const base = `${args.userId}/${args.projectId}/${args.personId}-${stamp}`;
  const originalPath = `${base}-original.${safe}`;
  const processedPath = `${base}-prepared.wav`;

  const now = new Date().toISOString();
  await db.from("pvg_voice_recordings").upsert(
    {
      project_id: args.projectId,
      person_id: args.personId,
      user_id: args.userId,
      language: args.language,
      processing_status: "processing",
      processing_error: null,
      permission_confirmed: args.permissionConfirmed,
      permission_confirmed_at: args.permissionConfirmed ? now : null,
    },
    { onConflict: "person_id" },
  );

  try {
    await upload(
      RECORDING_BUCKET,
      originalPath,
      args.originalBase64,
      args.originalMime || "audio/webm",
    );
    await upload(
      RECORDING_BUCKET,
      processedPath,
      args.processedBase64,
      args.processedMime || "audio/wav",
    );
  } catch (error) {
    await db
      .from("pvg_voice_recordings")
      .update({
        processing_status: "failed",
        processing_error: error instanceof Error ? error.message : "unknown_error",
      })
      .eq("person_id", args.personId);
    throw error;
  }

  const { error } = await db
    .from("pvg_voice_recordings")
    .update({
      original_bucket: RECORDING_BUCKET,
      original_path: originalPath,
      original_mime: args.originalMime || "audio/webm",
      processed_bucket: RECORDING_BUCKET,
      processed_path: processedPath,
      processed_mime: args.processedMime || "audio/wav",
      active_version: "processed",
      duration_seconds: args.durationSeconds,
      processing_status: "ready",
      processing_error: null,
    })
    .eq("person_id", args.personId);
  if (error) throw new Error(error.message);

  // The participant now speaks with their own recording.
  await db
    .from("pvg_people")
    .update({
      voice_source: "recording",
      voice_id: null,
      voice_name: null,
      recording_bucket: RECORDING_BUCKET,
      recording_path: processedPath,
      recording_mime: args.processedMime || "audio/wav",
      recording_duration_seconds: args.durationSeconds,
    })
    .eq("id", args.personId)
    .eq("project_id", args.projectId);

  const old = previous as Record<string, string | null> | null;
  const stale = [
    old?.["original_path"] && old["original_path"] !== originalPath ? old["original_path"] : null,
    old?.["processed_path"] && old["processed_path"] !== processedPath
      ? old["processed_path"]
      : null,
  ].filter((p): p is string => Boolean(p));
  if (stale.length) await db.storage.from(RECORDING_BUCKET).remove(stale);

  const { data: fresh } = await db
    .from("pvg_voice_recordings")
    .select("*")
    .eq("person_id", args.personId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toRecording(fresh as Record<string, any>);
}

/** Confirms that permission was given to use the voice in a recording. */
export async function confirmRecordingPermission(
  projectId: string,
  personId: string,
  confirmed: boolean,
): Promise<void> {
  const db = await admin();
  await db
    .from("pvg_voice_recordings")
    .update({
      permission_confirmed: confirmed,
      permission_confirmed_at: confirmed ? new Date().toISOString() : null,
    })
    .eq("person_id", personId)
    .eq("project_id", projectId);
}

/** Removes one participant's own recording completely. */
export async function deletePersonRecording(projectId: string, personId: string): Promise<void> {
  const db = await admin();
  const { data } = await db
    .from("pvg_voice_recordings")
    .select(
      "original_bucket, original_path, processed_bucket, processed_path, enhanced_bucket, enhanced_path",
    )
    .eq("person_id", personId)
    .eq("project_id", projectId)
    .maybeSingle();
  const row = data as Record<string, string | null> | null;
  const paths = [row?.["original_path"], row?.["processed_path"], row?.["enhanced_path"]].filter(
    (p): p is string => Boolean(p),
  );
  if (paths.length) await db.storage.from(RECORDING_BUCKET).remove(paths);

  await db
    .from("pvg_voice_recordings")
    .delete()
    .eq("person_id", personId)
    .eq("project_id", projectId);
  await db
    .from("pvg_people")
    .update({
      voice_source: null,
      recording_bucket: null,
      recording_path: null,
      recording_mime: null,
      recording_duration_seconds: null,
    })
    .eq("id", personId)
    .eq("project_id", projectId);
}

/**
 * Reserved for the day a participant's own voice can speak any text. The place
 * where the personal voice is created and where the richer recording is stored
 * already exists; nothing on the page changes when it begins to work.
 */
export async function requestVoiceModel(personId: string): Promise<void> {
  const db = await admin();
  await db
    .from("pvg_voice_recordings")
    .update({ voice_model_status: "queued" })
    .eq("person_id", personId)
    .eq("voice_model_status", "not_requested");
}

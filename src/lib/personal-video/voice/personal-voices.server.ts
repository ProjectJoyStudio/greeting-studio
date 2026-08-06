// Server-only home of "My Voices". Everything here belongs to exactly one
// person: nobody else can ever read, rename, hear or remove their voices.

import type { PersonalVoice, PersonalVoiceScope } from "./personal-voices";

const VOICE_BUCKET = "voice-samples";
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
async function toVoice(row: Record<string, any>): Promise<PersonalVoice> {
  const [sourceUrl, processedUrl] = await Promise.all([
    signed(row["source_bucket"], row["source_path"]),
    signed(row["processed_bucket"], row["processed_path"]),
  ]);
  return {
    id: row["id"],
    displayName: row["display_name"] ?? "",
    scope: row["scope"] === "project" ? "project" : "library",
    projectId: row["project_id"] ?? null,
    language: row["language"] ?? "en",
    durationSeconds: Number(row["duration_seconds"] ?? 0),
    sourceUrl,
    processedUrl,
    providerVoiceId: row["provider_voice_id"] ?? null,
    processingStatus: row["processing_status"] ?? "pending",
    processingError: row["processing_error"] ?? null,
    consentConfirmed: Boolean(row["consent_confirmed"]),
    createdAt: row["created_at"],
    updatedAt: row["updated_at"],
  };
}

/** The permanent library of one person, newest first. */
export async function listLibraryVoices(userId: string): Promise<PersonalVoice[]> {
  const db = await admin();
  const { data } = await db
    .from("pvg_personal_voices")
    .select("*")
    .eq("user_id", userId)
    .eq("scope", "library")
    .order("created_at", { ascending: false });
  if (!Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Promise.all((data as Record<string, any>[]).map(toVoice));
}

/**
 * Everything one project may choose from: the permanent library of the person
 * and the recordings kept inside this project only.
 */
export async function listProjectVoices(
  userId: string,
  projectId: string,
): Promise<PersonalVoice[]> {
  const db = await admin();
  const { data } = await db
    .from("pvg_personal_voices")
    .select("*")
    .eq("user_id", userId)
    .or(`scope.eq.library,project_id.eq.${projectId}`)
    .order("created_at", { ascending: false });
  if (!Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Promise.all((data as Record<string, any>[]).map(toVoice));
}

async function upload(path: string, base64: string, mimeType: string): Promise<void> {
  const db = await admin();
  const bytes = new Uint8Array(Buffer.from(base64, "base64"));
  if (bytes.byteLength === 0) throw new Error("recording_empty");
  const res = await db.storage
    .from(VOICE_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: true });
  if (res.error) throw new Error(res.error.message);
}

async function readOwned(userId: string, voiceId: string) {
  const db = await admin();
  const { data } = await db
    .from("pvg_personal_voices")
    .select("*")
    .eq("id", voiceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("voice_not_found");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as unknown as Record<string, any>;
}

/**
 * Keeps one personal voice: the recording exactly as it arrived and the
 * prepared version Project Joy speaks with. A new voice never replaces an
 * older one unless the person asked for exactly that.
 */
export async function savePersonalVoice(args: {
  userId: string;
  projectId: string | null;
  scope: PersonalVoiceScope;
  displayName: string;
  language: string;
  originalBase64: string;
  originalMime: string;
  extension: string;
  processedBase64: string;
  processedMime: string;
  durationSeconds: number;
  consentConfirmed: boolean;
  /** When set, this existing voice of the same person is overwritten. */
  replaceVoiceId?: string | null;
}): Promise<PersonalVoice> {
  if (!args.consentConfirmed) throw new Error("consent_required");
  if (args.displayName.trim().length < 2) throw new Error("name_required");
  if (args.scope === "project" && !args.projectId) throw new Error("project_required");

  const db = await admin();
  const now = new Date().toISOString();
  const previous = args.replaceVoiceId ? await readOwned(args.userId, args.replaceVoiceId) : null;

  let voiceId = args.replaceVoiceId ?? null;
  if (!voiceId) {
    const { data, error } = await db
      .from("pvg_personal_voices")
      .insert({
        user_id: args.userId,
        project_id: args.scope === "project" ? args.projectId : null,
        scope: args.scope,
        display_name: args.displayName.trim(),
        language: args.language,
        processing_status: "processing",
        consent_confirmed: true,
        consent_confirmed_at: now,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    voiceId = (data as { id: string }).id;
  } else {
    await db
      .from("pvg_personal_voices")
      .update({
        display_name: args.displayName.trim(),
        processing_status: "processing",
        processing_error: null,
        consent_confirmed: true,
        consent_confirmed_at: now,
      })
      .eq("id", voiceId)
      .eq("user_id", args.userId);
  }

  const safe = (args.extension || "webm").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm";
  const base = `${args.userId}/personal-voices/${voiceId}-${Date.now()}`;
  const sourcePath = `${base}-source.${safe}`;
  const processedPath = `${base}-prepared.wav`;

  try {
    await upload(sourcePath, args.originalBase64, args.originalMime || "audio/webm");
    await upload(processedPath, args.processedBase64, args.processedMime || "audio/wav");
  } catch (error) {
    await db
      .from("pvg_personal_voices")
      .update({
        processing_status: "failed",
        processing_error: error instanceof Error ? error.message : "unknown_error",
      })
      .eq("id", voiceId);
    throw error;
  }

  const { error } = await db
    .from("pvg_personal_voices")
    .update({
      source_bucket: VOICE_BUCKET,
      source_path: sourcePath,
      source_mime: args.originalMime || "audio/webm",
      processed_bucket: VOICE_BUCKET,
      processed_path: processedPath,
      processed_mime: args.processedMime || "audio/wav",
      duration_seconds: args.durationSeconds,
      language: args.language,
      processing_status: "ready",
      processing_error: null,
    })
    .eq("id", voiceId);
  if (error) throw new Error(error.message);

  // Only a deliberate replacement ever removes an earlier recording.
  const stale = [previous?.["source_path"], previous?.["processed_path"]].filter(
    (p): p is string => Boolean(p) && p !== sourcePath && p !== processedPath,
  );
  if (stale.length) await db.storage.from(VOICE_BUCKET).remove(stale);

  const fresh = await readOwned(args.userId, voiceId);
  return toVoice(fresh);
}

/** A voice can always be given a clearer name. */
export async function renamePersonalVoice(
  userId: string,
  voiceId: string,
  displayName: string,
): Promise<PersonalVoice> {
  if (displayName.trim().length < 2) throw new Error("name_required");
  const db = await admin();
  const { error } = await db
    .from("pvg_personal_voices")
    .update({ display_name: displayName.trim() })
    .eq("id", voiceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return toVoice(await readOwned(userId, voiceId));
}

/**
 * Removes one personal voice completely: its recordings, its place in the
 * library, and every assignment still waiting in an unfinished project.
 * Greetings that were already created keep their finished audio.
 */
export async function deletePersonalVoice(
  userId: string,
  voiceId: string,
): Promise<{ affectedProjects: number }> {
  const db = await admin();
  const row = await readOwned(userId, voiceId);

  const { data: people } = await db
    .from("pvg_people")
    .select("id, project_id")
    .eq("personal_voice_id", voiceId);
  const affected = new Set(
    Array.isArray(people) ? (people as { project_id: string }[]).map((p) => p.project_id) : [],
  );

  await db
    .from("pvg_people")
    .update({
      personal_voice_id: null,
      voice_source: null,
      voice_name: null,
      voice_confirmed: false,
      speaking_style: null,
    })
    .eq("personal_voice_id", voiceId);

  const paths = [row["source_path"], row["processed_path"]].filter((p): p is string => Boolean(p));
  if (paths.length) await db.storage.from(VOICE_BUCKET).remove(paths);

  const { error } = await db
    .from("pvg_personal_voices")
    .delete()
    .eq("id", voiceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  return { affectedProjects: affected.size };
}
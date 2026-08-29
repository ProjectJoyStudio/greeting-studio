// Server-only home of "My Voices". Everything here belongs to exactly one
// person: nobody else can ever read, rename, hear or remove their voices.
//
// A profile is cloned once from 1-2 short enrollment samples and afterwards
// speaks any greeting text through fresh TTS. The enrollment sample itself is
// kept only for reference and is never played back as greeting audio.

import { voiceSample } from "./catalog";
import { getVoiceEngine, DEFAULT_VOICE_PROVIDER } from "./providers.server";
import type { PersonalVoice, PersonalVoiceScope } from "./personal-voices";

const VOICE_BUCKET = "voice-samples";
const SIGNED_TTL = 60 * 60 * 12;
const MAX_SAMPLES = 2;

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

interface StoredSample {
  bucket: string;
  path: string;
  mime: string;
  seconds: number;
  textId: string;
  /** Studio-readable rendition (WAV) prepared from the original recording. */
  renditionBucket?: string;
  renditionPath?: string;
  renditionMime?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function samplesOf(row: Record<string, any>): StoredSample[] {
  return Array.isArray(row["samples"]) ? (row["samples"] as StoredSample[]) : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toVoice(row: Record<string, any>): Promise<PersonalVoice> {
  const [sourceUrl, processedUrl, previewUrl] = await Promise.all([
    signed(row["source_bucket"], row["source_path"]),
    signed(row["processed_bucket"], row["processed_path"]),
    signed(row["preview_bucket"], row["preview_path"]),
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
    sampleCount: Number(row["sample_count"] ?? samplesOf(row).length ?? 0),
    previewUrl,
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
 * and the profiles kept inside this project only.
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

async function downloadSample(sample: StoredSample): Promise<Uint8Array> {
  const db = await admin();
  const res = await db.storage.from(sample.bucket).download(sample.path);
  if (res.error || !res.data) throw new Error("voice_sample_missing");
  const buffer = await res.data.arrayBuffer();
  return new Uint8Array(buffer);
}

const extensionFor = (mime: string): string => {
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
};

/**
 * Clones one voice profile at the studio from every stored sample of the row,
 * replacing whatever provider voice existed there before.
 */
async function cloneFromSamples(args: {
  displayName: string;
  language: string;
  samples: StoredSample[];
  previousProviderVoiceId?: string | null;
}): Promise<string> {
  const engine = getVoiceEngine(DEFAULT_VOICE_PROVIDER);
  if (!engine.cloneVoice) throw new Error("voice_clone_unsupported");
  const bytesBySample = await Promise.all(args.samples.map(downloadSample));
  const { providerVoiceId } = await engine.cloneVoice({
    name: args.displayName,
    language: args.language,
    samples: bytesBySample.map((bytes, index) => ({
      bytes,
      mimeType: args.samples[index]!.mime,
      filename: `sample-${index + 1}.${extensionFor(args.samples[index]!.mime)}`,
    })),
  });
  if (args.previousProviderVoiceId && engine.deleteClonedVoice) {
    await engine.deleteClonedVoice(args.previousProviderVoiceId).catch(() => undefined);
  }
  return providerVoiceId;
}

/** Speaks a short test phrase with the cloned profile and stores it as the preview. */
async function generateAndStorePreview(args: {
  userId: string;
  voiceId: string;
  providerVoiceId: string;
  language: string;
  text?: string;
  style?: string;
}): Promise<{ bucket: string; path: string; mime: string; text: string }> {
  const engine = getVoiceEngine(DEFAULT_VOICE_PROVIDER);
  const text = (args.text && args.text.trim()) || voiceSample(args.language);
  const { getProductionVoiceModel } = await import("@/lib/admin/voice-settings/models.server");
  const result = await engine.synthesize({
    text,
    voiceId: args.providerVoiceId,
    language: args.language,
    modelId: await getProductionVoiceModel(DEFAULT_VOICE_PROVIDER),
    style: args.style,
  });
  const db = await admin();
  const path = `${args.userId}/personal-voices/${args.voiceId}-preview-${Date.now()}.${result.extension}`;
  const res = await db.storage
    .from(VOICE_BUCKET)
    .upload(path, result.audio, { contentType: result.mimeType, upsert: true });
  if (res.error) throw new Error(res.error.message);
  return { bucket: VOICE_BUCKET, path, mime: result.mimeType, text };
}

/**
 * Creates one reusable voice profile from 1-2 short enrollment samples: the
 * samples are uploaded, the profile is cloned at the studio, and a fresh test
 * phrase is generated as the preview. The samples themselves are never used
 * as greeting audio again.
 */
export async function createVoiceProfile(args: {
  userId: string;
  projectId: string | null;
  scope: PersonalVoiceScope;
  displayName: string;
  language: string;
  consentConfirmed: boolean;
  samples: {
    base64: string;
    mimeType: string;
    extension: string;
    durationSeconds: number;
    textId: string;
  }[];
}): Promise<PersonalVoice> {
  if (!args.consentConfirmed) throw new Error("consent_required");
  if (args.displayName.trim().length < 2) throw new Error("name_required");
  if (args.scope === "project" && !args.projectId) throw new Error("project_required");
  if (args.samples.length === 0) throw new Error("voice_sample_required");
  if (args.samples.length > MAX_SAMPLES) throw new Error("voice_sample_limit");

  const db = await admin();
  const now = new Date().toISOString();

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
      samples: [],
      sample_count: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const voiceId = (data as { id: string }).id;

  try {
    const stored: StoredSample[] = [];
    for (const [index, sample] of args.samples.entries()) {
      const safe = (sample.extension || "webm").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm";
      const path = `${args.userId}/personal-voices/${voiceId}-sample${index + 1}-${Date.now()}.${safe}`;
      await upload(path, sample.base64, sample.mimeType || "audio/webm");
      stored.push({
        bucket: VOICE_BUCKET,
        path,
        mime: sample.mimeType || "audio/webm",
        seconds: sample.durationSeconds,
        textId: sample.textId,
      });
    }

    const totalSeconds = stored.reduce((sum, sample) => sum + sample.seconds, 0);
    const providerVoiceId = await cloneFromSamples({
      displayName: args.displayName.trim(),
      language: args.language,
      samples: stored,
    });

    const preview = await generateAndStorePreview({
      userId: args.userId,
      voiceId,
      providerVoiceId,
      language: args.language,
    });

    const { error: updateError } = await db
      .from("pvg_personal_voices")
      .update({
        samples: stored as unknown as import("@/integrations/supabase/types").Json,
        sample_count: stored.length,
        duration_seconds: totalSeconds,
        provider_voice_id: providerVoiceId,
        preview_bucket: preview.bucket,
        preview_path: preview.path,
        preview_mime: preview.mime,
        test_text: preview.text,
        processing_status: "ready",
        processing_error: null,
      })
      .eq("id", voiceId);
    if (updateError) throw new Error(updateError.message);
  } catch (err) {
    await db
      .from("pvg_personal_voices")
      .update({
        processing_status: "failed",
        processing_error: err instanceof Error ? err.message : "unknown_error",
      })
      .eq("id", voiceId);
    throw err;
  }

  return toVoice(await readOwned(args.userId, voiceId));
}

/**
 * Adds one more enrollment sample to an existing profile. The row is never
 * duplicated: every sample is re-cloned together and the old provider voice
 * is discarded, then the preview is spoken again with the new profile.
 */
export async function addVoiceSample(args: {
  userId: string;
  voiceId: string;
  sample: {
    base64: string;
    mimeType: string;
    extension: string;
    durationSeconds: number;
    textId: string;
  };
}): Promise<PersonalVoice> {
  const db = await admin();
  const row = await readOwned(args.userId, args.voiceId);
  const existing = samplesOf(row);
  if (existing.length >= MAX_SAMPLES) throw new Error("voice_sample_limit");

  await db
    .from("pvg_personal_voices")
    .update({ processing_status: "processing", processing_error: null })
    .eq("id", args.voiceId);

  try {
    const safe = (args.sample.extension || "webm").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm";
    const path = `${args.userId}/personal-voices/${args.voiceId}-sample${existing.length + 1}-${Date.now()}.${safe}`;
    await upload(path, args.sample.base64, args.sample.mimeType || "audio/webm");
    const stored: StoredSample[] = [
      ...existing,
      {
        bucket: VOICE_BUCKET,
        path,
        mime: args.sample.mimeType || "audio/webm",
        seconds: args.sample.durationSeconds,
        textId: args.sample.textId,
      },
    ];
    const totalSeconds = stored.reduce((sum, sample) => sum + sample.seconds, 0);

    const providerVoiceId = await cloneFromSamples({
      displayName: row["display_name"] ?? "",
      language: row["language"] ?? "en",
      samples: stored,
      previousProviderVoiceId: row["provider_voice_id"] ?? null,
    });

    const preview = await generateAndStorePreview({
      userId: args.userId,
      voiceId: args.voiceId,
      providerVoiceId,
      language: row["language"] ?? "en",
    });

    const stalePreview =
      row["preview_bucket"] && row["preview_path"] ? [row["preview_path"] as string] : [];
    if (stalePreview.length) await db.storage.from(VOICE_BUCKET).remove(stalePreview);

    const { error } = await db
      .from("pvg_personal_voices")
      .update({
        samples: stored as unknown as import("@/integrations/supabase/types").Json,
        sample_count: stored.length,
        duration_seconds: totalSeconds,
        provider_voice_id: providerVoiceId,
        preview_bucket: preview.bucket,
        preview_path: preview.path,
        preview_mime: preview.mime,
        test_text: preview.text,
        processing_status: "ready",
        processing_error: null,
      })
      .eq("id", args.voiceId);
    if (error) throw new Error(error.message);
  } catch (err) {
    await db
      .from("pvg_personal_voices")
      .update({
        processing_status: "failed",
        processing_error: err instanceof Error ? err.message : "unknown_error",
      })
      .eq("id", args.voiceId);
    throw err;
  }

  return toVoice(await readOwned(args.userId, args.voiceId));
}

/** Speaks a fresh test phrase with the profile and saves it as its preview. */
export async function regeneratePreview(
  userId: string,
  voiceId: string,
  text?: string,
  style?: string,
): Promise<PersonalVoice> {
  const db = await admin();
  const row = await readOwned(userId, voiceId);
  const providerVoiceId = row["provider_voice_id"];
  if (!providerVoiceId) throw new Error("voice_not_ready");

  const preview = await generateAndStorePreview({
    userId,
    voiceId,
    providerVoiceId,
    language: row["language"] ?? "en",
    text,
    style,
  });

  const stale = row["preview_bucket"] && row["preview_path"] ? [row["preview_path"] as string] : [];
  if (stale.length) await db.storage.from(VOICE_BUCKET).remove(stale);

  const { error } = await db
    .from("pvg_personal_voices")
    .update({
      preview_bucket: preview.bucket,
      preview_path: preview.path,
      preview_mime: preview.mime,
      test_text: preview.text,
    })
    .eq("id", voiceId);
  if (error) throw new Error(error.message);

  return toVoice(await readOwned(userId, voiceId));
}

/**
 * A short spoken sample of the profile speaking fresh text. It is never
 * stored and never touches the saved preview or any greeting already made.
 */
export async function previewPersonalVoice(args: {
  userId: string;
  voiceId: string;
  text?: string;
  style?: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const row = await readOwned(args.userId, args.voiceId);
  const providerVoiceId = row["provider_voice_id"];
  if (!providerVoiceId) throw new Error("voice_not_ready");

  const engine = getVoiceEngine(DEFAULT_VOICE_PROVIDER);
  const language = row["language"] ?? "en";
  const text = (args.text && args.text.trim()) || voiceSample(language);
  const { getProductionVoiceModel } = await import("@/lib/admin/voice-settings/models.server");
  const result = await engine.synthesize({
    text,
    voiceId: providerVoiceId,
    language,
    modelId: await getProductionVoiceModel(DEFAULT_VOICE_PROVIDER),
    style: args.style,
  });
  return {
    audioBase64: Buffer.from(result.audio).toString("base64"),
    mimeType: result.mimeType,
  };
}

/**
 * The authorized enrollment recording of one personal voice, together with the
 * exact sentence that was read aloud. A studio that clones from a recording
 * instead of holding a stored profile speaks with this and nothing else.
 */
export async function personalVoiceReference(
  userId: string,
  voiceId: string,
): Promise<{ bytes: Uint8Array; mime: string; text: string } | null> {
  const row = await readOwned(userId, voiceId);
  const samples = samplesOf(row);
  const sample = samples[0];
  if (!sample) return null;
  const { enrollmentText } = await import("./enrollment");
  const language = row["language"] ?? "en";
  const spoken = enrollmentText(language, sample.textId === "sample2" ? "sample2" : "sample1");
  const bytes = await downloadSample(sample);
  if (bytes.byteLength === 0) return null;
  return { bytes, mime: sample.mime || "audio/webm", text: spoken.text };
}

/** The cloned studio voice behind one profile, ready to speak any greeting. */
export async function resolvePersonalVoice(
  userId: string,
  voiceId: string,
): Promise<{ providerVoiceId: string; name: string; provider: string; language: string }> {
  const row = await readOwned(userId, voiceId);
  const providerVoiceId = row["provider_voice_id"];
  if (!providerVoiceId) throw new Error("voice_not_ready");
  return {
    providerVoiceId,
    name: row["display_name"] ?? "",
    provider: DEFAULT_VOICE_PROVIDER,
    language: row["language"] ?? "en",
  };
}

/** A voice profile can always be given a clearer name. */
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
 * Removes one personal voice profile completely: its cloned studio voice, its
 * stored samples and preview, its place in the library, and every assignment
 * still waiting in an unfinished project. Greetings that were already created
 * keep their finished audio.
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

  const providerVoiceId = row["provider_voice_id"];
  if (providerVoiceId) {
    const engine = getVoiceEngine(DEFAULT_VOICE_PROVIDER);
    if (engine.deleteClonedVoice) {
      await engine.deleteClonedVoice(providerVoiceId).catch(() => undefined);
    }
  }

  const samplePaths = samplesOf(row).map((sample) => sample.path);
  const otherPaths = [row["source_path"], row["processed_path"], row["preview_path"]].filter(
    (p): p is string => Boolean(p),
  );
  const paths = [...samplePaths, ...otherPaths];
  if (paths.length) await db.storage.from(VOICE_BUCKET).remove(paths);

  const { error } = await db
    .from("pvg_personal_voices")
    .delete()
    .eq("id", voiceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  return { affectedProjects: affected.size };
}

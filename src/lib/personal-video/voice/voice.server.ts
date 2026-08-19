// Server-only storage of the spoken greeting of one order: the audio file, its
// facts, and a testing record of every request that was made.

import { lookupVoice } from "./catalog";
import { getVoiceEngine, DEFAULT_VOICE_PROVIDER } from "./providers.server";
import { isPersonalVoiceRef, personalVoiceIdOf } from "./personal-voices";
import type { PvgVoiceover } from "./catalog";
import { isPlayablePvgVoiceover } from "./voice-asset";

const BUCKET = "generated-audio";
const SIGNED_TTL = 60 * 60 * 12;

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

async function signed(bucket: string, path: string): Promise<string | null> {
  const db = await admin();
  const res = await db.storage.from(bucket).createSignedUrl(path, SIGNED_TTL);
  return res.data?.signedUrl ?? null;
}

/**
 * The chosen voice: a personal cloned profile when the reference points at
 * one, the imported voice library next, and the built-in list afterwards, so
 * every kind of voice keeps its real name.
 */
async function resolveVoice(
  voiceId: string,
  userId?: string,
): Promise<{ id: string; name: string; provider: string }> {
  if (isPersonalVoiceRef(voiceId)) {
    const personalId = personalVoiceIdOf(voiceId);
    if (!personalId || !userId) throw new Error("voice_not_available");
    const { resolvePersonalVoice } = await import("./personal-voices.server");
    const personal = await resolvePersonalVoice(userId, personalId);
    return { id: personal.providerVoiceId, name: personal.name, provider: personal.provider };
  }

  const db = await admin();
  const { data } = await db
    .from("voice_library")
    .select("external_voice_id, name, display_name, provider, is_active")
    .eq("external_voice_id", voiceId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as Record<string, any> | null;
  if (row) {
    return {
      id: row["external_voice_id"],
      name: row["display_name"] || row["name"],
      provider: row["provider"] || DEFAULT_VOICE_PROVIDER,
    };
  }
  // The exact voice the person chose, or nothing at all — Project Joy never
  // speaks a greeting with a voice the person did not select.
  const known = lookupVoice(voiceId);
  if (!known) throw new Error("voice_not_available");
  return { id: known.id, name: known.name, provider: known.provider };
}

/** Testing record of one voice request — success or failure, always written. */
export async function logVoiceRequest(entry: {
  projectId: string;
  userId: string;
  provider: string;
  voiceId: string;
  language: string;
  characterCount: number;
  generationMs: number;
  success: boolean;
  errorMessage?: string | null;
}): Promise<void> {
  const db = await admin();
  await db.from("pvg_voice_logs").insert({
    project_id: entry.projectId,
    user_id: entry.userId,
    provider: entry.provider,
    voice_id: entry.voiceId,
    language: entry.language,
    character_count: entry.characterCount,
    generation_ms: entry.generationMs,
    success: entry.success,
    error_message: entry.errorMessage ?? null,
  });
  console.info(
    `[pvg-voice] order=${entry.projectId} provider=${entry.provider} voice=${entry.voiceId} ` +
      `language=${entry.language} characters=${entry.characterCount} ms=${entry.generationMs} ` +
      `result=${entry.success ? "success" : `error:${entry.errorMessage ?? "unknown"}`}`,
  );
}

/** The saved voice of one order, ready to be played again. */
export async function readVoiceover(projectId: string): Promise<PvgVoiceover | null> {
  const db = await admin();
  const { data } = await db
    .from("pvg_voiceovers")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as Record<string, any>;
  return {
    voiceId: row["voice_id"],
    voiceName: row["voice_name"] ?? lookupVoice(row["voice_id"])?.name ?? row["voice_id"],
    provider: row["provider"],
    language: row["language"],
    durationSeconds: Number(row["duration_seconds"] ?? 0),
    characterCount: Number(row["character_count"] ?? 0),
    generatedAt: row["generated_at"],
    modelId: row["model_id"] ?? "",
    modelLabel: row["model_label"] || (row["model_id"] ?? ""),
    creditsUsed: Number(row["credits_used"] ?? 0),
    audioUrl: await signed(row["storage_bucket"] ?? BUCKET, row["storage_path"]),
    greetingText: row["greeting_text"] ?? "",
    speechMode: row["speech_mode"] ?? "single",
    syncMode: row["sync_mode"] ?? null,
    trackSummary: Array.isArray(row["track_summary"]) ? row["track_summary"] : [],
  };
}

/**
 * Speaks one part of a greeting and hands it back without storing it. The
 * finished, merged recording of the order is saved separately.
 */
export async function synthesizeTrack(args: {
  projectId: string;
  userId: string;
  text: string;
  voiceId: string;
  language: string;
  /** Speaking pace, 1 = natural, up to 1.2 when the video is short. */
  speed?: number;
  /** How the greeting is delivered; only meaningful for cloned personal voices. */
  style?: string;
}): Promise<{
  audioBase64: string;
  mimeType: string;
  durationSeconds: number;
  voiceId: string;
  voiceName: string;
  provider: string;
  characterCount: number;
}> {
  const voice = await resolveVoice(args.voiceId, args.userId);
  const provider = voice.provider || DEFAULT_VOICE_PROVIDER;
  const engine = getVoiceEngine(provider);
  const text = args.text.trim();
  if (!text) throw new Error("greeting_required");
  const started = Date.now();
  const { getProductionVoiceModel } = await import("@/lib/admin/voice-settings/models.server");

  try {
    const result = await engine.synthesize({
      text,
      voiceId: voice.id,
      language: args.language,
      modelId: await getProductionVoiceModel(provider),
      speed: args.speed ?? 1,
      style: args.style,
    });
    await logVoiceRequest({
      projectId: args.projectId,
      userId: args.userId,
      provider,
      voiceId: voice.id,
      language: args.language,
      characterCount: text.length,
      generationMs: Date.now() - started,
      success: true,
    });
    return {
      audioBase64: Buffer.from(result.audio).toString("base64"),
      mimeType: result.mimeType,
      durationSeconds: result.durationSeconds,
      voiceId: voice.id,
      voiceName: voice.name,
      provider,
      characterCount: text.length,
    };
  } catch (error) {
    await logVoiceRequest({
      projectId: args.projectId,
      userId: args.userId,
      provider,
      voiceId: voice.id,
      language: args.language,
      characterCount: text.length,
      generationMs: Date.now() - started,
      success: false,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
    throw error;
  }
}

/**
 * Stores the finished recording of the order — one merged voice made of the
 * spoken parts or of several voices speaking together.
 */
export async function saveMergedVoiceover(args: {
  projectId: string;
  userId: string;
  audioBase64: string;
  mimeType: string;
  durationSeconds: number;
  characterCount: number;
  language: string;
  greetingText: string;
  voiceId: string;
  voiceName: string;
  provider: string;
  speechMode: string;
  syncMode: string | null;
  trackSummary: { label: string; durationSeconds: number; source: string }[];
}): Promise<PvgVoiceover> {
  const db = await admin();
  const audio = new Uint8Array(Buffer.from(args.audioBase64, "base64"));
  if (audio.byteLength === 0) throw new Error("voice_empty_response");

  const { data: previous } = await db
    .from("pvg_voiceovers")
    .select("storage_bucket, storage_path")
    .eq("project_id", args.projectId)
    .maybeSingle();

  const extension = args.mimeType.includes("wav") ? "wav" : "mp3";
  const path = `${args.userId}/${args.projectId}/voice-${Date.now()}.${extension}`;
  const upload = await db.storage
    .from(BUCKET)
    .upload(path, audio, { contentType: args.mimeType, upsert: true });
  if (upload.error) throw new Error(`voice_storage_failed:${upload.error.message}`);

  const generatedAt = new Date().toISOString();
  const { error } = await db.from("pvg_voiceovers").upsert(
    {
      project_id: args.projectId,
      user_id: args.userId,
      provider: args.provider,
      voice_id: args.voiceId,
      voice_name: args.voiceName,
      language: args.language,
      model_id: "",
      model_label: "",
      credits_used: 0,
      storage_bucket: BUCKET,
      storage_path: path,
      mime_type: args.mimeType,
      duration_seconds: args.durationSeconds,
      character_count: args.characterCount,
      greeting_text: args.greetingText,
      generated_at: generatedAt,
      speech_mode: args.speechMode,
      sync_mode: args.syncMode,
      track_summary: args.trackSummary,
    },
    { onConflict: "project_id" },
  );
  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    throw new Error(`voice_persistence_failed:${error.message}`);
  }

  const old = previous as { storage_bucket?: string; storage_path?: string } | null;
  if (old?.storage_path && old.storage_path !== path) {
    await db.storage.from(old.storage_bucket ?? BUCKET).remove([old.storage_path]);
  }

  const voiceover: PvgVoiceover = {
    voiceId: args.voiceId,
    voiceName: args.voiceName,
    provider: args.provider,
    language: args.language,
    durationSeconds: args.durationSeconds,
    characterCount: args.characterCount,
    generatedAt,
    modelId: "",
    modelLabel: "",
    creditsUsed: 0,
    audioUrl: await signed(BUCKET, path),
    greetingText: args.greetingText,
    speechMode: args.speechMode,
    syncMode: args.syncMode,
    trackSummary: args.trackSummary,
  };
  if (!isPlayablePvgVoiceover(voiceover)) throw new Error("voice_empty_response");
  return voiceover;
}

/**
 * Speaks the greeting of one order. A new version always replaces the previous
 * one: the old file is removed and the order keeps exactly one voice.
 */
export async function generateVoiceover(args: {
  projectId: string;
  userId: string;
  text: string;
  voiceId: string;
  language: string;
  provider?: string;
  /** How the greeting is delivered; only meaningful for cloned personal voices. */
  style?: string;
}): Promise<PvgVoiceover> {
  const db = await admin();
  const voice = await resolveVoice(args.voiceId, args.userId);
  const provider = args.provider || voice.provider || DEFAULT_VOICE_PROVIDER;
  const engine = getVoiceEngine(provider);
  const text = args.text.trim();
  const started = Date.now();

  if (!text) throw new Error("greeting_required");

  const { getProductionVoiceModelInfo } = await import("@/lib/admin/voice-settings/models.server");
  const model = await getProductionVoiceModelInfo(provider);
  const modelId = model.modelKey;

  let result;
  try {
    result = await engine.synthesize({
      text,
      voiceId: voice.id,
      language: args.language,
      modelId,
      style: args.style,
    });
  } catch (error) {
    await logVoiceRequest({
      projectId: args.projectId,
      userId: args.userId,
      provider,
      voiceId: voice.id,
      language: args.language,
      characterCount: text.length,
      generationMs: Date.now() - started,
      success: false,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
    throw error;
  }

  const { data: previous } = await db
    .from("pvg_voiceovers")
    .select("storage_bucket, storage_path")
    .eq("project_id", args.projectId)
    .maybeSingle();

  const path = `${args.userId}/${args.projectId}/voice-${Date.now()}.${result.extension}`;
  const upload = await db.storage
    .from(BUCKET)
    .upload(path, result.audio, { contentType: result.mimeType, upsert: true });
  if (upload.error) {
    await logVoiceRequest({
      projectId: args.projectId,
      userId: args.userId,
      provider,
      voiceId: voice.id,
      language: args.language,
      characterCount: text.length,
      generationMs: Date.now() - started,
      success: false,
      errorMessage: `voice_storage_failed:${upload.error.message}`,
    });
    throw new Error(`voice_storage_failed:${upload.error.message}`);
  }

  const generatedAt = new Date().toISOString();
  const { error } = await db.from("pvg_voiceovers").upsert(
    {
      project_id: args.projectId,
      user_id: args.userId,
      provider,
      voice_id: voice.id,
      voice_name: voice.name,
      language: args.language,
      model_id: result.modelId,
      model_label: model.label,
      credits_used: result.creditsUsed ?? Math.round(text.length * model.creditMultiplier),
      storage_bucket: BUCKET,
      storage_path: path,
      mime_type: result.mimeType,
      duration_seconds: result.durationSeconds,
      character_count: text.length,
      greeting_text: text,
      generated_at: generatedAt,
    },
    { onConflict: "project_id" },
  );
  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    await logVoiceRequest({
      projectId: args.projectId,
      userId: args.userId,
      provider,
      voiceId: voice.id,
      language: args.language,
      characterCount: text.length,
      generationMs: Date.now() - started,
      success: false,
      errorMessage: `voice_persistence_failed:${error.message}`,
    });
    throw new Error(`voice_persistence_failed:${error.message}`);
  }

  // Only after the new voice is safely stored is the old file removed.
  const old = previous as { storage_bucket?: string; storage_path?: string } | null;
  if (old?.storage_path && old.storage_path !== path) {
    await db.storage.from(old.storage_bucket ?? BUCKET).remove([old.storage_path]);
  }

  await logVoiceRequest({
    projectId: args.projectId,
    userId: args.userId,
    provider,
    voiceId: voice.id,
    language: args.language,
    characterCount: text.length,
    generationMs: Date.now() - started,
    success: true,
  });

  const voiceover: PvgVoiceover = {
    voiceId: voice.id,
    voiceName: voice.name,
    provider,
    language: args.language,
    durationSeconds: result.durationSeconds,
    characterCount: text.length,
    generatedAt,
    modelId: result.modelId,
    modelLabel: model.label,
    creditsUsed: result.creditsUsed ?? Math.round(text.length * model.creditMultiplier),
    audioUrl: await signed(BUCKET, path),
    greetingText: text,
  };
  if (!isPlayablePvgVoiceover(voiceover)) throw new Error("voice_empty_response");
  return voiceover;
}

/**
 * A short spoken sample of one voice. It is never stored and never touches the
 * voice already saved inside the order.
 */
export async function previewVoice(args: {
  voiceId: string;
  language: string;
  provider?: string;
  userId?: string;
  style?: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const { voiceSample } = await import("./catalog");
  const voice = await resolveVoice(args.voiceId, args.userId);
  const provider = args.provider || voice.provider || DEFAULT_VOICE_PROVIDER;
  const engine = getVoiceEngine(provider);
  const { getProductionVoiceModel } = await import("@/lib/admin/voice-settings/models.server");
  const result = await engine.synthesize({
    text: voiceSample(args.language),
    voiceId: voice.id,
    language: args.language,
    modelId: await getProductionVoiceModel(provider),
    style: args.style,
  });
  return {
    audioBase64: Buffer.from(result.audio).toString("base64"),
    mimeType: result.mimeType,
  };
}

/**
 * Stores the sound one film is built from: the greeting exactly as it was
 * spoken, followed by the silence that carries the scene to the chosen
 * length. It never replaces the saved greeting of the order.
 */
export async function storeRenderAudio(
  projectId: string,
  userId: string,
  audio: { bytes: Uint8Array; mimeType: string; extension: string },
): Promise<string | null> {
  const db = await admin();
  const path = `${userId}/${projectId}/render-${Date.now()}.${audio.extension}`;
  const upload = await db.storage
    .from(BUCKET)
    .upload(path, audio.bytes, { contentType: audio.mimeType, upsert: true });
  if (upload.error) return null;
  return signed(BUCKET, path);
}

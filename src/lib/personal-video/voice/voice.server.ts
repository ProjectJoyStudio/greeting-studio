// Server-only storage of the spoken greeting of one order: the audio file, its
// facts, and a testing record of every request that was made.

import { findVoice } from "./catalog";
import { getVoiceEngine, DEFAULT_VOICE_PROVIDER } from "./providers.server";
import type { PvgVoiceover } from "./catalog";

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
 * The chosen voice, looked up in the imported voice library first and in the
 * built-in list afterwards, so both kinds of voice keep their real name.
 */
async function resolveVoice(
  voiceId: string,
): Promise<{ id: string; name: string; provider: string }> {
  const db = await admin();
  const { data } = await db
    .from("voice_library")
    .select("external_voice_id, name, display_name, provider, is_active")
    .eq("external_voice_id", voiceId)
    .maybeSingle();
  const row = data as Record<string, any> | null;
  if (row) {
    return {
      id: row["external_voice_id"],
      name: row["display_name"] || row["name"],
      provider: row["provider"] || DEFAULT_VOICE_PROVIDER,
    };
  }
  const fallback = findVoice(voiceId);
  return { id: fallback.id, name: fallback.name, provider: fallback.provider };
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
  const row = data as Record<string, any>;
  return {
    voiceId: row['voice_id'],
    voiceName: row['voice_name'] ?? findVoice(row['voice_id']).name,
    provider: row['provider'],
    language: row['language'],
    durationSeconds: Number(row['duration_seconds'] ?? 0),
    characterCount: Number(row['character_count'] ?? 0),
    generatedAt: row['generated_at'],
    modelId: row['model_id'] ?? "",
    modelLabel: row['model_label'] || (row['model_id'] ?? ""),
    creditsUsed: Number(row['credits_used'] ?? 0),
    audioUrl: await signed(row['storage_bucket'] ?? BUCKET, row['storage_path']),
    greetingText: row['greeting_text'] ?? "",
  };
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
}): Promise<PvgVoiceover> {
  const db = await admin();
  const voice = await resolveVoice(args.voiceId);
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
    result = await engine.synthesize({ text, voiceId: voice.id, language: args.language, modelId });
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
  if (upload.error) throw new Error(upload.error.message);

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
  if (error) throw new Error(error.message);

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

  return {
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
}

/**
 * A short spoken sample of one voice. It is never stored and never touches the
 * voice already saved inside the order.
 */
export async function previewVoice(args: {
  voiceId: string;
  language: string;
  provider?: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const { voiceSample } = await import("./catalog");
  const voice = await resolveVoice(args.voiceId);
  const provider = args.provider || voice.provider || DEFAULT_VOICE_PROVIDER;
  const engine = getVoiceEngine(provider);
  const { getProductionVoiceModel } = await import("@/lib/admin/voice-settings/models.server");
  const result = await engine.synthesize({
    text: voiceSample(args.language),
    voiceId: voice.id,
    language: args.language,
    modelId: await getProductionVoiceModel(provider),
  });
  return {
    audioBase64: Buffer.from(result.audio).toString("base64"),
    mimeType: result.mimeType,
  };
}
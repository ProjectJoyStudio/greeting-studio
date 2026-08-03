// Server-only administrator voice tests. Test recordings live in their own
// place and are never written into a customer order.

import { getVoiceEngine } from "@/lib/personal-video/voice/providers.server";
import { findVoice } from "@/lib/personal-video/voice/catalog";

import { VOICE_TEST_BUCKET, VOICE_TEST_PREFIX } from "./types";
import type { VoiceTestRow } from "./types";

const SIGNED_TTL = 60 * 60 * 6;

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

export async function signTestAudio(bucket: string | null, path: string | null): Promise<string | null> {
  if (!path) return null;
  const db = await admin();
  const res = await db.storage.from(bucket ?? VOICE_TEST_BUCKET).createSignedUrl(path, SIGNED_TTL);
  return res.data?.signedUrl ?? null;
}

/** Runs one administrator test and stores it as an independent record. */
export async function runVoiceModelTest(args: {
  adminUserId: string;
  provider: string;
  modelKey: string;
  modelLabel: string;
  voiceId: string;
  language: string;
  text: string;
}): Promise<{ test: VoiceTestRow; audioUrl: string | null }> {
  const db = await admin();
  const engine = getVoiceEngine(args.provider);
  const voice = findVoice(args.voiceId);
  const text = args.text.trim();
  if (!text) throw new Error("text_required");
  const started = Date.now();

  const base = {
    admin_user_id: args.adminUserId,
    provider: args.provider,
    model_key: args.modelKey,
    model_label: args.modelLabel,
    voice_id: voice.id,
    voice_name: voice.name,
    language: args.language,
    text_content: text,
    character_count: text.length,
  };

  let result;
  try {
    result = await engine.synthesize({
      text,
      voiceId: voice.id,
      language: args.language,
      modelId: args.modelKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const { data } = await db
      .from("voice_model_tests")
      .insert({
        ...base,
        generation_ms: Date.now() - started,
        status: "error",
        error_message: message.slice(0, 500),
      })
      .select("*")
      .single();
    return { test: data as unknown as VoiceTestRow, audioUrl: null };
  }

  const path = `${VOICE_TEST_PREFIX}/${args.adminUserId}/${Date.now()}-${args.modelKey}.${result.extension}`;
  const upload = await db.storage
    .from(VOICE_TEST_BUCKET)
    .upload(path, result.audio, { contentType: result.mimeType, upsert: true });
  if (upload.error) throw new Error(upload.error.message);

  const { data, error } = await db
    .from("voice_model_tests")
    .insert({
      ...base,
      duration_seconds: result.durationSeconds,
      generation_ms: Date.now() - started,
      credits_used: result.creditsUsed ?? 0,
      storage_bucket: VOICE_TEST_BUCKET,
      storage_path: path,
      mime_type: result.mimeType,
      status: "success",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  return {
    test: data as unknown as VoiceTestRow,
    audioUrl: await signTestAudio(VOICE_TEST_BUCKET, path),
  };
}

/** Removes the stored recordings of the given tests, then the records. */
export async function deleteVoiceTests(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const db = await admin();
  const { data } = await db
    .from("voice_model_tests")
    .select("id, storage_bucket, storage_path")
    .in("id", ids);
  const rows = (data ?? []) as Array<{ storage_bucket: string | null; storage_path: string | null }>;
  const paths = rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length > 0) await db.storage.from(VOICE_TEST_BUCKET).remove(paths);
  const { error } = await db.from("voice_model_tests").delete().in("id", ids);
  if (error) throw new Error(error.message);
  return ids.length;
}
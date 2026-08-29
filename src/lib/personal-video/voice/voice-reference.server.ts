// Server-only: the authorized recording that represents one chosen voice.
//
// Some voice studios do not keep a stored profile — they reproduce a voice from
// a short reference recording that is sent with every request. Project Joy only
// ever sends recordings it already owns and is allowed to use: the permanently
// stored sample of a library voice, or the enrollment recording the customer
// made themselves. A voice is never replaced by a default one.

import { voiceSample } from "./catalog";
import { isPersonalVoiceRef, personalVoiceIdOf } from "./personal-voices";

/** A recording plus the exact sentence spoken in it. */
export interface VoiceReference {
  /** Data URI of the recording, accepted directly by the studio. */
  audio: string;
  text: string;
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

function dataUri(bytes: Uint8Array, mime: string): string {
  // Strip media-type parameters ("audio/webm;codecs=opus" -> "audio/webm"):
  // voice studios reject parameterized MIME types inside data URIs.
  const baseMime = (mime.split(";")[0] || "audio/webm").trim();
  return `data:${baseMime};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** The stored preview of one library voice, preferring the greeting language. */
async function libraryReference(
  externalVoiceId: string,
  language: string,
): Promise<VoiceReference | null> {
  const db = await admin();
  const { data: voiceRow } = await db
    .from("voice_library")
    .select("id")
    .eq("external_voice_id", externalVoiceId)
    .maybeSingle();
  const voiceRowId = (voiceRow as { id?: string } | null)?.id;
  if (!voiceRowId) return null;

  const { data } = await db
    .from("voice_previews")
    .select("language, storage_bucket, storage_path, mime_type, sample_text")
    .eq("voice_id", voiceRowId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as Record<string, any>[];
  if (rows.length === 0) return null;

  const code = language.slice(0, 2).toLowerCase();
  const row = rows.find((r) => r["language"] === code) ?? rows[0]!;
  const bucket = row["storage_bucket"] || "voice-previews";
  const res = await db.storage.from(bucket).download(row["storage_path"]);
  if (res.error || !res.data) return null;
  const bytes = new Uint8Array(await res.data.arrayBuffer());
  if (bytes.byteLength === 0) return null;

  const text = row["sample_text"] || voiceSample(row["language"] || code);
  return { audio: dataUri(bytes, row["mime_type"] || "audio/mpeg"), text };
}

/**
 * The recording that stands for the chosen voice, or null when Project Joy
 * holds none. A missing recording is never worked around — the caller fails
 * plainly instead of speaking with a different voice.
 */
export async function resolveVoiceReference(args: {
  /** The voice exactly as the customer chose it. */
  selection: string;
  userId?: string;
  language: string;
}): Promise<VoiceReference | null> {
  if (isPersonalVoiceRef(args.selection)) {
    const personalId = personalVoiceIdOf(args.selection);
    if (!personalId || !args.userId) return null;
    const { personalVoiceReference } = await import("./personal-voices.server");
    const own = await personalVoiceReference(args.userId, personalId);
    return own ? { audio: dataUri(own.bytes, own.mime), text: own.text } : null;
  }
  return libraryReference(args.selection, args.language);
}

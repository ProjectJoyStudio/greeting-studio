// Server-only voice library: importing every saved voice of the connected
// voice studio, preparing one permanent preview recording per language and
// keeping all of it inside Project Joy storage.

import { voiceSample } from "@/lib/personal-video/voice/catalog";
import { getVoiceEngine, DEFAULT_VOICE_PROVIDER } from "@/lib/personal-video/voice/providers.server";

import { PREVIEW_LANGUAGES, VOICE_PREVIEW_BUCKET, type LibraryVoice } from "./types";

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

function guessGender(labels: Record<string, string> | null | undefined, fallback: string): string {
  const value = (labels?.["gender"] ?? "").toLowerCase();
  const age = (labels?.["age"] ?? "").toLowerCase();
  // A child voice belongs to the children group, whatever else it says.
  if (age.includes("child") || age.includes("kid") || value.includes("child")) return "children";
  if (value.includes("female")) return "female";
  if (value.includes("male")) return "male";
  return fallback || "neutral";
}

interface ElevenVoice {
  voice_id: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  preview_url?: string | null;
  labels?: Record<string, string> | null;
  fine_tuning?: { language?: string | null } | null;
  verified_languages?: { language?: string }[] | null;
  high_quality_base_model_ids?: string[] | null;
}

const PERMISSION_HINT =
  "The saved voice list could not be read: the voice studio key is restricted and does not " +
  "allow reading voices. Open the voice studio account settings, edit this API key and give it " +
  '"Voices" → Read access (or use a key with full access), then run the import again. ' +
  "Speech generation itself keeps working with the current key.";

/** Every voice currently saved inside the connected voice studio account. */
async function fetchStudioVoices(): Promise<ElevenVoice[]> {
  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) throw new Error("voice_service_unavailable");
  const headers = { "xi-api-key": apiKey } as const;

  // Preferred paginated endpoint, with the legacy list as a fallback for keys
  // or accounts where the newer listing route is not available.
  const out: ElevenVoice[] = [];
  let page: string | null = null;
  let firstFailure: { status: number; detail: string } | null = null;

  for (let i = 0; i < 20; i += 1) {
    const url = new URL("https://api.elevenlabs.io/v2/voices");
    url.searchParams.set("page_size", "100");
    if (page) url.searchParams.set("next_page_token", page);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      firstFailure = { status: res.status, detail: (await res.text().catch(() => "")).slice(0, 300) };
      break;
    }
    const json = (await res.json()) as {
      voices?: ElevenVoice[];
      has_more?: boolean;
      next_page_token?: string | null;
    };
    out.push(...(json.voices ?? []));
    if (!json.has_more || !json.next_page_token) return out;
    page = json.next_page_token;
  }
  if (!firstFailure) return out;

  const legacy = await fetch("https://api.elevenlabs.io/v1/voices?show_legacy=true", { headers });
  if (legacy.ok) {
    const json = (await legacy.json()) as { voices?: ElevenVoice[] };
    return json.voices ?? [];
  }

  const detail = (await legacy.text().catch(() => "")) || firstFailure.detail;
  if (legacy.status === 401 || firstFailure.status === 401 || detail.includes("voices_read")) {
    throw new Error(PERMISSION_HINT);
  }
  throw new Error(`voice_import_failed:${legacy.status}:${detail.slice(0, 300)}`);
}

function rowToVoice(row: Record<string, any>, previews: Record<string, any>[]): LibraryVoice {
  return {
    id: row["id"],
    provider: row["provider"],
    externalVoiceId: row["external_voice_id"],
    name: row["name"],
    displayName: row["display_name"] ?? "",
    description: row["description"] ?? "",
    gender: row["gender"] ?? "",
    language: row["language"] ?? "",
    category: row["category"] ?? "",
    modelCompatibility: (row["model_compatibility"] ?? []) as string[],
    isActive: Boolean(row["is_active"]),
    sortOrder: Number(row["sort_order"] ?? 0),
    importedAt: row["imported_at"],
    previews: previews.map((p) => ({
      language: p["language"],
      audioUrl: p["signedUrl"] ?? null,
      durationSeconds: Number(p["duration_seconds"] ?? 0),
      characterCount: Number(p["character_count"] ?? 0),
      generatedAt: p["generated_at"],
    })),
  };
}

/** The stored voice library, with a playable link for every saved preview. */
export async function readLibrary(options?: {
  activeOnly?: boolean;
  /** Only voices that own a stored sample in every Project Joy language. */
  completePreviewsOnly?: boolean;
}): Promise<LibraryVoice[]> {
  const db = await admin();
  let query = db
    .from("voice_library")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (options?.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, any>[];
  if (rows.length === 0) return [];

  const { data: previewRows } = await db
    .from("voice_previews")
    .select("*")
    .in("voice_id", rows.map((r) => r["id"]));

  const byVoice = new Map<string, Record<string, any>[]>();
  for (const raw of (previewRows ?? []) as Record<string, any>[]) {
    const url = await signed(raw["storage_bucket"] ?? VOICE_PREVIEW_BUCKET, raw["storage_path"]);
    const list = byVoice.get(raw["voice_id"]) ?? [];
    list.push({ ...raw, signedUrl: url });
    byVoice.set(raw["voice_id"], list);
  }

  const voices = rows.map((row) => rowToVoice(row, byVoice.get(row["id"]) ?? []));
  if (!options?.completePreviewsOnly) return voices;
  // A voice is offered only when every language really has a playable sample,
  // so a person can never meet an empty preview button.
  return voices.filter((voice) =>
    PREVIEW_LANGUAGES.every((code) =>
      voice.previews.some((p) => p.language === code && Boolean(p.audioUrl)),
    ),
  );
}

/**
 * Creates and permanently stores one preview recording. This is the only place
 * the voice studio is ever asked for a sample — playback always uses the file.
 */
export async function generatePreview(voiceRowId: string, language: string): Promise<void> {
  const db = await admin();
  const { data } = await db.from("voice_library").select("*").eq("id", voiceRowId).maybeSingle();
  const row = data as Record<string, any> | null;
  if (!row) throw new Error("voice_not_found");

  const provider = row["provider"] || DEFAULT_VOICE_PROVIDER;
  const engine = getVoiceEngine(provider);
  const { getProductionVoiceModel } = await import("@/lib/admin/voice-settings/models.server");
  const text = voiceSample(language);

  const result = await engine.synthesize({
    text,
    voiceId: row["external_voice_id"],
    language,
    modelId: await getProductionVoiceModel(provider),
  });

  const path = `${provider}/${row["external_voice_id"]}/${language}.${result.extension}`;
  const upload = await db.storage
    .from(VOICE_PREVIEW_BUCKET)
    .upload(path, result.audio, { contentType: result.mimeType, upsert: true });
  if (upload.error) throw new Error(upload.error.message);

  const { error } = await db.from("voice_previews").upsert(
    {
      voice_id: voiceRowId,
      language,
      storage_bucket: VOICE_PREVIEW_BUCKET,
      storage_path: path,
      mime_type: result.mimeType,
      duration_seconds: result.durationSeconds,
      character_count: text.length,
      model_key: result.modelId,
      sample_text: text,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "voice_id,language" },
  );
  if (error) throw new Error(error.message);
}

/** Prepares every missing preview so playback never reaches the voice studio. */
export async function fillMissingPreviews(voiceRowIds?: string[]): Promise<{
  created: number;
  failed: number;
}> {
  const db = await admin();
  let query = db.from("voice_library").select("id").eq("is_active", true);
  if (voiceRowIds && voiceRowIds.length > 0) query = query.in("id", voiceRowIds);
  const { data } = await query;
  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
  if (ids.length === 0) return { created: 0, failed: 0 };

  const { data: existing } = await db
    .from("voice_previews")
    .select("voice_id, language")
    .in("voice_id", ids);
  const have = new Set(
    ((existing ?? []) as { voice_id: string; language: string }[]).map(
      (p) => `${p.voice_id}:${p.language}`,
    ),
  );

  let created = 0;
  let failed = 0;
  for (const id of ids) {
    for (const language of PREVIEW_LANGUAGES) {
      if (have.has(`${id}:${language}`)) continue;
      try {
        await generatePreview(id, language);
        created += 1;
      } catch (error) {
        failed += 1;
        console.warn(
          `[voice-library] preview failed voice=${id} language=${language}: ` +
            (error instanceof Error ? error.message : "unknown"),
        );
      }
    }
  }
  return { created, failed };
}

/** The stored sound files of one voice, with their size, as the storage sees them. */
async function storedFiles(
  provider: string,
  externalVoiceId: string,
): Promise<Map<string, number>> {
  const db = await admin();
  const folder = `${provider}/${externalVoiceId}`;
  const { data } = await db.storage.from(VOICE_PREVIEW_BUCKET).list(folder, { limit: 200 });
  const out = new Map<string, number>();
  for (const file of (data ?? []) as { name: string; metadata?: { size?: number } | null }[]) {
    out.set(`${folder}/${file.name}`, Number(file.metadata?.size ?? 0));
  }
  return out;
}

/** A preview counts as playable only when a real, non-empty file is behind it. */
const MIN_PREVIEW_BYTES = 1024;

/**
 * Checks every preview of every active voice — the record, the file and its
 * size — and prepares again anything that is missing or damaged. This is the
 * routine that keeps "Preview" working for every voice and every language.
 */
export async function verifyPreviews(voiceRowIds?: string[]): Promise<{
  checked: number;
  repaired: number;
  failed: number;
  hidden: number;
}> {
  const db = await admin();
  let query = db.from("voice_library").select("id, provider, external_voice_id").eq("is_active", true);
  if (voiceRowIds && voiceRowIds.length > 0) query = query.in("id", voiceRowIds);
  const { data } = await query;
  const voices = (data ?? []) as { id: string; provider: string; external_voice_id: string }[];
  if (voices.length === 0) return { checked: 0, repaired: 0, failed: 0, hidden: 0 };

  const { data: previewRows } = await db
    .from("voice_previews")
    .select("voice_id, language, storage_path")
    .in("voice_id", voices.map((v) => v.id));
  const rows = (previewRows ?? []) as { voice_id: string; language: string; storage_path: string }[];
  const byKey = new Map(rows.map((r) => [`${r.voice_id}:${r.language}`, r]));

  let checked = 0;
  let repaired = 0;
  let failed = 0;
  const unusable: string[] = [];

  for (const voice of voices) {
    const files = await storedFiles(voice.provider || DEFAULT_VOICE_PROVIDER, voice.external_voice_id);
    let voiceFailed = false;
    for (const language of PREVIEW_LANGUAGES) {
      checked += 1;
      const row = byKey.get(`${voice.id}:${language}`);
      const size = row ? (files.get(row.storage_path) ?? 0) : 0;
      if (row && size >= MIN_PREVIEW_BYTES) continue;
      try {
        await generatePreview(voice.id, language);
        repaired += 1;
      } catch (error) {
        failed += 1;
        voiceFailed = true;
        console.warn(
          `[voice-library] preview repair failed voice=${voice.id} language=${language}: ` +
            (error instanceof Error ? error.message : "unknown"),
        );
      }
    }
    // A voice whose sample cannot be prepared leaves the offered library, so no
    // silent preview button can ever appear for it.
    if (voiceFailed) unusable.push(voice.id);
  }
  if (unusable.length > 0) {
    await db.from("voice_library").update({ is_active: false } as never).in("id", unusable);
  }
  return { checked, repaired, failed, hidden: unusable.length };
}

/**
 * The playable sample of one voice in exactly one language. A missing or
 * damaged file is prepared again on the spot, so a person always hears the
 * voice in the language they are browsing in.
 */
export async function ensurePreviewUrl(
  externalVoiceId: string,
  language: string,
): Promise<{ url: string | null }> {
  const db = await admin();
  const code = language.slice(0, 2).toLowerCase();
  const { data } = await db
    .from("voice_library")
    .select("id, provider, external_voice_id")
    .eq("external_voice_id", externalVoiceId)
    .maybeSingle();
  const voice = data as { id: string; provider: string; external_voice_id: string } | null;
  if (!voice) throw new Error("voice_not_found");

  const files = await storedFiles(voice.provider || DEFAULT_VOICE_PROVIDER, voice.external_voice_id);
  const { data: rowData } = await db
    .from("voice_previews")
    .select("storage_bucket, storage_path")
    .eq("voice_id", voice.id)
    .eq("language", code)
    .maybeSingle();
  const row = rowData as { storage_bucket?: string; storage_path: string } | null;

  if (!row || (files.get(row.storage_path) ?? 0) < MIN_PREVIEW_BYTES) {
    await generatePreview(voice.id, code);
    const { data: fresh } = await db
      .from("voice_previews")
      .select("storage_bucket, storage_path")
      .eq("voice_id", voice.id)
      .eq("language", code)
      .maybeSingle();
    const made = fresh as { storage_bucket?: string; storage_path: string } | null;
    if (!made) throw new Error("voice_unavailable");
    return { url: await signed(made.storage_bucket ?? VOICE_PREVIEW_BUCKET, made.storage_path) };
  }
  return { url: await signed(row.storage_bucket ?? VOICE_PREVIEW_BUCKET, row.storage_path) };
}

/**
 * Imports every voice saved in the studio account. Existing settings — display
 * name, description and the active switch — are never overwritten.
 */
export async function importVoices(options?: { withPreviews?: boolean }): Promise<{
  imported: number;
  added: number;
  previewsCreated: number;
  previewsFailed: number;
}> {
  const db = await admin();
  const provider = DEFAULT_VOICE_PROVIDER;
  const studio = await fetchStudioVoices();

  const { data: current } = await db
    .from("voice_library")
    .select("id, external_voice_id")
    .eq("provider", provider);
  const known = new Set(
    ((current ?? []) as { external_voice_id: string }[]).map((r) => r.external_voice_id),
  );

  let added = 0;
  let index = 0;
  for (const voice of studio) {
    const labels = voice.labels ?? {};
    const verified = (voice.verified_languages ?? [])
      .map((l) => l.language)
      .filter(Boolean) as string[];
    const language =
      voice.fine_tuning?.language || verified[0] || labels["language"] || "";

    const payload: Record<string, unknown> = {
      provider,
      external_voice_id: voice.voice_id,
      name: voice.name ?? voice.voice_id,
      language,
      category: voice.category ?? "",
      labels,
      model_compatibility: voice.high_quality_base_model_ids ?? [],
      provider_preview_url: voice.preview_url ?? null,
      sort_order: index,
    };
    if (!known.has(voice.voice_id)) {
      // Only a brand-new voice receives the studio description and is enabled.
      // The voice type of a known voice is never overwritten: an administrator
      // may have moved it into the children group by hand.
      payload["gender"] = guessGender(labels, "");
      payload["description"] = voice.description ?? labels["description"] ?? "";
      payload["is_active"] = true;
      payload["imported_at"] = new Date().toISOString();
      added += 1;
    }

    const { error } = await db
      .from("voice_library")
      .upsert(payload as never, { onConflict: "provider,external_voice_id" });
    if (error) throw new Error(error.message);
    index += 1;
  }

  const previews =
    options?.withPreviews === false
      ? { repaired: 0, failed: 0 }
      : // Every newly imported voice automatically receives a sample in every
        // Project Joy language, and any damaged sample is prepared again.
        await verifyPreviews();

  return {
    imported: studio.length,
    added,
    previewsCreated: previews.repaired,
    previewsFailed: previews.failed,
  };
}

/** Administrator edits: display name, description, gender and availability. */
export async function updateVoice(
  voiceRowId: string,
  patch: {
    displayName?: string;
    description?: string;
    gender?: string;
    language?: string;
    isActive?: boolean;
  },
): Promise<void> {
  const db = await admin();
  const update: Record<string, unknown> = {};
  if (patch.displayName !== undefined) update["display_name"] = patch.displayName;
  if (patch.description !== undefined) update["description"] = patch.description;
  if (patch.gender !== undefined) update["gender"] = patch.gender;
  if (patch.language !== undefined) update["language"] = patch.language;
  if (patch.isActive !== undefined) update["is_active"] = patch.isActive;
  if (Object.keys(update).length === 0) return;
  const { error } = await db.from("voice_library").update(update as never).eq("id", voiceRowId);
  if (error) throw new Error(error.message);
}

/** Removes a voice from Project Joy only — the studio account is untouched. */
export async function removeVoice(voiceRowId: string): Promise<void> {
  const db = await admin();
  const { data } = await db
    .from("voice_previews")
    .select("storage_bucket, storage_path")
    .eq("voice_id", voiceRowId);
  const files = (data ?? []) as { storage_bucket: string; storage_path: string }[];
  if (files.length > 0) {
    await db.storage
      .from(files[0]!.storage_bucket || VOICE_PREVIEW_BUCKET)
      .remove(files.map((f) => f.storage_path));
  }
  const { error } = await db.from("voice_library").delete().eq("id", voiceRowId);
  if (error) throw new Error(error.message);
}
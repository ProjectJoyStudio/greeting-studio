// Server-only storage and health checks of the generator control centre.

import {
  GENERATOR_SETTINGS_KEY,
  mergeGeneratorSettings,
  type GeneratorControlSettings,
} from "./settings";
import { findGenerator, type CheckKind } from "./registry";

/**
 * Minimal database surface used here. The admin panel passes the client of the
 * signed-in administrator, so persistence never depends on a server-only key.
 */
export interface SettingsDb {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{ data: { value: unknown } | null; error: unknown }>;
      };
    };
    upsert: (
      values: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<{ error: unknown }>;
  };
}

async function admin(): Promise<SettingsDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SettingsDb;
}

function messageOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "unknown database error";
}

/**
 * The stored configuration is the single source of truth. Code defaults only
 * fill gaps for engines that were never configured.
 */
export async function readGeneratorSettings(db?: SettingsDb): Promise<GeneratorControlSettings> {
  const client = db ?? (await admin());
  const { data, error } = await client
    .from("app_settings")
    .select("value")
    .eq("key", GENERATOR_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw new Error(`Could not read generator settings: ${messageOf(error)}`);
  return mergeGeneratorSettings(data?.value ?? null);
}

/** Used by background routing, where no administrator session exists. */
export async function readGeneratorSettingsSafe(): Promise<GeneratorControlSettings> {
  try {
    return await readGeneratorSettings();
  } catch (err) {
    console.error("Generator settings could not be read; using defaults for this job.", err);
    return mergeGeneratorSettings(null);
  }
}

/** Saves and then re-reads, so the caller always receives what was stored. */
export async function writeGeneratorSettings(
  next: unknown,
  actorUserId: string,
  db?: SettingsDb,
): Promise<GeneratorControlSettings> {
  const client = db ?? (await admin());
  const merged = mergeGeneratorSettings(next);
  const { error } = await client
    .from("app_settings")
    .upsert(
      { key: GENERATOR_SETTINGS_KEY, value: merged, updated_by: actorUserId },
      { onConflict: "key" },
    );
  if (error) throw new Error(`Generator settings were not saved: ${messageOf(error)}`);
  return readGeneratorSettings(client);
}

// --- lightweight connection check -----------------------------------------

export type ConnectionState = "working" | "error" | "disabled" | "unknown";

export interface ConnectionResult {
  state: ConnectionState;
  /** Short, non-secret explanation. Never contains a key. */
  detail: string;
}

async function checkReplicate(model: string): Promise<ConnectionResult> {
  const token = process.env["REPLICATE_API_TOKEN"] || process.env["PVG_IMAGE_API_TOKEN"];
  if (!token) return { state: "error", detail: "No credential configured." };
  const res = await fetch(`https://api.replicate.com/v1/models/${model}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) return { state: "working", detail: "Provider and model reachable." };
  if (res.status === 401 || res.status === 403) {
    return { state: "error", detail: "The provider rejected the credential." };
  }
  if (res.status === 404) return { state: "error", detail: "The model was not found." };
  return { state: "error", detail: `Provider responded ${res.status}.` };
}

async function checkElevenLabs(): Promise<ConnectionResult> {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) return { state: "error", detail: "No credential configured." };
  const res = await fetch("https://api.elevenlabs.io/v1/models", {
    headers: { "xi-api-key": key },
  });
  if (res.ok) return { state: "working", detail: "Voice studio reachable." };
  return { state: "error", detail: `Voice studio responded ${res.status}.` };
}

async function checkLovableAi(): Promise<ConnectionResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { state: "error", detail: "No credential configured." };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.ok) return { state: "working", detail: "Service reachable." };
  return { state: "error", detail: `Service responded ${res.status}.` };
}

async function checkDeepl(): Promise<ConnectionResult> {
  const key = process.env["DEEPL_API_KEY"];
  if (!key) return { state: "error", detail: "No credential configured." };
  const free = key.endsWith(":fx");
  const res = await fetch(
    free ? "https://api-free.deepl.com/v2/usage" : "https://api.deepl.com/v2/usage",
    { headers: { Authorization: `DeepL-Auth-Key ${key}` } },
  );
  if (res.ok) return { state: "working", detail: "Translation service reachable." };
  return { state: "error", detail: `Translation service responded ${res.status}.` };
}

async function runCheck(kind: CheckKind, model: string): Promise<ConnectionResult> {
  switch (kind) {
    case "replicate":
      return checkReplicate(model);
    case "elevenlabs":
      return checkElevenLabs();
    case "lovable_ai":
      return checkLovableAi();
    case "deepl":
      return checkDeepl();
    default:
      return { state: "unknown", detail: "No lightweight check available." };
  }
}

/** Verifies one engine without running a paid customer generation. */
export async function checkGeneratorConnection(
  key: string,
  db?: SettingsDb,
): Promise<ConnectionResult> {
  const generator = findGenerator(key);
  if (!generator) return { state: "error", detail: "Unknown generator." };
  const settings = await readGeneratorSettings(db).catch(() => mergeGeneratorSettings(null));
  if (settings.generators[key]?.enabled === false) {
    return { state: "disabled", detail: "Switched off for new jobs." };
  }
  try {
    return await runCheck(generator.check, generator.model);
  } catch (err) {
    return {
      state: "error",
      detail:
        err instanceof Error ? err.message.slice(0, 160) : "The provider could not be reached.",
    };
  }
}

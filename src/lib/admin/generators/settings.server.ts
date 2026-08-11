// Server-only storage and health checks of the generator control centre.

import {
  GENERATOR_SETTINGS_KEY,
  mergeGeneratorSettings,
  type GeneratorControlSettings,
} from "./settings";
import { findGenerator, type CheckKind } from "./registry";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

export async function readGeneratorSettings(): Promise<GeneratorControlSettings> {
  try {
    const db = await admin();
    const { data } = await db
      .from("app_settings")
      .select("value")
      .eq("key", GENERATOR_SETTINGS_KEY)
      .maybeSingle();
    return mergeGeneratorSettings(data?.value ?? null);
  } catch {
    return mergeGeneratorSettings(null);
  }
}

export async function writeGeneratorSettings(
  next: unknown,
  actorUserId: string,
): Promise<GeneratorControlSettings> {
  const merged = mergeGeneratorSettings(next);
  const db = await admin();
  await db
    .from("app_settings")
    .upsert(
      { key: GENERATOR_SETTINGS_KEY, value: merged as never, updated_by: actorUserId },
      { onConflict: "key" },
    );
  return merged;
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
export async function checkGeneratorConnection(key: string): Promise<ConnectionResult> {
  const generator = findGenerator(key);
  if (!generator) return { state: "error", detail: "Unknown generator." };
  const settings = await readGeneratorSettings();
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

// Server-only lookup of the voice model the platform currently uses for every
// customer generation. The administrator changes it in the Admin Panel and the
// change takes effect on the very next generation, with no code change.

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

const FALLBACK: Record<string, string> = { elevenlabs: "eleven_multilingual_v2" };

/** The model every new customer voice is spoken with, for one provider. */
export async function getProductionVoiceModel(provider: string): Promise<string> {
  try {
    const db = await admin();
    const { data } = await db
      .from("voice_models")
      .select("model_key, provider")
      .eq("status", "production")
      .maybeSingle();
    const row = data as { model_key?: string; provider?: string } | null;
    if (row?.model_key && row.provider === provider) return row.model_key;
  } catch {
    // fall through to the safe default
  }
  return FALLBACK[provider] ?? "eleven_multilingual_v2";
}
// Server-only lookup of the voice model the platform currently uses for every
// customer generation. The administrator changes it in the Admin Panel and the
// change takes effect on the very next generation, with no code change.

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

const FALLBACK: Record<string, string> = { elevenlabs: "eleven_multilingual_v2" };

export interface ProductionVoiceModelInfo {
  modelKey: string;
  label: string;
  /** Voice credits charged per character, used when the studio reports none. */
  creditMultiplier: number;
}

/** Full facts about the model every new customer voice is spoken with. */
export async function getProductionVoiceModelInfo(
  provider: string,
): Promise<ProductionVoiceModelInfo> {
  try {
    const db = await admin();
    const { data } = await db
      .from("voice_models")
      .select("model_key, provider, label, credit_multiplier")
      .eq("status", "production")
      .maybeSingle();
    const row = data as
      | { model_key?: string; provider?: string; label?: string; credit_multiplier?: number }
      | null;
    if (row?.model_key && row.provider === provider) {
      return {
        modelKey: row.model_key,
        label: row.label ?? row.model_key,
        creditMultiplier: Number(row.credit_multiplier ?? 1),
      };
    }
  } catch {
    // fall through to the safe default
  }
  const key = FALLBACK[provider] ?? "eleven_multilingual_v2";
  return { modelKey: key, label: key, creditMultiplier: 1 };
}

/** The model every new customer voice is spoken with, for one provider. */
export async function getProductionVoiceModel(provider: string): Promise<string> {
  return (await getProductionVoiceModelInfo(provider)).modelKey;
}
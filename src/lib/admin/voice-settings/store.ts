// Administrator-only reading and writing of the voice models and voice tests.
// Every call is rejected by the database unless the caller is an administrator.
import { supabase } from "@/integrations/supabase/client";

import type { VoiceModelRow, VoiceModelStat, VoiceTestRow } from "./types";

const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listVoiceModels(): Promise<VoiceModelRow[]> {
  return (
    unwrap<VoiceModelRow[]>(
      await db.from("voice_models").select("*").order("provider").order("sort_order"),
    ) ?? []
  );
}

export async function setProductionVoiceModel(modelId: string): Promise<void> {
  unwrap(await db.rpc("admin_set_production_voice_model", { _model_id: modelId }));
}

export async function setVoiceModelStatus(
  modelId: string,
  status: "testing" | "disabled",
): Promise<void> {
  unwrap(await db.from("voice_models").update({ status }).eq("id", modelId));
}

export async function listVoiceTests(): Promise<VoiceTestRow[]> {
  return (
    unwrap<VoiceTestRow[]>(
      await db.from("voice_model_tests").select("*").order("created_at", { ascending: false }).limit(200),
    ) ?? []
  );
}

export async function updateVoiceTest(
  id: string,
  patch: { notes?: string | null; rating?: number | null; is_favorite?: boolean },
): Promise<void> {
  unwrap(await db.from("voice_model_tests").update(patch).eq("id", id));
}

export async function voiceModelStats(): Promise<VoiceModelStat[]> {
  return unwrap<VoiceModelStat[]>(await db.rpc("admin_voice_model_stats")) ?? [];
}
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { VoiceTestRow } from "./types";

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

/** Runs one administrator test generation and stores it on its own. */
export const runVoiceTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      provider: string;
      modelKey: string;
      modelLabel: string;
      voiceId: string;
      language: string;
      text: string;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ test: VoiceTestRow; audioUrl: string | null }> => {
    await assertAdmin(context as never);
    const { runVoiceModelTest } = await import("./voice-tests.server");
    return runVoiceModelTest({ adminUserId: context.userId, ...data });
  });

/** Fresh playable links for saved test recordings. */
export const signVoiceTests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { items: Array<{ id: string; bucket: string | null; path: string | null }> }) => input)
  .handler(async ({ data, context }): Promise<Record<string, string>> => {
    await assertAdmin(context as never);
    const { signTestAudio } = await import("./voice-tests.server");
    const out: Record<string, string> = {};
    for (const item of data.items.slice(0, 60)) {
      const url = await signTestAudio(item.bucket, item.path);
      if (url) out[item.id] = url;
    }
    return out;
  });

/** Deletes the chosen tests together with their recordings. */
export const deleteVoiceTestRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => input)
  .handler(async ({ data, context }): Promise<{ deleted: number }> => {
    await assertAdmin(context as never);
    const { deleteVoiceTests } = await import("./voice-tests.server");
    return { deleted: await deleteVoiceTests(data.ids) };
  });
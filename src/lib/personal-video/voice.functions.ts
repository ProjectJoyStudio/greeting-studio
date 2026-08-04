import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { PvgVoiceover } from "./voice/catalog";

async function assertOwner(
  supabase: { from: (table: string) => any },
  projectId: string,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from("pvg_projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!data || (data as { user_id: string }).user_id !== userId) throw new Error("project_not_found");
}

/** The saved voice of the order, so a returning person hears it again at once. */
export const getPvgVoiceover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<{ voiceover: PvgVoiceover | null }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { readVoiceover } = await import("./voice/voice.server");
    return { voiceover: await readVoiceover(data.projectId) };
  });

/** Speaks the greeting and replaces any earlier voice of the same order. */
export const generatePvgVoiceover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { projectId: string; text: string; voiceId: string; language: string }) => input,
  )
  .handler(async ({ data, context }): Promise<{ voiceover: PvgVoiceover }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { generateVoiceover } = await import("./voice/voice.server");
    const voiceover = await generateVoiceover({
      projectId: data.projectId,
      userId: context.userId,
      text: data.text,
      voiceId: data.voiceId,
      language: data.language,
    });
    return { voiceover };
  });

/** A short sample of one voice. It never creates or replaces the order audio. */
export const previewPvgVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string; language: string }) => input)
  .handler(async ({ data }): Promise<{ audioBase64: string; mimeType: string }> => {
    const { previewVoice } = await import("./voice/voice.server");
    return previewVoice({ voiceId: data.voiceId, language: data.language });
  });

/** Gives one participant a voice, or takes their voice away again. */
export const assignPvgPersonVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      personId: string;
      voiceId: string | null;
      voiceName?: string | null;
      provider?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { error } = await context.supabase
      .from("pvg_people")
      .update({
        voice_id: data.voiceId,
        voice_name: data.voiceId ? (data.voiceName ?? null) : null,
        voice_provider: data.voiceId ? (data.provider ?? null) : null,
      })
      .eq("id", data.personId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });
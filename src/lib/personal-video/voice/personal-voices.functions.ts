import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { PersonalVoice, PersonalVoiceScope } from "./personal-voices";

/** The permanent personal voice library shown in the dashboard. */
export const listMyVoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ voices: PersonalVoice[] }> => {
    const { listLibraryVoices } = await import("./personal-voices.server");
    return { voices: await listLibraryVoices(context.userId) };
  });

/** Everything one project may use: the library plus its own recordings. */
export const listProjectPersonalVoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<{ voices: PersonalVoice[] }> => {
    const { listProjectVoices } = await import("./personal-voices.server");
    return { voices: await listProjectVoices(context.userId, data.projectId) };
  });

/** Keeps a recorded or uploaded voice, in the project only or for good. */
export const savePersonalVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string | null;
      scope: PersonalVoiceScope;
      displayName: string;
      language: string;
      originalBase64: string;
      originalMime: string;
      extension: string;
      processedBase64: string;
      processedMime: string;
      durationSeconds: number;
      consentConfirmed: boolean;
      replaceVoiceId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ voice: PersonalVoice }> => {
    const { savePersonalVoice: save } = await import("./personal-voices.server");
    return { voice: await save({ ...data, userId: context.userId }) };
  });

/** Gives a saved voice a clearer name. */
export const renameMyVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string; displayName: string }) => input)
  .handler(async ({ data, context }): Promise<{ voice: PersonalVoice }> => {
    const { renamePersonalVoice } = await import("./personal-voices.server");
    return { voice: await renamePersonalVoice(context.userId, data.voiceId, data.displayName) };
  });

/** Removes a saved voice and frees every unfinished project that used it. */
export const deleteMyVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string }) => input)
  .handler(async ({ data, context }): Promise<{ affectedProjects: number }> => {
    const { deletePersonalVoice } = await import("./personal-voices.server");
    return deletePersonalVoice(context.userId, data.voiceId);
  });

/** Gives one participant a personal voice, or takes it away again. */
export const assignPersonalVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      personId: string;
      voiceId: string | null;
      voiceName?: string | null;
      style?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    const { data: project } = await context.supabase
      .from("pvg_projects")
      .select("id, user_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project || (project as { user_id: string }).user_id !== context.userId) {
      throw new Error("project_not_found");
    }
    if (data.voiceId) {
      const { data: owned } = await context.supabase
        .from("pvg_personal_voices")
        .select("id")
        .eq("id", data.voiceId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!owned) throw new Error("voice_not_found");
    }
    const { error } = await context.supabase
      .from("pvg_people")
      .update({
        personal_voice_id: data.voiceId,
        // A personal voice always replaces a Project Joy voice, never the
        // other way around: nothing is ever swapped back automatically.
        voice_id: null,
        voice_name: data.voiceId ? (data.voiceName ?? null) : null,
        voice_source: data.voiceId ? "recording" : null,
        voice_confirmed: Boolean(data.voiceId),
        speaking_style: data.voiceId ? (data.style ?? "natural") : null,
      })
      .eq("id", data.personId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });

/** The speaking style of one participant for this greeting only. */
export const savePersonalVoiceStyle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string; style: string }) => input)
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    const { error } = await context.supabase
      .from("pvg_people")
      .update({ speaking_style: data.style })
      .eq("id", data.personId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });
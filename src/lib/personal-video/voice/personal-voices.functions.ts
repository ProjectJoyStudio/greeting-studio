import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { PersonalVoice, PersonalVoiceScope } from "./personal-voices";

interface SampleInput {
  base64: string;
  mimeType: string;
  extension: string;
  durationSeconds: number;
  textId: string;
}

/** Clones a new reusable voice profile from 1-2 short enrollment samples. */
export const createVoiceProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string | null;
      scope: PersonalVoiceScope;
      displayName: string;
      language: string;
      consentConfirmed: boolean;
      samples: SampleInput[];
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ voice: PersonalVoice }> => {
    const { createVoiceProfile: create } = await import("./personal-voices.server");
    return { voice: await create({ ...data, userId: context.userId }) };
  });

/** Adds one more enrollment sample to an existing voice profile. */
export const addVoiceSample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string; sample: SampleInput }) => input)
  .handler(async ({ data, context }): Promise<{ voice: PersonalVoice }> => {
    const { addVoiceSample: add } = await import("./personal-voices.server");
    return {
      voice: await add({ voiceId: data.voiceId, sample: data.sample, userId: context.userId }),
    };
  });

/** A short spoken sample of one profile speaking fresh text, never stored. */
export const previewMyVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string; text?: string; style?: string }) => input)
  .handler(async ({ data, context }): Promise<{ audioBase64: string; mimeType: string }> => {
    const { previewPersonalVoice } = await import("./personal-voices.server");
    return previewPersonalVoice({ ...data, userId: context.userId });
  });

/** The permanent personal voice library shown in the dashboard. */
export const listMyVoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ voices: PersonalVoice[] }> => {
    const { listLibraryVoices } = await import("./personal-voices.server");
    return { voices: await listLibraryVoices(context.userId) };
  });

/** Everything one project may use: the library plus its own profiles. */
export const listProjectPersonalVoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<{ voices: PersonalVoice[] }> => {
    const { listProjectVoices } = await import("./personal-voices.server");
    return { voices: await listProjectVoices(context.userId, data.projectId) };
  });

/** Gives a saved voice profile a clearer name. */
export const renameMyVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string; displayName: string }) => input)
  .handler(async ({ data, context }): Promise<{ voice: PersonalVoice }> => {
    const { renamePersonalVoice } = await import("./personal-voices.server");
    return { voice: await renamePersonalVoice(context.userId, data.voiceId, data.displayName) };
  });

/** Removes a saved voice profile and frees every unfinished project that used it. */
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
    const { assertPvgOwner, assignPersonalVoiceToPerson } = await import(
      "./voice-actions.server"
    );
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    await assignPersonalVoiceToPerson(context.supabase, context.userId, data);
    return { saved: true as const };
  });

/** The speaking style of one participant for this greeting only. */
export const savePersonalVoiceStyle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string; style: string }) => input)
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    const { assertPvgOwner, savePersonalVoiceStyleForPerson } = await import(
      "./voice-actions.server"
    );
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    await savePersonalVoiceStyleForPerson(
      context.supabase,
      data.projectId,
      data.personId,
      data.style,
    );
    return { saved: true as const };
  });

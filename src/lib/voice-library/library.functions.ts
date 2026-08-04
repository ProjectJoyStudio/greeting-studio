import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { LibraryVoice } from "./types";

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

/** Every voice a person may choose from, with its permanently stored previews. */
export const listStudioVoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ voices: LibraryVoice[] }> => {
    const { readLibrary } = await import("./library.server");
    return { voices: await readLibrary({ activeOnly: true, completePreviewsOnly: true }) };
  });

/** The full library, including voices an administrator has switched off. */
export const adminListVoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ voices: LibraryVoice[] }> => {
    await assertAdmin(context as never);
    const { readLibrary } = await import("./library.server");
    return { voices: await readLibrary() };
  });

/** Reads the studio account again and adds any voice Project Joy does not know. */
export const adminImportVoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { withPreviews?: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { importVoices } = await import("./library.server");
    return importVoices({ withPreviews: data.withPreviews !== false });
  });

/** Prepares every preview that is still missing, in every supported language. */
export const adminFillPreviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { verifyPreviews } = await import("./library.server");
    return verifyPreviews(data.voiceId ? [data.voiceId] : undefined);
  });

/**
 * Checks every stored sample of every voice and prepares again anything that
 * is missing or damaged, in every Project Joy language.
 */
export const adminVerifyPreviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { verifyPreviews } = await import("./library.server");
    return verifyPreviews(data.voiceId ? [data.voiceId] : undefined);
  });

/**
 * The playable sample of one voice in the language a person is browsing in.
 * A missing or damaged sample is prepared again before it is handed back.
 */
export const ensureVoicePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string; language: string }) => input)
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const { ensurePreviewUrl } = await import("./library.server");
    return ensurePreviewUrl(data.voiceId, data.language);
  });

/** Creates the preview of one voice again, replacing the stored recording. */
export const adminRegeneratePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string; language: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { generatePreview } = await import("./library.server");
    await generatePreview(data.voiceId, data.language);
    return { done: true as const };
  });

/** Display name, description, voice type and the active switch. */
export const adminUpdateVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      voiceId: string;
      displayName?: string;
      description?: string;
      gender?: string;
      language?: string;
      isActive?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { updateVoice } = await import("./library.server");
    const { voiceId, ...patch } = data;
    await updateVoice(voiceId, patch);
    return { done: true as const };
  });

/** Removes the voice from Project Joy only — the studio account keeps it. */
export const adminDeleteVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voiceId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { removeVoice } = await import("./library.server");
    await removeVoice(data.voiceId);
    return { done: true as const };
  });
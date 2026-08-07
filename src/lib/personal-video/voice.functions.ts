import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { PvgVoiceover } from "./voice/catalog";
import type { PvgVoiceRecording } from "./voice/recordings";

async function assertOwner(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: unknown }> };
      };
    };
  },
  projectId: string,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from("pvg_projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!data || (data as { user_id: string }).user_id !== userId)
    throw new Error("project_not_found");
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
      /** Female, male or children — the group the voice was taken from. */
      category?: "female" | "male" | "children" | null;
      /** True when the person picked this voice themselves. */
      confirmed?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { error } = await context.supabase
      .from("pvg_people")
      .update({
        voice_id: data.voiceId,
        // A Project Joy voice always replaces a personal one, so a participant
        // never carries two voices at the same time.
        personal_voice_id: null,
        voice_name: data.voiceId ? (data.voiceName ?? null) : null,
        voice_provider: data.voiceId ? (data.provider ?? null) : null,
        voice_source: data.voiceId ? "library" : null,
        ...(data.category !== undefined ? { voice_category: data.category } : {}),
        voice_confirmed: data.voiceId ? Boolean(data.confirmed) : false,
      })
      .eq("id", data.personId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });

/**
 * The voice group of one participant, and whether the person has kept the
 * voice suggested for them. Project Joy never changes the group by itself.
 */
export const savePvgPersonVoiceChoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      personId: string;
      category?: "female" | "male" | "children" | null;
      confirmed?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const patch: { voice_category?: string | null; voice_confirmed?: boolean } = {};
    if (data.category !== undefined) patch.voice_category = data.category;
    if (data.confirmed !== undefined) patch.voice_confirmed = data.confirmed;
    if (Object.keys(patch).length === 0) return { saved: true as const };
    const { error } = await context.supabase
      .from("pvg_people")
      .update(patch)
      .eq("id", data.personId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });

/** How the greeting is spoken: one voice, separate parts or all together. */
export const savePvgSpeechSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      speechMode: "single" | "parts" | "chorus";
      syncMode: "simultaneous" | "delayed";
      chorusVoiceIds: string[];
      /** In "one voice" mode: the single participant who speaks. */
      speakerPersonId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { error } = await context.supabase
      .from("pvg_projects")
      .update({
        speech_mode: data.speechMode,
        sync_mode: data.syncMode,
        chorus_voice_ids: data.chorusVoiceIds.slice(0, 5),
        ...(data.speakerPersonId !== undefined
          ? { single_speaker_person_id: data.speakerPersonId }
          : {}),
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });

/** The part of the greeting one participant speaks. */
export const savePvgPersonPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string; partText: string }) => input)
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { error } = await context.supabase
      .from("pvg_people")
      .update({ part_text: data.partText })
      .eq("id", data.personId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });

/** Speaks one part of the greeting and returns it, without storing it. */
export const synthesizePvgTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      text: string;
      voiceId: string;
      language: string;
      speed?: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { synthesizeTrack } = await import("./voice/voice.server");
    return synthesizeTrack({
      projectId: data.projectId,
      userId: context.userId,
      text: data.text,
      voiceId: data.voiceId,
      language: data.language,
      speed: data.speed ?? 1,
    });
  });

/**
 * Shortens a greeting, without changing its meaning, so it can be spoken
 * calmly inside the time the chosen video leaves for speech.
 */
export const fitPvgGreetingToSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { projectId: string; text: string; budgetSeconds: number; language: string }) => input,
  )
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { shortenToBudget } = await import("./voice/fit.server");
    return { text: await shortenToBudget(data.text, data.budgetSeconds, data.language) };
  });

/** Stores the finished, merged recording of the whole greeting. */
export const savePvgMergedVoiceover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      audioBase64: string;
      mimeType: string;
      durationSeconds: number;
      characterCount: number;
      language: string;
      greetingText: string;
      voiceId: string;
      voiceName: string;
      provider: string;
      speechMode: "single" | "parts" | "chorus";
      syncMode: "simultaneous" | "delayed" | null;
      trackSummary: { label: string; durationSeconds: number; source: string }[];
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ voiceover: PvgVoiceover }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { saveMergedVoiceover } = await import("./voice/voice.server");
    return {
      voiceover: await saveMergedVoiceover({ ...data, userId: context.userId }),
    };
  });

/**
 * Keeps the recording a participant made or brought with their own voice: the
 * original exactly as it arrived and the version Project Joy prepared from it.
 */
export const savePvgPersonRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      personId: string;
      language: string;
      originalBase64: string;
      originalMime: string;
      extension: string;
      processedBase64: string;
      processedMime: string;
      durationSeconds: number;
      permissionConfirmed: boolean;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ recording: PvgVoiceRecording }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { savePersonRecording } = await import("./voice/recordings.server");
    return { recording: await savePersonRecording({ ...data, userId: context.userId }) };
  });

/** Every personal recording of one project, so nothing is ever lost. */
export const listPvgPersonRecordings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<{ recordings: PvgVoiceRecording[] }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { listRecordings } = await import("./voice/recordings.server");
    return { recordings: await listRecordings(data.projectId) };
  });

/** Confirms permission to use the voice heard in a personal recording. */
export const confirmPvgRecordingPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string; confirmed: boolean }) => input)
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { confirmRecordingPermission } = await import("./voice/recordings.server");
    await confirmRecordingPermission(data.projectId, data.personId, data.confirmed);
    return { saved: true as const };
  });

/** Removes the personal recording of one participant. */
export const deletePvgPersonRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string }) => input)
  .handler(async ({ data, context }): Promise<{ removed: true }> => {
    await assertOwner(context.supabase as never, data.projectId, context.userId);
    const { deletePersonRecording } = await import("./voice/recordings.server");
    await deletePersonRecording(data.projectId, data.personId);
    return { removed: true as const };
  });

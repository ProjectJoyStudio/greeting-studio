import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { PvgVoiceover } from "./voice/catalog";
import type { PvgVoiceRecording } from "./voice/recordings";

/** The saved voice of the order, so a returning person hears it again at once. */
export const getPvgVoiceover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<{ voiceover: PvgVoiceover | null }> => {
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
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
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
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
    const { assertPvgOwner, assignLibraryVoice } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    await assignLibraryVoice(context.supabase, data);
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
    const { assertPvgOwner, saveVoiceChoice } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    await saveVoiceChoice(context.supabase, data);
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
    const { assertPvgOwner, saveSpeechSettings } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    await saveSpeechSettings(context.supabase, data);
    return { saved: true as const };
  });

/** The part of the greeting one participant speaks. */
export const savePvgPersonPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string; partText: string }) => input)
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    const { assertPvgOwner, savePersonPart } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    await savePersonPart(context.supabase, data.projectId, data.personId, data.partText);
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
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
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
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
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
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
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
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    const { savePersonRecording } = await import("./voice/recordings.server");
    return { recording: await savePersonRecording({ ...data, userId: context.userId }) };
  });

/** Every personal recording of one project, so nothing is ever lost. */
export const listPvgPersonRecordings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<{ recordings: PvgVoiceRecording[] }> => {
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    const { listRecordings } = await import("./voice/recordings.server");
    return { recordings: await listRecordings(data.projectId) };
  });

/** Confirms permission to use the voice heard in a personal recording. */
export const confirmPvgRecordingPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string; confirmed: boolean }) => input)
  .handler(async ({ data, context }): Promise<{ saved: true }> => {
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    const { confirmRecordingPermission } = await import("./voice/recordings.server");
    await confirmRecordingPermission(data.projectId, data.personId, data.confirmed);
    return { saved: true as const };
  });

/** Removes the personal recording of one participant. */
export const deletePvgPersonRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string }) => input)
  .handler(async ({ data, context }): Promise<{ removed: true }> => {
    const { assertPvgOwner } = await import("./voice/voice-actions.server");
    await assertPvgOwner(context.supabase, data.projectId, context.userId);
    const { deletePersonRecording } = await import("./voice/recordings.server");
    await deletePersonRecording(data.projectId, data.personId);
    return { removed: true as const };
  });

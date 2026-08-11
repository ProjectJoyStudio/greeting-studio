import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { clampDuration } from "./video-setup";
import type { PvsVideoSetup } from "./video-setup";
import { normalizeMusicSettings, type PvgMusicSettings } from "@/lib/music/types";
import { writeGreeting, type GreetingTask } from "./video-setup.server";

/** Stores the settings of the preparation page — no credits are ever moved. */
export const savePvgVideoSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { projectId: string; music?: PvgMusicSettings | undefined } & Partial<PvsVideoSetup>) =>
      input,
  )
  .handler(async ({ data, context }) => {
    // Music belongs to the whole video and never changes the credit cost.
    const music = normalizeMusicSettings(data.music);
    const { error } = await context.supabase
      .from("pvg_projects")
      .update({
        video_duration_seconds: clampDuration(data.durationSeconds),
        greeting_mode: data.greetingMode === "keywords" ? "keywords" : "manual",
        greeting_text: data.greetingText ?? "",
        greeting_keywords: data.greetingKeywords ?? "",
        ...(data.music ? { music_settings: music as unknown as Record<string, never> } : {}),
        workflow_step: "video",
        order_cost: clampDuration(data.durationSeconds),
      })
      .eq("id", data.projectId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const { recordVersion } = await import("./order.server");
    const version = await recordVersion(data.projectId);
    return { saved: true as const, version, savedAt: new Date().toISOString() };
  });

/** Project Joy writes, shortens or expands the greeting for the chosen length. */
export const composePvgGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      task: GreetingTask;
      text?: string | undefined;
      keywords?: string | undefined;
      recipientName?: string | undefined;
      occasion?: string | undefined;
      durationSeconds: number;
      language?: string | undefined;
    }) => input,
  )
  .handler(async ({ data }) => ({
    text: await writeGreeting({
      task: data.task,
      text: data.text ?? "",
      keywords: data.keywords ?? "",
      recipientName: data.recipientName ?? "",
      occasion: data.occasion ?? "",
      durationSeconds: data.durationSeconds,
      language: data.language ?? "English",
    }),
  }));

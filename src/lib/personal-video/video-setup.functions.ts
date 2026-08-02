import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { clampDuration } from "./video-setup";
import type { PvsVideoSetup } from "./video-setup";
import { writeGreeting, type GreetingTask } from "./video-setup.server";

/** Stores the settings of the preparation page — no credits are ever moved. */
export const savePvgVideoSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string } & Partial<PvsVideoSetup>) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pvg_projects")
      .update({
        video_duration_seconds: clampDuration(data.durationSeconds),
        greeting_mode: data.greetingMode === "keywords" ? "keywords" : "manual",
        greeting_text: data.greetingText ?? "",
        greeting_keywords: data.greetingKeywords ?? "",
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { saved: true as const };
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

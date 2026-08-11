import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { GeneratorControlSettings } from "./settings";

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

/** Current generator control settings. */
export const loadGeneratorSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GeneratorControlSettings> => {
    await assertAdmin(context as never);
    const { readGeneratorSettings } = await import("./settings.server");
    return readGeneratorSettings();
  });

/** Stores the settings. They apply to NEW jobs only; running jobs continue. */
export const saveGeneratorSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { settings: unknown }) => input)
  .handler(async ({ data, context }): Promise<GeneratorControlSettings> => {
    await assertAdmin(context as never);
    const { writeGeneratorSettings } = await import("./settings.server");
    const { invalidateGeneratorSettings } = await import("./runtime.server");
    const saved = await writeGeneratorSettings(data.settings, context.userId);
    invalidateGeneratorSettings();
    return saved;
  });

/** Lightweight availability check of one engine. Never exposes credentials. */
export const checkGenerator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { checkGeneratorConnection } = await import("./settings.server");
    return checkGeneratorConnection(data.key);
  });

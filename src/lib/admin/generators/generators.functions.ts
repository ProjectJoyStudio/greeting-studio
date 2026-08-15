import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { GeneratorControlSettings } from "./settings";

type AdminContext = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  } & Record<string, unknown>;
  userId: string;
};

async function assertAdmin(context: AdminContext): Promise<void> {
  const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

/** Current generator control settings. */
export const loadGeneratorSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GeneratorControlSettings> => {
    await assertAdmin(context as never);
    const { readGeneratorSettings } = await import("./settings.server");
    return readGeneratorSettings(context.supabase as never);
  });

/** Stores the settings. They apply to NEW jobs only; running jobs continue. */
export const saveGeneratorSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { settings: unknown }) => input)
  .handler(async ({ data, context }): Promise<GeneratorControlSettings> => {
    await assertAdmin(context as never);
    const { writeGeneratorSettings } = await import("./settings.server");
    const { invalidateGeneratorSettings } = await import("./runtime.server");
    const saved = await writeGeneratorSettings(
      data.settings,
      context.userId,
      context.supabase as never,
    );
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
    try {
      return await checkGeneratorConnection(data.key, context.supabase as never);
    } catch (err) {
      return {
        state: "error" as const,
        detail: err instanceof Error ? err.message.slice(0, 200) : "The check could not be run.",
      };
    }
  });

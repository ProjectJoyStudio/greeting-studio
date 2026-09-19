// Administrator-only entry point for the decorations storage migration.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { DecorationMigrationItem } from "./decorations-migrate.server";

export const adminMigrateDecorationsToPrimary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ ok: boolean; items: DecorationMigrationItem[]; error?: string }> => {
      const { data: isAdmin } = await (
        context.supabase as unknown as {
          rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
        }
      ).rpc("is_admin", { _user_id: context.userId });
      if (isAdmin !== true) return { ok: false, items: [], error: "forbidden" };

      const { migrateDecorationsToPrimary } = await import("./decorations-migrate.server");
      return await migrateDecorationsToPrimary();
    },
  );

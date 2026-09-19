import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { MusicMigrationItem } from "./music-migrate.server";

/** Administrator-only: moves the Project Joy music library to the working area. */
export const adminMigrateMusicLibraryToPrimary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ ok: boolean; items: MusicMigrationItem[]; error?: string }> => {
      const { data: isAdmin } = await context.supabase.rpc("is_admin", {
        _user_id: context.userId,
      });
      if (isAdmin !== true) return { ok: false, items: [], error: "forbidden" };
      const { migrateMusicLibraryToPrimary } = await import("./music-migrate.server");
      return await migrateMusicLibraryToPrimary();
    },
  );

// The Memory Book price list, as the app and the administrator see it.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_TARIFF_DEFAULTS,
  MEMORY_BOOK_TARIFF_KEYS,
  type MemoryBookTariffKey,
  type MemoryBookTariffs,
} from "./tariffs";

/** Prices shown to anyone looking at the Memory Book offer. */
export const getMemoryBookPrices = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ prices: MemoryBookTariffs }> => {
    const { memoryBookTariffs } = await import("./tariffs.server");
    return { prices: await memoryBookTariffs() };
  },
);

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data: isAdmin } = await (
    context.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    }
  ).rpc("is_admin", { _user_id: context.userId });
  if (isAdmin !== true) throw new Error("forbidden");
}

/** The administrator reads the current values before changing anything. */
export const getMemoryBookTariffsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ prices: MemoryBookTariffs; defaults: MemoryBookTariffs }> => {
      await assertAdmin(context);
      const { memoryBookTariffs } = await import("./tariffs.server");
      return {
        prices: await memoryBookTariffs(),
        defaults: { ...MEMORY_BOOK_TARIFF_DEFAULTS },
      };
    },
  );

/** The administrator saves the Memory Book price list explicitly. */
export const setMemoryBookTariffs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prices: Record<string, number> }) => {
    const prices: Partial<Record<MemoryBookTariffKey, number>> = {};
    for (const key of MEMORY_BOOK_TARIFF_KEYS) {
      const raw = Number(input?.prices?.[key]);
      if (!Number.isFinite(raw) || raw < 0 || raw > 100000) continue;
      prices[key] = Math.round(raw);
    }
    return { prices };
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; prices?: MemoryBookTariffs; error?: string }> => {
      await assertAdmin(context);
      if (Object.keys(data.prices).length === 0) return { ok: false, error: "invalid" };
      const { memoryBookTariffs, saveMemoryBookTariffs } = await import("./tariffs.server");
      const before = await memoryBookTariffs();
      const prices = await saveMemoryBookTariffs(data.prices, context.userId);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_user_id: context.userId,
        action: "memory_book.tariffs_updated",
        entity_type: "tariff_settings",
        entity_id: null,
        previous_data: before as never,
        new_data: prices as never,
      });
      return { ok: true, prices };
    },
  );

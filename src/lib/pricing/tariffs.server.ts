// Server-only access to the central Project Joy tariff table.
//
// Reading never fails the caller: when a value was never saved, the starting
// value of that price is used, so a missing row can never block a purchase.

import {
  MEMORY_BOOK_TARIFF_KEYS,
  normalizeMemoryBookTariffs,
  type MemoryBookTariffKey,
  type MemoryBookTariffs,
} from "./tariffs";

const TABLE = "tariff_settings";
const PRODUCT = "memory_book";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as { from: (table: string) => any };
}

/** The complete, currently valid Memory Book price list. */
export async function memoryBookTariffs(): Promise<MemoryBookTariffs> {
  try {
    const client = await db();
    const { data } = await client.from(TABLE).select("key, credits").eq("product", PRODUCT);
    const stored: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ key: string; credits: number }>) {
      stored[row.key] = Number(row.credits);
    }
    return normalizeMemoryBookTariffs(stored);
  } catch {
    return normalizeMemoryBookTariffs(null);
  }
}

/** One current price, by its key. */
export async function memoryBookTariff(key: MemoryBookTariffKey): Promise<number> {
  const all = await memoryBookTariffs();
  return all[key];
}

/** Saves the Memory Book price list. Only complete, valid values are stored. */
export async function saveMemoryBookTariffs(
  values: Partial<Record<MemoryBookTariffKey, number>>,
  updatedBy: string,
): Promise<MemoryBookTariffs> {
  const client = await db();
  const rows = MEMORY_BOOK_TARIFF_KEYS.filter((key) => {
    const value = Number(values[key]);
    return Number.isFinite(value) && value >= 0 && value <= 100000;
  }).map((key) => ({
    product: PRODUCT,
    key,
    credits: Math.round(Number(values[key])),
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length > 0) {
    const { error } = await client.from(TABLE).upsert(rows, { onConflict: "product,key" });
    if (error) throw new Error(error.message);
  }
  return await memoryBookTariffs();
}

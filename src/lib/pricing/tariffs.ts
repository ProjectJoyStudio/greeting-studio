// Client-safe description of the Project Joy tariff system.
//
// One central place holds the credit prices of Project Joy. Today only the
// Memory Book is connected to it; other products keep their own values until
// they are connected separately, later.
//
// The values below are ONLY the starting values. Whatever an administrator
// saves wins, and a saved price applies to new purchases from that moment on:
// nothing a customer already paid for is ever recalculated.

export type TariffProduct = "memory_book";

export const MEMORY_BOOK_TARIFF_KEYS = [
  "package_mb_5",
  "package_mb_10",
  "package_mb_15",
  "extra_leaf_standard",
  "extra_leaf_video",
  "improve_pack",
  "storage_week",
  "storage_month",
] as const;

export type MemoryBookTariffKey = (typeof MEMORY_BOOK_TARIFF_KEYS)[number];

/** The values Project Joy has been using so far. */
export const MEMORY_BOOK_TARIFF_DEFAULTS: Record<MemoryBookTariffKey, number> = {
  package_mb_5: 60,
  package_mb_10: 90,
  package_mb_15: 110,
  extra_leaf_standard: 5,
  extra_leaf_video: 8,
  improve_pack: 3,
  storage_week: 3,
  storage_month: 10,
};

export type MemoryBookTariffs = Record<MemoryBookTariffKey, number>;

/** A whole, valid price list, whatever the stored values look like. */
export function normalizeMemoryBookTariffs(
  input: Partial<Record<string, unknown>> | null | undefined,
): MemoryBookTariffs {
  const out = { ...MEMORY_BOOK_TARIFF_DEFAULTS };
  for (const key of MEMORY_BOOK_TARIFF_KEYS) {
    const raw = Number(input?.[key]);
    if (Number.isFinite(raw) && raw >= 0 && raw <= 100000) out[key] = Math.round(raw);
  }
  return out;
}

/** The package price key of one Memory Book package. */
export function packageTariffKey(packageCode: string): MemoryBookTariffKey | null {
  if (packageCode === "mb_5") return "package_mb_5";
  if (packageCode === "mb_10") return "package_mb_10";
  if (packageCode === "mb_15") return "package_mb_15";
  return null;
}

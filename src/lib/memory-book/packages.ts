// ---------------------------------------------------------------------------
// Memory Book — Stage 1 catalogue.
// Prices and capacities of the three main packages, plus the display-only
// extras (additional leaves and additional storage) and the credit price used
// by the Buy Credits slider. Shared by the page and the server functions so
// the price can never differ between what is shown and what is charged.
// ---------------------------------------------------------------------------

export interface MemoryBookPackage {
  code: "mb_5" | "mb_10" | "mb_15";
  leaves: number;
  internalPages: number;
  videos: number;
  credits: number;
  euro: number;
}

export const MEMORY_BOOK_PACKAGES: MemoryBookPackage[] = [
  { code: "mb_5", leaves: 5, internalPages: 10, videos: 2, credits: 70, euro: 35 },
  { code: "mb_10", leaves: 10, internalPages: 20, videos: 3, credits: 110, euro: 55 },
  { code: "mb_15", leaves: 15, internalPages: 30, videos: 5, credits: 158, euro: 79 },
];

export const MEMORY_BOOK_MAX_LEAVES = 15;
export const MEMORY_BOOK_MAX_PAGES = 30;
export const MEMORY_BOOK_MAX_VIDEOS = 5;

/** Display-only extras for this stage. */
export const EXTRA_LEAF_STANDARD = { credits: 12, euro: 6 };
export const EXTRA_LEAF_VIDEO = { credits: 15, euro: 7.5 };
export const EXTRA_STORAGE_WEEK = { credits: 3, euro: 1.5 };
export const EXTRA_STORAGE_MONTH = { credits: 10, euro: 5 };

/** Buy Credits slider. 1 credit = 0.50 €. */
export const CREDIT_MIN = 20;
export const CREDIT_MAX = 1000;
export const CREDIT_STEP = 10;
export const CREDIT_EURO_CENTS = 50;
/** Fixed gift added by the very first successfully confirmed credit payment. */
export const FIRST_PURCHASE_BONUS_CREDITS = 4;

export const creditsToEuro = (credits: number) => (credits * CREDIT_EURO_CENTS) / 100;

export const findPackage = (code: string) =>
  MEMORY_BOOK_PACKAGES.find((p) => p.code === code) ?? null;

export const formatEuro = (value: number) =>
  Number.isInteger(value) ? `${value} €` : `${value.toFixed(2)} €`;

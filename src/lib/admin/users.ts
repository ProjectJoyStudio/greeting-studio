import type { Lang } from "@/lib/i18n";

export type AccountStatus = "active" | "inactive" | "blocked" | "suspended";
export const ACCOUNT_STATUSES: AccountStatus[] = ["active", "inactive", "blocked", "suspended"];

export type SubscriptionType = "none" | "monthly" | "yearly";
export const SUBSCRIPTION_TYPES: SubscriptionType[] = ["none", "monthly", "yearly"];

export const STATUS_TONE: Record<AccountStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-200",
  inactive: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-200",
  blocked: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-200",
  suspended: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200",
};

export const SUBSCRIPTION_TONE: Record<SubscriptionType, string> = {
  none: "bg-slate-500/10 text-slate-700 border-slate-500/25 dark:text-slate-200",
  monthly: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-200",
  yearly: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-200",
};

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  country: string; // ISO alpha-2
  language: Lang;
  registrationDate: string; // ISO
  status: AccountStatus;
  creditsBalance: number;
  creditsPurchased: number;
  creditsUsed: number;
  subscription: SubscriptionType;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  totalOrders: number;
}

export const COUNTRY_CODES = ["US", "GB", "DE", "FR", "PL", "UA", "RU", "IT", "ES", "NL", "CA", "AU", "CH", "AT"] as const;

export const DEMO_USERS: UserRecord[] = [
  {
    id: "USR-100001",
    fullName: "Anna Kowalska",
    email: "anna.kowalska@example.com",
    country: "PL",
    language: "pl",
    registrationDate: "2025-09-14T10:22:00.000Z",
    status: "active",
    creditsBalance: 42,
    creditsPurchased: 120,
    creditsUsed: 78,
    subscription: "monthly",
    subscriptionStart: "2026-06-01T00:00:00.000Z",
    subscriptionEnd: "2026-08-01T00:00:00.000Z",
    totalOrders: 7,
  },
  {
    id: "USR-100002",
    fullName: "Oleksii Marchenko",
    email: "oleksii.m@example.com",
    country: "UA",
    language: "uk",
    registrationDate: "2025-11-02T18:41:00.000Z",
    status: "active",
    creditsBalance: 15,
    creditsPurchased: 60,
    creditsUsed: 45,
    subscription: "yearly",
    subscriptionStart: "2026-01-10T00:00:00.000Z",
    subscriptionEnd: "2027-01-10T00:00:00.000Z",
    totalOrders: 12,
  },
  {
    id: "USR-100003",
    fullName: "Julia Becker",
    email: "julia.becker@example.com",
    country: "DE",
    language: "de",
    registrationDate: "2026-01-19T09:05:00.000Z",
    status: "inactive",
    creditsBalance: 3,
    creditsPurchased: 30,
    creditsUsed: 27,
    subscription: "none",
    subscriptionStart: null,
    subscriptionEnd: null,
    totalOrders: 3,
  },
  {
    id: "USR-100004",
    fullName: "Élise Laurent",
    email: "elise.laurent@example.com",
    country: "FR",
    language: "fr",
    registrationDate: "2026-03-08T14:12:00.000Z",
    status: "active",
    creditsBalance: 88,
    creditsPurchased: 200,
    creditsUsed: 112,
    subscription: "monthly",
    subscriptionStart: "2026-06-08T00:00:00.000Z",
    subscriptionEnd: "2026-07-08T00:00:00.000Z",
    totalOrders: 18,
  },
  {
    id: "USR-100005",
    fullName: "Michael Brown",
    email: "m.brown@example.com",
    country: "US",
    language: "en",
    registrationDate: "2025-08-01T20:30:00.000Z",
    status: "suspended",
    creditsBalance: 0,
    creditsPurchased: 45,
    creditsUsed: 45,
    subscription: "none",
    subscriptionStart: null,
    subscriptionEnd: null,
    totalOrders: 5,
  },
  {
    id: "USR-100006",
    fullName: "Dmitry Sokolov",
    email: "d.sokolov@example.com",
    country: "RU",
    language: "ru",
    registrationDate: "2026-02-25T07:14:00.000Z",
    status: "blocked",
    creditsBalance: 12,
    creditsPurchased: 30,
    creditsUsed: 18,
    subscription: "none",
    subscriptionStart: null,
    subscriptionEnd: null,
    totalOrders: 2,
  },
  {
    id: "USR-100007",
    fullName: "Sophie Turner",
    email: "sophie.turner@example.com",
    country: "GB",
    language: "en",
    registrationDate: "2026-05-11T11:00:00.000Z",
    status: "active",
    creditsBalance: 27,
    creditsPurchased: 90,
    creditsUsed: 63,
    subscription: "yearly",
    subscriptionStart: "2026-05-11T00:00:00.000Z",
    subscriptionEnd: "2027-05-11T00:00:00.000Z",
    totalOrders: 9,
  },
];

export function makeTestUser(): UserRecord {
  const n = Math.floor(100_000 + Math.random() * 900_000);
  return {
    id: `USR-${n}`,
    fullName: `Test User ${n}`,
    email: `test.user.${n}@example.com`,
    country: "US",
    language: "en",
    registrationDate: new Date().toISOString(),
    status: "active",
    creditsBalance: 10,
    creditsPurchased: 10,
    creditsUsed: 0,
    subscription: "none",
    subscriptionStart: null,
    subscriptionEnd: null,
    totalOrders: 0,
  };
}

export function isEmailUnique(users: UserRecord[], email: string, ignoreId?: string): boolean {
  const e = email.trim().toLowerCase();
  return !users.some((u) => u.email.trim().toLowerCase() === e && u.id !== ignoreId);
}

export function validateUser(
  users: UserRecord[],
  draft: UserRecord,
  ignoreId?: string,
): Partial<Record<"fullName" | "email" | "country" | "language", string>> {
  const errors: Partial<Record<"fullName" | "email" | "country" | "language", string>> = {};
  if (!draft.fullName.trim()) errors.fullName = "err_name";
  if (!draft.email.trim()) errors.email = "err_email";
  else if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) errors.email = "err_email_format";
  else if (!isEmailUnique(users, draft.email, ignoreId)) errors.email = "err_email_unique";
  if (!draft.country.trim()) errors.country = "err_country";
  if (!draft.language) errors.language = "err_language";
  return errors;
}
import type { Lang } from "@/lib/i18n";

export type AccountStatus = "active" | "inactive" | "blocked" | "suspended";
export const ACCOUNT_STATUSES: AccountStatus[] = ["active", "inactive", "blocked", "suspended"];

export type SubscriptionType = "none" | "monthly" | "yearly";
export const SUBSCRIPTION_TYPES: SubscriptionType[] = ["none", "monthly", "yearly"];

export type VipTier = "none" | "vip" | "premium" | "top";
export const VIP_TIERS: VipTier[] = ["none", "vip", "premium", "top"];

export const VIP_TONE: Record<VipTier, string> = {
  none: "",
  vip: "bg-amber-500/15 text-amber-800 border-amber-500/40 dark:text-amber-200",
  premium: "bg-violet-500/15 text-violet-800 border-violet-500/40 dark:text-violet-200",
  top: "bg-rose-500/15 text-rose-800 border-rose-500/40 dark:text-rose-200",
};

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
  vipTier?: VipTier;
  lastLoginAt?: string;
  lastIp?: string;
  lastDevice?: string;
  totalSpent?: number;
  currency?: string;
}

// ---- Advanced profile demonstration models ----

export type UserOrderStatus =
  | "draft" | "waiting_payment" | "paid" | "in_queue"
  | "processing" | "ready" | "delivered" | "cancelled";

export interface UserOrderEntry {
  id: string;
  product: string; // localization key like 'prod_song'
  credits: number;
  status: UserOrderStatus;
  queuePosition: number | null;
  estimateKey: string; // e.g. 'est_10m'
  createdAt: string;
}

export type CreditTxType = "purchased" | "bonus" | "used" | "refund";
export interface CreditTxEntry {
  id: string;
  date: string;
  type: CreditTxType;
  credits: number; // positive/negative
  balanceAfter: number;
  description: string;
}

export type SubHistoryStatus = "active" | "renewed" | "expired" | "cancelled";
export interface SubHistoryEntry {
  id: string;
  plan: SubscriptionType; // monthly | yearly
  startDate: string;
  endDate: string;
  status: SubHistoryStatus;
}

export type NotifChannel = "email" | "sms" | "push" | "system";
export type NotifStatus = "delivered" | "pending" | "failed";
export interface NotifEntry {
  id: string;
  date: string;
  channel: NotifChannel;
  subject: string;
  status: NotifStatus;
}

export interface InternalNote {
  id: string;
  date: string;
  author: string;
  text: string;
}

export type ActivityKind =
  | "registered" | "purchased_credits" | "created_order" | "cancelled_order"
  | "subscription_purchased" | "password_changed" | "language_changed" | "login";
export interface ActivityEntry {
  id: string;
  date: string;
  kind: ActivityKind;
  details?: string;
}

export interface EnrichedUser extends UserRecord {
  orders: UserOrderEntry[];
  credits: CreditTxEntry[];
  subscriptions: SubHistoryEntry[];
  notifications: NotifEntry[];
  activity: ActivityEntry[];
}

export const ORDER_STATUS_TONE: Record<UserOrderStatus, string> = {
  draft: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-200",
  waiting_payment: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200",
  paid: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-200",
  in_queue: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-200",
  processing: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-200",
  ready: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-200",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-200",
  cancelled: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-200",
};

export const NOTIF_STATUS_TONE: Record<NotifStatus, string> = {
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-200",
  pending: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200",
  failed: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-200",
};

export const SUB_HISTORY_TONE: Record<SubHistoryStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-200",
  renewed: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-200",
  expired: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-200",
  cancelled: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-200",
};

// Deterministic PRNG (seeded by user id).
function seedFrom(id: string): () => number {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const PRODUCTS = ["prod_card", "prod_animated", "prod_song", "prod_video", "prod_cartoon", "prod_premium", "prod_individual"] as const;
const O_STATUSES: UserOrderStatus[] = ["delivered", "delivered", "ready", "processing", "in_queue", "paid", "cancelled"];
const ESTIMATES = ["est_10m", "est_30m", "est_2h", "est_1d"] as const;

function shift(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function enrichUser(u: UserRecord): EnrichedUser {
  const rnd = seedFrom(u.id);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];

  const orderCount = Math.max(0, Math.min(u.totalOrders, 8));
  const orders: UserOrderEntry[] = Array.from({ length: orderCount }, (_, i) => {
    const status = i < 2 ? O_STATUSES[Math.floor(rnd() * 4) + 2] : "delivered";
    return {
      id: `${u.id.replace("USR", "JOY")}-${String(1000 + i).padStart(4, "0")}`,
      product: pick(PRODUCTS),
      credits: 3 + Math.floor(rnd() * 30),
      status,
      queuePosition: status === "in_queue" || status === "processing" ? Math.floor(rnd() * 12) + 2 : null,
      estimateKey: pick(ESTIMATES),
      createdAt: shift(u.registrationDate, Math.floor(rnd() * 300) + i * 12),
    };
  });

  // Credits history — reconstruct movements ending at current balance
  const credits: CreditTxEntry[] = [];
  let bal = 0;
  if (u.creditsPurchased > 0) {
    const purchase = Math.floor(u.creditsPurchased * 0.7);
    bal += purchase;
    credits.push({ id: `${u.id}-CR1`, date: shift(u.registrationDate, 1), type: "purchased", credits: purchase, balanceAfter: bal, description: "credits_desc_purchase" });
    const bonus = 10;
    bal += bonus;
    credits.push({ id: `${u.id}-CR2`, date: shift(u.registrationDate, 2), type: "bonus", credits: bonus, balanceAfter: bal, description: "credits_desc_bonus" });
    const rest = u.creditsPurchased - purchase;
    if (rest > 0) {
      bal += rest;
      credits.push({ id: `${u.id}-CR3`, date: shift(u.registrationDate, 60), type: "purchased", credits: rest, balanceAfter: bal, description: "credits_desc_purchase" });
    }
  }
  if (u.creditsUsed > 0) {
    const chunks = Math.min(4, Math.max(1, Math.floor(u.creditsUsed / 15)));
    for (let i = 0; i < chunks; i++) {
      const spend = i === chunks - 1 ? u.creditsUsed - Math.floor(u.creditsUsed / chunks) * (chunks - 1) : Math.floor(u.creditsUsed / chunks);
      bal -= spend;
      credits.push({ id: `${u.id}-CU${i}`, date: shift(u.registrationDate, 30 + i * 20), type: "used", credits: -spend, balanceAfter: bal, description: "credits_desc_used" });
    }
  }
  credits.sort((a, b) => b.date.localeCompare(a.date));

  // Subscription history
  const subscriptions: SubHistoryEntry[] = [];
  if (u.subscriptionStart && u.subscriptionEnd) {
    subscriptions.push({
      id: `${u.id}-S1`,
      plan: u.subscription === "none" ? "monthly" : u.subscription,
      startDate: u.subscriptionStart,
      endDate: u.subscriptionEnd,
      status: "active",
    });
    subscriptions.push({
      id: `${u.id}-S0`,
      plan: "monthly",
      startDate: shift(u.subscriptionStart, -60),
      endDate: shift(u.subscriptionStart, -1),
      status: "expired",
    });
  }

  // Notifications
  const notifications: NotifEntry[] = [
    { id: `${u.id}-N1`, date: shift(u.registrationDate, 0), channel: "email", subject: "notif_welcome", status: "delivered" },
    { id: `${u.id}-N2`, date: shift(u.registrationDate, 5), channel: "email", subject: "notif_order_ready", status: "delivered" },
    { id: `${u.id}-N3`, date: shift(u.registrationDate, 12), channel: "sms", subject: "notif_order_ready", status: rnd() > 0.7 ? "failed" : "delivered" },
    { id: `${u.id}-N4`, date: shift(u.registrationDate, 40), channel: "push", subject: "notif_promo", status: "pending" },
    { id: `${u.id}-N5`, date: shift(u.registrationDate, 60), channel: "system", subject: "notif_password", status: "delivered" },
  ];

  // Activity log
  const activity: ActivityEntry[] = [
    { id: `${u.id}-A1`, date: u.registrationDate, kind: "registered" },
    ...(u.creditsPurchased > 0 ? [{ id: `${u.id}-A2`, date: shift(u.registrationDate, 1), kind: "purchased_credits" as const, details: `+${u.creditsPurchased}` }] : []),
    ...orders.slice(0, 3).map((o, i) => ({
      id: `${u.id}-AO${i}`,
      date: o.createdAt,
      kind: (o.status === "cancelled" ? "cancelled_order" : "created_order") as ActivityKind,
      details: o.id,
    })),
    ...(subscriptions.length ? [{ id: `${u.id}-AS`, date: subscriptions[0]!.startDate, kind: "subscription_purchased" as const }] : []),
    { id: `${u.id}-AL`, date: shift(u.registrationDate, 90), kind: "language_changed", details: u.language.toUpperCase() },
    ...(u.lastLoginAt ? [{ id: `${u.id}-ALG`, date: u.lastLoginAt, kind: "login" as const }] : []),
  ];
  activity.sort((a, b) => b.date.localeCompare(a.date));

  return { ...u, orders, credits, subscriptions, notifications, activity };
}

export function totalSpentFor(u: UserRecord): number {
  if (typeof u.totalSpent === "number") return u.totalSpent;
  // Fallback derived from purchased credits (1 credit ≈ $0.50 for demo)
  return Math.round(u.creditsPurchased * 0.5);
}
export function avgOrderValueFor(u: UserRecord): number {
  const spent = totalSpentFor(u);
  return u.totalOrders > 0 ? Math.round((spent / u.totalOrders) * 100) / 100 : 0;
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
    vipTier: "vip",
    lastLoginAt: "2026-07-18T09:12:00.000Z",
    lastIp: "185.32.144.10",
    lastDevice: "iPhone 15 · Safari",
    totalSpent: 96,
    currency: "EUR",
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
    vipTier: "premium",
    lastLoginAt: "2026-07-17T18:03:00.000Z",
    lastIp: "77.121.4.88",
    lastDevice: "MacBook Pro · Chrome",
    totalSpent: 148,
    currency: "EUR",
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
    vipTier: "top",
    lastLoginAt: "2026-07-19T07:45:00.000Z",
    lastIp: "91.170.24.201",
    lastDevice: "Pixel 8 · Chrome",
    totalSpent: 240,
    currency: "EUR",
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
    vipTier: "vip",
    lastLoginAt: "2026-07-16T20:11:00.000Z",
    lastIp: "212.58.244.5",
    lastDevice: "iPad · Safari",
    totalSpent: 120,
    currency: "GBP",
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
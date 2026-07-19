// ---------------------------------------------------------------------------
// Project Joy Admin — Orders (frontend-only demonstration module).
// No backend, no queue, no notifications wiring. All values are placeholders.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

export type OrderType =
  | "card"
  | "animated"
  | "song"
  | "video"
  | "cartoon"
  | "premium"
  | "individual";

export const ORDER_TYPES: OrderType[] = [
  "card",
  "animated",
  "song",
  "video",
  "cartoon",
  "premium",
  "individual",
];

export type OrderStatus =
  | "draft"
  | "waiting_payment"
  | "paid"
  | "in_queue"
  | "processing"
  | "ready"
  | "delivered"
  | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "waiting_payment",
  "paid",
  "in_queue",
  "processing",
  "ready",
  "delivered",
  "cancelled",
];

export type NotifyChannel = "email" | "sms";
export type NotifyStatus = "pending" | "sent" | "failed";

export interface OrderNotification {
  channel: NotifyChannel;
  enabled: boolean;
  status: NotifyStatus;
}

export interface OrderRecord {
  id: string;
  customerName: string;
  customerEmail: string;
  customerLanguage: Lang;
  customerCountry: string;
  type: OrderType;
  productName: string;
  credits: number;
  status: OrderStatus;
  queuePosition: number | null;
  estimatedMinutes: number; // 0 = not applicable
  createdAt: string; // ISO
  recipientName: string;
  occasion: string;
  style: string;
  durationSeconds: number | null;
  customerNotes: string;
  notifications: OrderNotification[];
}

export const STATUS_TONE: Record<OrderStatus, string> = {
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",
  waiting_payment: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  paid: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  in_queue: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
  processing: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/30",
  ready: "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/30",
  delivered: "bg-green-600/15 text-green-800 dark:text-green-200 border-green-600/30",
  cancelled: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
};

export function formatEstimate(minutes: number): { value: number; unit: "minutes" | "hours" | "days" } | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return { value: Math.max(1, Math.round(minutes)), unit: "minutes" };
  if (minutes < 60 * 24) return { value: Math.max(1, Math.round(minutes / 60)), unit: "hours" };
  return { value: Math.max(1, Math.round(minutes / (60 * 24))), unit: "days" };
}

function iso(daysAgo: number, hoursAgo = 0): string {
  const d = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(d.getUTCHours() - hoursAgo);
  return d.toISOString();
}

export const DEMO_ORDERS: OrderRecord[] = [
  {
    id: "JOY-100241",
    customerName: "Anna Weber",
    customerEmail: "anna.weber@example.com",
    customerLanguage: "de",
    customerCountry: "DE",
    type: "card",
    productName: "Birthday Card",
    credits: 1,
    status: "delivered",
    queuePosition: null,
    estimatedMinutes: 0,
    createdAt: iso(3),
    recipientName: "Lukas",
    occasion: "Birthday",
    style: "Warm",
    durationSeconds: null,
    customerNotes: "Please keep it warm and personal.",
    notifications: [
      { channel: "email", enabled: true, status: "sent" },
      { channel: "sms", enabled: false, status: "pending" },
    ],
  },
  {
    id: "JOY-100242",
    customerName: "Ivan Petrov",
    customerEmail: "ivan.petrov@example.com",
    customerLanguage: "ru",
    customerCountry: "PL",
    type: "song",
    productName: "Anniversary Song",
    credits: 8,
    status: "processing",
    queuePosition: 3,
    estimatedMinutes: 55,
    createdAt: iso(0, 4),
    recipientName: "Katya",
    occasion: "Anniversary",
    style: "Elegant",
    durationSeconds: 120,
    customerNotes: "Mention 10 years together.",
    notifications: [
      { channel: "email", enabled: true, status: "pending" },
      { channel: "sms", enabled: true, status: "pending" },
    ],
  },
  {
    id: "JOY-100243",
    customerName: "Marie Dubois",
    customerEmail: "marie.dubois@example.com",
    customerLanguage: "fr",
    customerCountry: "FR",
    type: "video",
    productName: "Wedding Video",
    credits: 22,
    status: "in_queue",
    queuePosition: 12,
    estimatedMinutes: 180,
    createdAt: iso(1),
    recipientName: "Paul & Sophie",
    occasion: "Wedding",
    style: "Cinematic",
    durationSeconds: 180,
    customerNotes: "Include seaside imagery.",
    notifications: [
      { channel: "email", enabled: true, status: "pending" },
      { channel: "sms", enabled: false, status: "pending" },
    ],
  },
  {
    id: "JOY-100244",
    customerName: "Olena Koval",
    customerEmail: "olena.koval@example.com",
    customerLanguage: "uk",
    customerCountry: "UA",
    type: "cartoon",
    productName: "Cartoon Story",
    credits: 30,
    status: "paid",
    queuePosition: 6,
    estimatedMinutes: 240,
    createdAt: iso(0, 1),
    recipientName: "Sofia",
    occasion: "Birthday",
    style: "Funny",
    durationSeconds: 180,
    customerNotes: "Loves rabbits and pink.",
    notifications: [
      { channel: "email", enabled: true, status: "sent" },
      { channel: "sms", enabled: true, status: "failed" },
    ],
  },
  {
    id: "JOY-100245",
    customerName: "Piotr Nowak",
    customerEmail: "piotr.nowak@example.com",
    customerLanguage: "pl",
    customerCountry: "PL",
    type: "premium",
    productName: "Premium Greeting",
    credits: 60,
    status: "waiting_payment",
    queuePosition: null,
    estimatedMinutes: 60 * 24 * 4,
    createdAt: iso(2),
    recipientName: "Zofia",
    occasion: "Retirement",
    style: "Elegant",
    durationSeconds: null,
    customerNotes: "Long-form, five scenes, original music.",
    notifications: [
      { channel: "email", enabled: true, status: "pending" },
      { channel: "sms", enabled: false, status: "pending" },
    ],
  },
  {
    id: "JOY-100246",
    customerName: "John Smith",
    customerEmail: "john.smith@example.com",
    customerLanguage: "en",
    customerCountry: "US",
    type: "individual",
    productName: "Individual Order",
    credits: 45,
    status: "draft",
    queuePosition: null,
    estimatedMinutes: 0,
    createdAt: iso(0, 8),
    recipientName: "Team of 12",
    occasion: "Corporate milestone",
    style: "Warm",
    durationSeconds: null,
    customerNotes: "Custom brief pending confirmation.",
    notifications: [
      { channel: "email", enabled: true, status: "pending" },
      { channel: "sms", enabled: false, status: "pending" },
    ],
  },
];

let seq = 100300;
export function nextOrderId(): string {
  seq += 1;
  return `JOY-${seq}`;
}

export function makeTestOrder(): OrderRecord {
  return {
    id: nextOrderId(),
    customerName: "Test Customer",
    customerEmail: "test.customer@example.com",
    customerLanguage: "en",
    customerCountry: "DE",
    type: "card",
    productName: "Birthday Card",
    credits: 1,
    status: "draft",
    queuePosition: null,
    estimatedMinutes: 0,
    createdAt: new Date().toISOString(),
    recipientName: "Recipient",
    occasion: "Birthday",
    style: "Warm",
    durationSeconds: null,
    customerNotes: "Demonstration test order.",
    notifications: [
      { channel: "email", enabled: true, status: "pending" },
      { channel: "sms", enabled: false, status: "pending" },
    ],
  };
}

export function duplicateOrder(o: OrderRecord): OrderRecord {
  return {
    ...o,
    id: nextOrderId(),
    status: "draft",
    queuePosition: null,
    createdAt: new Date().toISOString(),
    notifications: o.notifications.map((n) => ({ ...n, status: "pending" })),
  };
}
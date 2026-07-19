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

export type Priority = "normal" | "high" | "urgent";
export const PRIORITIES: Priority[] = ["normal", "high", "urgent"];

export const PRIORITY_TONE: Record<Priority, string> = {
  normal: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",
  high: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  urgent: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
};

export type TimelineKind =
  | "created"
  | "payment"
  | "queued"
  | "processing_started"
  | "processing_finished"
  | "notification_sent"
  | "delivered"
  | "cancelled"
  | "priority_changed"
  | "queue_moved"
  | "paused"
  | "resumed"
  | "status_changed"
  | "note_added"
  | "notification_resent";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string; // ISO
  note: string;
  author: string;
}

export interface InternalNote {
  id: string;
  author: string;
  at: string;
  text: string;
}

export interface NotificationLogEntry {
  id: string;
  channel: NotifyChannel;
  at: string;
  status: NotifyStatus;
  subjectKey: string;
  bodyKey: string;
}

export type GeneratedFileKind = "card" | "song" | "video" | "cartoon" | "premium";

export interface GeneratedFile {
  id: string;
  kind: GeneratedFileKind;
  label: string;
}

export type CancellationReason =
  | "customer_request"
  | "payment_failed"
  | "technical_issue"
  | "duplicate"
  | "other";

export const CANCELLATION_REASONS: CancellationReason[] = [
  "customer_request",
  "payment_failed",
  "technical_issue",
  "duplicate",
  "other",
];

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
  priority: Priority;
  paused: boolean;
  queuePosition: number | null;
  estimatedMinutes: number; // 0 = not applicable
  createdAt: string; // ISO
  recipientName: string;
  occasion: string;
  style: string;
  durationSeconds: number | null;
  customerNotes: string;
  notifications: OrderNotification[];
  timeline: TimelineEvent[];
  internalNotes: InternalNote[];
  notificationLogs: NotificationLogEntry[];
  files: GeneratedFile[];
  cancellationReason: CancellationReason | null;
  cancellationNote: string;
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

let evtSeq = 1;
export function newEventId(): string {
  evtSeq += 1;
  return `evt-${evtSeq}`;
}

export function makeTimelineEvent(kind: TimelineKind, note = "", author = "Admin"): TimelineEvent {
  return { id: newEventId(), kind, at: new Date().toISOString(), note, author };
}

function seedTimeline(o: Pick<OrderRecord, "createdAt" | "status" | "priority">): TimelineEvent[] {
  const base: TimelineEvent[] = [
    { id: newEventId(), kind: "created", at: o.createdAt, note: "", author: "System" },
  ];
  const advance = (kind: TimelineKind, hoursOffset: number): TimelineEvent => {
    const d = new Date(o.createdAt);
    d.setUTCHours(d.getUTCHours() + hoursOffset);
    return { id: newEventId(), kind, at: d.toISOString(), note: "", author: "System" };
  };
  const chain: TimelineKind[] = [];
  if (["paid", "in_queue", "processing", "ready", "delivered"].includes(o.status)) chain.push("payment");
  if (["in_queue", "processing", "ready", "delivered"].includes(o.status)) chain.push("queued");
  if (["processing", "ready", "delivered"].includes(o.status)) chain.push("processing_started");
  if (["ready", "delivered"].includes(o.status)) chain.push("processing_finished");
  if (o.status === "delivered") {
    chain.push("notification_sent");
    chain.push("delivered");
  }
  if (o.status === "cancelled") chain.push("cancelled");
  chain.forEach((k, i) => base.push(advance(k, (i + 1) * 2)));
  return base;
}

function defaultFiles(type: OrderType): GeneratedFile[] {
  const map: Record<OrderType, GeneratedFileKind[]> = {
    card: ["card"],
    animated: ["card"],
    song: ["song"],
    video: ["video"],
    cartoon: ["cartoon"],
    premium: ["premium"],
    individual: ["premium"],
  };
  return map[type].map((kind, i) => ({
    id: `f-${kind}-${i}`,
    kind,
    label: `${kind.toUpperCase()}-${100 + i}`,
  }));
}

function defaultNotifLogs(createdAt: string): NotificationLogEntry[] {
  const d = new Date(createdAt);
  d.setUTCHours(d.getUTCHours() + 1);
  return [
    {
      id: `nl-${Math.random().toString(36).slice(2, 8)}`,
      channel: "email",
      at: d.toISOString(),
      status: "sent",
      subjectKey: "tmpl_confirm_subject",
      bodyKey: "tmpl_confirm_body",
    },
  ];
}

function makeDemoOrder(partial: Omit<OrderRecord,
  "priority" | "paused" | "timeline" | "internalNotes" | "notificationLogs" | "files" | "cancellationReason" | "cancellationNote"
> & { priority?: Priority; paused?: boolean }): OrderRecord {
  const priority = partial.priority ?? "normal";
  return {
    ...partial,
    priority,
    paused: partial.paused ?? false,
    timeline: seedTimeline({ createdAt: partial.createdAt, status: partial.status, priority }),
    internalNotes: [],
    notificationLogs: defaultNotifLogs(partial.createdAt),
    files: defaultFiles(partial.type),
    cancellationReason: null,
    cancellationNote: "",
  };
}

export const DEMO_ORDERS: OrderRecord[] = [
  makeDemoOrder({
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
    priority: "normal",
  }),
  makeDemoOrder({
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
    priority: "high",
  }),
  makeDemoOrder({
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
    priority: "urgent",
  }),
  makeDemoOrder({
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
    priority: "normal",
  }),
  makeDemoOrder({
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
    priority: "normal",
  }),
  makeDemoOrder({
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
    priority: "normal",
  }),
];

let seq = 100300;
export function nextOrderId(): string {
  seq += 1;
  return `JOY-${seq}`;
}

export function makeTestOrder(): OrderRecord {
  const createdAt = new Date().toISOString();
  return makeDemoOrder({
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
    createdAt,
    recipientName: "Recipient",
    occasion: "Birthday",
    style: "Warm",
    durationSeconds: null,
    customerNotes: "Demonstration test order.",
    notifications: [
      { channel: "email", enabled: true, status: "pending" },
      { channel: "sms", enabled: false, status: "pending" },
    ],
    priority: "normal",
  });
}

export function duplicateOrder(o: OrderRecord): OrderRecord {
  const createdAt = new Date().toISOString();
  return makeDemoOrder({
    id: nextOrderId(),
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerLanguage: o.customerLanguage,
    customerCountry: o.customerCountry,
    type: o.type,
    productName: o.productName,
    credits: o.credits,
    status: "draft",
    queuePosition: null,
    estimatedMinutes: o.estimatedMinutes,
    createdAt,
    recipientName: o.recipientName,
    occasion: o.occasion,
    style: o.style,
    durationSeconds: o.durationSeconds,
    customerNotes: o.customerNotes,
    notifications: o.notifications.map((n) => ({ ...n, status: "pending" })),
    priority: "normal",
  });
}

// ---------------------------------------------------------------------------
// Queue helpers
// ---------------------------------------------------------------------------

export type QueueAction = "up" | "down" | "top";

function queuedIds(orders: OrderRecord[]): OrderRecord[] {
  return [...orders]
    .filter((o) => o.queuePosition != null && !["delivered", "cancelled"].includes(o.status))
    .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));
}

function reassign(orders: OrderRecord[], sorted: OrderRecord[]): OrderRecord[] {
  const posById = new Map(sorted.map((o, i) => [o.id, i + 1]));
  return orders.map((o) => (posById.has(o.id) ? { ...o, queuePosition: posById.get(o.id)! } : o));
}

export function moveInQueue(orders: OrderRecord[], id: string, action: QueueAction): OrderRecord[] {
  const list = queuedIds(orders);
  const idx = list.findIndex((o) => o.id === id);
  if (idx < 0) return orders;
  if (action === "top" && idx > 0) {
    const [item] = list.splice(idx, 1);
    list.unshift(item);
  } else if (action === "up" && idx > 0) {
    [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
  } else if (action === "down" && idx < list.length - 1) {
    [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
  } else {
    return orders;
  }
  return reassign(orders, list);
}

/**
 * Re-sort the temporary queue so higher priorities float upward while keeping
 * relative order within each priority tier. Frontend demonstration only.
 */
export function reprioritizeQueue(orders: OrderRecord[]): OrderRecord[] {
  const rank: Record<Priority, number> = { urgent: 0, high: 1, normal: 2 };
  const list = queuedIds(orders).sort((a, b) => {
    if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
    return (a.queuePosition ?? 0) - (b.queuePosition ?? 0);
  });
  return reassign(orders, list);
}

export function appendEvent(order: OrderRecord, kind: TimelineKind, note = "", author = "Admin"): OrderRecord {
  return { ...order, timeline: [...order.timeline, makeTimelineEvent(kind, note, author)] };
}

export const TIMELINE_KINDS: TimelineKind[] = [
  "created",
  "payment",
  "queued",
  "processing_started",
  "processing_finished",
  "notification_sent",
  "delivered",
  "cancelled",
  "priority_changed",
  "queue_moved",
  "paused",
  "resumed",
  "status_changed",
  "note_added",
  "notification_resent",
];
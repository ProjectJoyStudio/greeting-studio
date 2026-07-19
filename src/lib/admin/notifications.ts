// ---------------------------------------------------------------------------
// Project Joy Admin — Notifications (frontend-only demonstration module).
// Prepared as clean integration points for future SMTP / SMS / Telegram /
// WhatsApp / Push providers. No backend, queue or delivery service wired.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

export type NotifType =
  | "registration" | "email_verification" | "welcome_message"
  | "credits_purchased" | "credits_added" | "credits_low"
  | "subscription_activated" | "subscription_renewed"
  | "subscription_expiring" | "subscription_expired"
  | "order_received" | "order_waiting" | "order_processing"
  | "order_ready" | "order_delivered"
  | "payment_successful" | "payment_failed" | "refund"
  | "promotion" | "promo_code"
  | "birthday" | "christmas" | "new_year" | "easter"
  | "good_morning" | "good_night"
  | "reminder" | "announcement" | "maintenance" | "system_notification";

export const NOTIF_TYPES: NotifType[] = [
  "registration", "email_verification", "welcome_message",
  "credits_purchased", "credits_added", "credits_low",
  "subscription_activated", "subscription_renewed",
  "subscription_expiring", "subscription_expired",
  "order_received", "order_waiting", "order_processing",
  "order_ready", "order_delivered",
  "payment_successful", "payment_failed", "refund",
  "promotion", "promo_code",
  "birthday", "christmas", "new_year", "easter",
  "good_morning", "good_night",
  "reminder", "announcement", "maintenance", "system_notification",
];

export type NotifChannel =
  | "email" | "sms" | "push" | "telegram" | "whatsapp" | "internal";

export const NOTIF_CHANNELS: NotifChannel[] = [
  "email", "sms", "push", "telegram", "whatsapp", "internal",
];

export type NotifStatus =
  | "draft" | "scheduled" | "waiting" | "sending"
  | "sent" | "delivered" | "read" | "failed" | "cancelled";

export const NOTIF_STATUSES: NotifStatus[] = [
  "draft", "scheduled", "waiting", "sending",
  "sent", "delivered", "read", "failed", "cancelled",
];

export const STATUS_TONE: Record<NotifStatus, string> = {
  draft:     "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",
  scheduled: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
  waiting:   "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  sending:   "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/30",
  sent:      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  delivered: "bg-green-600/15 text-green-800 dark:text-green-200 border-green-600/30",
  read:      "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/30",
  failed:    "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-200 border-zinc-500/30",
};

export type NotifPriority = "low" | "normal" | "high" | "critical";
export const NOTIF_PRIORITIES: NotifPriority[] = ["low", "normal", "high", "critical"];

export const PRIORITY_TONE: Record<NotifPriority, string> = {
  low:      "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",
  normal:   "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
  high:     "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
};

export type RepeatMode = "none" | "daily" | "weekly" | "monthly";

export interface HistoryEntry {
  id: string;
  kind: "created" | "edited" | "scheduled" | "sent" | "delivered" | "read" | "failed" | "cancelled";
  at: string;
  note: string;
  author: string;
}

export interface NotifRecord {
  id: string;
  recipientName: string;
  email: string;
  phone: string;
  language: Lang;
  country: string;
  relatedOrder: string | null;
  type: NotifType;
  channel: NotifChannel;
  priority: NotifPriority;
  subject: string;
  message: string;
  status: NotifStatus;
  createdAt: string;
  scheduledAt: string | null;
  sentAt: string | null;
  readAt: string | null;
  deliveryAttempts: number;
  errorLog: string;
  attachments: string[];
  repeat: RepeatMode;
  history: HistoryEntry[];
}

export type TemplateCategory =
  | "welcome" | "registration" | "credits" | "orders"
  | "promotions" | "subscription" | "birthday" | "holiday"
  | "reminder" | "system";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "welcome", "registration", "credits", "orders",
  "promotions", "subscription", "birthday", "holiday",
  "reminder", "system",
];

export interface TemplateRecord {
  id: string;
  name: string;
  category: TemplateCategory;
  channel: NotifChannel;
  language: Lang;
  subject: string;
  body: string;
  archived: boolean;
  updatedAt: string;
}

let seq = 900100;
export function nextNotifId(): string {
  seq += 1;
  return `NOT-${seq}`;
}
let tseq = 700100;
export function nextTemplateId(): string {
  tseq += 1;
  return `TPL-${tseq}`;
}
let hseq = 1;
export function newHistoryId(): string {
  hseq += 1;
  return `nh-${hseq}`;
}

export function newHistory(kind: HistoryEntry["kind"], note = "", author = "Admin"): HistoryEntry {
  return { id: newHistoryId(), kind, at: new Date().toISOString(), note, author };
}

function iso(daysAgo: number, hoursAgo = 0): string {
  const d = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(d.getUTCHours() - hoursAgo);
  return d.toISOString();
}

function baseHistory(createdAt: string, status: NotifStatus, sentAt: string | null): HistoryEntry[] {
  const list: HistoryEntry[] = [
    { id: newHistoryId(), kind: "created", at: createdAt, note: "", author: "System" },
  ];
  const chain: HistoryEntry["kind"][] = [];
  if (["scheduled"].includes(status)) chain.push("scheduled");
  if (["sent", "delivered", "read"].includes(status)) chain.push("sent");
  if (["delivered", "read"].includes(status)) chain.push("delivered");
  if (status === "read") chain.push("read");
  if (status === "failed") chain.push("failed");
  if (status === "cancelled") chain.push("cancelled");
  const start = new Date(sentAt ?? createdAt);
  chain.forEach((k, i) => {
    const d = new Date(start);
    d.setUTCMinutes(d.getUTCMinutes() + i * 3);
    list.push({ id: newHistoryId(), kind: k, at: d.toISOString(), note: "", author: "System" });
  });
  return list;
}

function mk(o: Omit<NotifRecord, "history">): NotifRecord {
  return { ...o, history: baseHistory(o.createdAt, o.status, o.sentAt) };
}

export const DEMO_NOTIFICATIONS: NotifRecord[] = [
  mk({
    id: "NOT-900001", recipientName: "Anna Weber", email: "anna.weber@example.com",
    phone: "+49 171 5550101", language: "de", country: "DE",
    relatedOrder: "JOY-100241", type: "order_delivered", channel: "email",
    priority: "normal", subject: "Dein Gruß ist bereit",
    message: "Hallo Anna,\n\ndein Gruß für Lukas wurde zugestellt. Wir wünschen viel Freude!\n\n— Project Joy",
    status: "read", createdAt: iso(3, 4), scheduledAt: null, sentAt: iso(3, 3),
    readAt: iso(3, 2), deliveryAttempts: 1, errorLog: "", attachments: [], repeat: "none",
  }),
  mk({
    id: "NOT-900002", recipientName: "Ivan Petrov", email: "ivan.petrov@example.com",
    phone: "+48 500 550 202", language: "ru", country: "PL",
    relatedOrder: "JOY-100242", type: "order_processing", channel: "push",
    priority: "high", subject: "Ваш заказ в работе",
    message: "Иван, мы уже начали готовить песню для Кати. Отправим уведомление, когда всё будет готово.",
    status: "delivered", createdAt: iso(0, 4), scheduledAt: null, sentAt: iso(0, 3),
    readAt: null, deliveryAttempts: 1, errorLog: "", attachments: [], repeat: "none",
  }),
  mk({
    id: "NOT-900003", recipientName: "Marie Dubois", email: "marie.dubois@example.com",
    phone: "+33 6 55 01 02 03", language: "fr", country: "FR",
    relatedOrder: "JOY-100243", type: "order_waiting", channel: "sms",
    priority: "normal", subject: "Commande en file d'attente",
    message: "Bonjour Marie, votre vidéo est dans la file. Vous recevrez un message dès qu'elle sera prête.",
    status: "sent", createdAt: iso(1, 2), scheduledAt: null, sentAt: iso(1, 1),
    readAt: null, deliveryAttempts: 1, errorLog: "", attachments: [], repeat: "none",
  }),
  mk({
    id: "NOT-900004", recipientName: "Olena Koval", email: "olena.koval@example.com",
    phone: "+380 67 555 0303", language: "uk", country: "UA",
    relatedOrder: null, type: "credits_low", channel: "email",
    priority: "normal", subject: "Залишилось мало кредитів",
    message: "Олено, ваш баланс знижується. Ви можете поповнити його в будь-який момент у розділі «Кредити».",
    status: "scheduled", createdAt: iso(0, 8), scheduledAt: iso(-1),
    sentAt: null, readAt: null, deliveryAttempts: 0, errorLog: "", attachments: [], repeat: "weekly",
  }),
  mk({
    id: "NOT-900005", recipientName: "Piotr Nowak", email: "piotr.nowak@example.com",
    phone: "+48 500 550 404", language: "pl", country: "PL",
    relatedOrder: null, type: "promotion", channel: "email",
    priority: "low", subject: "Wiosenna oferta w Project Joy",
    message: "Piotrze, przygotowaliśmy specjalną ofertę na pakiety kredytów. Sprawdź szczegóły na swoim koncie.",
    status: "draft", createdAt: iso(0, 1), scheduledAt: null, sentAt: null,
    readAt: null, deliveryAttempts: 0, errorLog: "", attachments: [], repeat: "none",
  }),
  mk({
    id: "NOT-900006", recipientName: "John Smith", email: "john.smith@example.com",
    phone: "+1 415 555 0505", language: "en", country: "US",
    relatedOrder: null, type: "birthday", channel: "email",
    priority: "normal", subject: "Happy Birthday from Project Joy",
    message: "Dear John, wishing you a warm and joyful birthday from all of us at Project Joy.",
    status: "sent", createdAt: iso(2), scheduledAt: null, sentAt: iso(2),
    readAt: null, deliveryAttempts: 1, errorLog: "", attachments: [], repeat: "none",
  }),
  mk({
    id: "NOT-900007", recipientName: "Anna Weber", email: "anna.weber@example.com",
    phone: "+49 171 5550101", language: "de", country: "DE",
    relatedOrder: "JOY-100241", type: "payment_failed", channel: "email",
    priority: "critical", subject: "Zahlung fehlgeschlagen",
    message: "Hallo Anna, deine letzte Zahlung konnte nicht abgeschlossen werden. Bitte aktualisiere deine Zahlungsdaten.",
    status: "failed", createdAt: iso(4), scheduledAt: null, sentAt: iso(4),
    readAt: null, deliveryAttempts: 3, errorLog: "SMTP timeout after 3 attempts (demonstration).",
    attachments: [], repeat: "none",
  }),
  mk({
    id: "NOT-900008", recipientName: "Ivan Petrov", email: "ivan.petrov@example.com",
    phone: "+48 500 550 202", language: "ru", country: "PL",
    relatedOrder: null, type: "good_morning", channel: "telegram",
    priority: "low", subject: "Доброе утро от Project Joy",
    message: "Иван, желаем вам прекрасного дня и вдохновения на новые поздравления.",
    status: "waiting", createdAt: iso(0, 6), scheduledAt: iso(0, -2),
    sentAt: null, readAt: null, deliveryAttempts: 0, errorLog: "",
    attachments: [], repeat: "daily",
  }),
  mk({
    id: "NOT-900009", recipientName: "Marie Dubois", email: "marie.dubois@example.com",
    phone: "+33 6 55 01 02 03", language: "fr", country: "FR",
    relatedOrder: null, type: "subscription_expiring", channel: "whatsapp",
    priority: "high", subject: "Votre abonnement expire bientôt",
    message: "Bonjour Marie, votre abonnement Project Joy expire dans 3 jours. Renouvelez-le pour continuer.",
    status: "sending", createdAt: iso(0, 2), scheduledAt: null, sentAt: null,
    readAt: null, deliveryAttempts: 0, errorLog: "", attachments: [], repeat: "none",
  }),
  mk({
    id: "NOT-900010", recipientName: "Olena Koval", email: "olena.koval@example.com",
    phone: "+380 67 555 0303", language: "uk", country: "UA",
    relatedOrder: null, type: "maintenance", channel: "internal",
    priority: "normal", subject: "Планове обслуговування",
    message: "Дорогі користувачі, у неділю з 02:00 до 04:00 можливі короткі перерви в роботі сервісу.",
    status: "cancelled", createdAt: iso(5), scheduledAt: iso(4), sentAt: null,
    readAt: null, deliveryAttempts: 0, errorLog: "", attachments: [], repeat: "none",
  }),
  mk({
    id: "NOT-900011", recipientName: "John Smith", email: "john.smith@example.com",
    phone: "+1 415 555 0505", language: "en", country: "US",
    relatedOrder: null, type: "reminder", channel: "push",
    priority: "normal", subject: "Don't forget your loved one",
    message: "John, an important date is approaching. Prepare a heartfelt greeting today.",
    status: "scheduled", createdAt: iso(0, 12), scheduledAt: iso(-2),
    sentAt: null, readAt: null, deliveryAttempts: 0, errorLog: "",
    attachments: [], repeat: "monthly",
  }),
  mk({
    id: "NOT-900012", recipientName: "Piotr Nowak", email: "piotr.nowak@example.com",
    phone: "+48 500 550 404", language: "pl", country: "PL",
    relatedOrder: null, type: "welcome_message", channel: "email",
    priority: "normal", subject: "Witaj w Project Joy",
    message: "Piotrze, cieszymy się, że jesteś z nami. Otrzymujesz pierwsze życzenia w prezencie.",
    status: "read", createdAt: iso(10), scheduledAt: null, sentAt: iso(10),
    readAt: iso(10), deliveryAttempts: 1, errorLog: "", attachments: [], repeat: "none",
  }),
];

export const DEMO_TEMPLATES: TemplateRecord[] = [
  {
    id: "TPL-700001", name: "Welcome — Email", category: "welcome", channel: "email",
    language: "en", subject: "Welcome to Project Joy",
    body: "Hi {{name}},\n\nWelcome to Project Joy — where greetings become emotions.\n\n— The Project Joy Team",
    archived: false, updatedAt: iso(20),
  },
  {
    id: "TPL-700002", name: "Registration — Verify Email", category: "registration", channel: "email",
    language: "en", subject: "Verify your email address",
    body: "Hi {{name}},\n\nPlease confirm your email address using the link in this message.",
    archived: false, updatedAt: iso(18),
  },
  {
    id: "TPL-700003", name: "Credits — Low Balance", category: "credits", channel: "email",
    language: "en", subject: "Your credit balance is low",
    body: "Hi {{name}}, you have {{credits}} credits left. Top up any time from your dashboard.",
    archived: false, updatedAt: iso(15),
  },
  {
    id: "TPL-700004", name: "Order — Ready", category: "orders", channel: "email",
    language: "en", subject: "Your greeting is ready",
    body: "Hi {{name}}, your greeting for {{recipient}} is ready. Open it any time from your dashboard.",
    archived: false, updatedAt: iso(12),
  },
  {
    id: "TPL-700005", name: "Promotion — Seasonal Offer", category: "promotions", channel: "email",
    language: "en", subject: "A warm seasonal offer",
    body: "Hi {{name}}, we prepared a special offer for you. Enjoy Project Joy with extra credits.",
    archived: false, updatedAt: iso(9),
  },
  {
    id: "TPL-700006", name: "Subscription — Renewed", category: "subscription", channel: "email",
    language: "en", subject: "Your subscription is renewed",
    body: "Hi {{name}}, your Project Joy subscription has been renewed. Thank you for staying with us.",
    archived: false, updatedAt: iso(7),
  },
  {
    id: "TPL-700007", name: "Birthday — Warm Wishes", category: "birthday", channel: "email",
    language: "en", subject: "Happy birthday, {{name}}",
    body: "Wishing you a warm and joyful birthday from all of us at Project Joy.",
    archived: false, updatedAt: iso(6),
  },
  {
    id: "TPL-700008", name: "Holiday — Christmas", category: "holiday", channel: "email",
    language: "en", subject: "Warm wishes this Christmas",
    body: "Dear {{name}}, wishing you and your loved ones a peaceful Christmas.",
    archived: false, updatedAt: iso(5),
  },
  {
    id: "TPL-700009", name: "Reminder — Important Date", category: "reminder", channel: "push",
    language: "en", subject: "An important date is near",
    body: "{{name}}, prepare a heartfelt greeting — an important date is around the corner.",
    archived: false, updatedAt: iso(4),
  },
  {
    id: "TPL-700010", name: "System — Maintenance Notice", category: "system", channel: "internal",
    language: "en", subject: "Scheduled maintenance",
    body: "Dear customer, short service interruptions are possible during scheduled maintenance.",
    archived: false, updatedAt: iso(2),
  },
  {
    id: "TPL-700011", name: "Willkommen — E-Mail", category: "welcome", channel: "email",
    language: "de", subject: "Willkommen bei Project Joy",
    body: "Hallo {{name}},\n\nwillkommen bei Project Joy — wo Grüße zu Emotionen werden.",
    archived: false, updatedAt: iso(19),
  },
  {
    id: "TPL-700012", name: "Добро пожаловать — Email", category: "welcome", channel: "email",
    language: "ru", subject: "Добро пожаловать в Project Joy",
    body: "Здравствуйте, {{name}}!\n\nДобро пожаловать в Project Joy — где поздравления становятся эмоциями.",
    archived: false, updatedAt: iso(19),
  },
];

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface NotifStats {
  total: number;
  sentToday: number;
  delivered: number;
  failed: number;
  readRate: number;     // 0..1
  deliveryRate: number; // 0..1
  topTypes: { key: NotifType; count: number }[];
  topLanguages: { key: Lang; count: number }[];
  topCountries: { key: string; count: number }[];
}

export function computeStats(list: NotifRecord[]): NotifStats {
  const today = new Date().toISOString().slice(0, 10);
  const sentSet = new Set<NotifStatus>(["sent", "delivered", "read"]);
  const sentCount = list.filter((n) => sentSet.has(n.status)).length;
  const deliveredCount = list.filter((n) => n.status === "delivered" || n.status === "read").length;
  const readCount = list.filter((n) => n.status === "read").length;
  const failedCount = list.filter((n) => n.status === "failed").length;

  const bump = <T extends string>(m: Map<T, number>, k: T) => m.set(k, (m.get(k) ?? 0) + 1);
  const types = new Map<NotifType, number>();
  const langs = new Map<Lang, number>();
  const cs = new Map<string, number>();
  list.forEach((n) => { bump(types, n.type); bump(langs, n.language); bump(cs, n.country); });
  const top = <T,>(m: Map<T, number>): { key: T; count: number }[] =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, count]) => ({ key, count }));

  return {
    total: list.length,
    sentToday: list.filter((n) => (n.sentAt ?? "").slice(0, 10) === today).length,
    delivered: deliveredCount,
    failed: failedCount,
    readRate: sentCount ? readCount / sentCount : 0,
    deliveryRate: sentCount ? deliveredCount / sentCount : 0,
    topTypes: top(types),
    topLanguages: top(langs),
    topCountries: top(cs),
  };
}

// ---------------------------------------------------------------------------
// Future integration points — no runtime behavior. Kept here so a future
// connector layer can implement these without a redesign.
// ---------------------------------------------------------------------------

export interface DeliveryProvider {
  channel: NotifChannel;
  send(_: NotifRecord): Promise<{ ok: boolean; error?: string }>;
}

export const providerRegistry: Partial<Record<NotifChannel, DeliveryProvider>> = {
  // email:    { channel: "email",    send: async () => ({ ok: false, error: "not_connected" }) },
  // sms:      { channel: "sms",      send: async () => ({ ok: false, error: "not_connected" }) },
  // push:     { channel: "push",     send: async () => ({ ok: false, error: "not_connected" }) },
  // telegram: { channel: "telegram", send: async () => ({ ok: false, error: "not_connected" }) },
  // whatsapp: { channel: "whatsapp", send: async () => ({ ok: false, error: "not_connected" }) },
  // internal: { channel: "internal", send: async () => ({ ok: true }) },
};
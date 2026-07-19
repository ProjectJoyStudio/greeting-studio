// ---------------------------------------------------------------------------
// Project Joy Admin — Audit Log (frontend-only demonstration module).
// Provides realistic demonstration data + clean integration points for a
// future logging backend. Nothing here calls a real API.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

export type AuditEventType =
  | "login" | "logout" | "registration" | "password_reset" | "email_change"
  | "subscription_purchase" | "credit_purchase"
  | "order_created" | "order_cancelled" | "order_completed"
  | "notification_sent"
  | "translation_created" | "content_published" | "content_edited" | "content_deleted"
  | "promotion_created" | "promo_code_used"
  | "calendar_event" | "payment" | "refund"
  | "admin_action" | "security_event" | "system_event" | "api_event";

export const AUDIT_EVENT_TYPES: AuditEventType[] = [
  "login", "logout", "registration", "password_reset", "email_change",
  "subscription_purchase", "credit_purchase",
  "order_created", "order_cancelled", "order_completed",
  "notification_sent",
  "translation_created", "content_published", "content_edited", "content_deleted",
  "promotion_created", "promo_code_used",
  "calendar_event", "payment", "refund",
  "admin_action", "security_event", "system_event", "api_event",
];

export type AuditSeverity = "info" | "success" | "warning" | "error" | "critical";
export const AUDIT_SEVERITIES: AuditSeverity[] = ["info", "success", "warning", "error", "critical"];

export const SEVERITY_TONE: Record<AuditSeverity, string> = {
  info:     "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
  success:  "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  warning:  "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  error:    "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
  critical: "bg-red-600/20 text-red-800 dark:text-red-200 border-red-600/40",
};

export type AuditRole = "guest" | "user" | "customer" | "vip" | "moderator" | "admin" | "system" | "api";
export const AUDIT_ROLES: AuditRole[] = ["guest", "user", "customer", "vip", "moderator", "admin", "system", "api"];

export type AuditModule =
  | "auth" | "users" | "orders" | "studio" | "catalog" | "payments"
  | "credits" | "subscriptions" | "promotions" | "notifications"
  | "calendar" | "languages" | "reports" | "platform" | "system" | "api";

export const AUDIT_MODULES: AuditModule[] = [
  "auth", "users", "orders", "studio", "catalog", "payments",
  "credits", "subscriptions", "promotions", "notifications",
  "calendar", "languages", "reports", "platform", "system", "api",
];

export type AuditResult = "success" | "failed" | "pending" | "blocked";
export const AUDIT_RESULTS: AuditResult[] = ["success", "failed", "pending", "blocked"];

export const RESULT_TONE: Record<AuditResult, string> = {
  success: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  failed:  "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
  pending: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  blocked: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",
};

export interface AuditFieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface AuditRelations {
  orderId?: string | null;
  userId?: string | null;
  paymentId?: string | null;
  notificationId?: string | null;
  promotionId?: string | null;
  sessionId?: string | null;
}

export interface AuditRecord {
  id: string;
  createdAt: string;             // ISO
  actorName: string;             // Who initiated (user or admin display name)
  actorEmail: string;
  role: AuditRole;
  module: AuditModule;
  type: AuditEventType;
  action: string;                // Short action label ("Signed in")
  description: string;           // Long human description
  result: AuditResult;
  severity: AuditSeverity;
  ip: string;
  country: string;               // ISO alpha-2
  device: string;                // "Desktop" | "Mobile" | "Tablet"
  browser: string;               // "Chrome 128"
  language: Lang;
  changes: AuditFieldChange[];
  relations: AuditRelations;
  notes: string;
  archived: boolean;
}

// ---------------------------------------------------------------------------
// ID generators & helpers
// ---------------------------------------------------------------------------

let _seq = 6000;
export const nextAuditId = () => `AUD-${(++_seq).toString().padStart(6, "0")}`;

function iso(daysAgo: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, Math.floor(Math.random() * 60), 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Demonstration data
// ---------------------------------------------------------------------------

function make(partial: Partial<AuditRecord>): AuditRecord {
  return {
    id: nextAuditId(),
    createdAt: iso(0),
    actorName: "System",
    actorEmail: "system@projectjoy.app",
    role: "system",
    module: "system",
    type: "system_event",
    action: "System",
    description: "",
    result: "success",
    severity: "info",
    ip: "—",
    country: "—",
    device: "Server",
    browser: "—",
    language: "en",
    changes: [],
    relations: {},
    notes: "",
    archived: false,
    ...partial,
  };
}

export const DEMO_AUDIT: AuditRecord[] = [
  make({
    createdAt: iso(0, 9, 12), actorName: "Elena Sokolova", actorEmail: "elena@example.com",
    role: "customer", module: "auth", type: "login", action: "Signed in",
    description: "Customer signed in via email + password.", result: "success", severity: "success",
    ip: "185.44.12.9", country: "DE", device: "Desktop", browser: "Chrome 128", language: "de",
    relations: { sessionId: "sess_9f2a" },
  }),
  make({
    createdAt: iso(0, 9, 18), actorName: "Elena Sokolova", actorEmail: "elena@example.com",
    role: "customer", module: "orders", type: "order_created", action: "Order created",
    description: "Personal greeting order placed for a birthday.", result: "success", severity: "success",
    ip: "185.44.12.9", country: "DE", device: "Desktop", browser: "Chrome 128", language: "de",
    relations: { orderId: "PJ-10428", sessionId: "sess_9f2a" },
  }),
  make({
    createdAt: iso(0, 9, 20), actorName: "Stripe (demo)", actorEmail: "hooks@projectjoy.app",
    role: "api", module: "payments", type: "payment", action: "Payment captured",
    description: "€19.90 captured for order PJ-10428.", result: "success", severity: "success",
    ip: "3.18.12.63", country: "US", device: "Server", browser: "—", language: "en",
    relations: { orderId: "PJ-10428", paymentId: "pi_demo_88221" },
  }),
  make({
    createdAt: iso(0, 11, 4), actorName: "Notification Service", actorEmail: "notify@projectjoy.app",
    role: "system", module: "notifications", type: "notification_sent", action: "Email sent",
    description: "Order confirmation email dispatched.", result: "success", severity: "info",
    ip: "—", country: "—", device: "Server", browser: "—", language: "de",
    relations: { orderId: "PJ-10428", notificationId: "NTF-00212" },
  }),
  make({
    createdAt: iso(0, 12, 30), actorName: "Marta Nowak", actorEmail: "marta@example.com",
    role: "user", module: "auth", type: "login", action: "Failed sign-in",
    description: "Incorrect password (attempt 3 of 5).", result: "failed", severity: "warning",
    ip: "89.174.20.55", country: "PL", device: "Mobile", browser: "Safari 17", language: "pl",
  }),
  make({
    createdAt: iso(0, 12, 32), actorName: "Marta Nowak", actorEmail: "marta@example.com",
    role: "user", module: "auth", type: "security_event", action: "Account locked",
    description: "5 consecutive failed sign-in attempts — temporary lock applied.",
    result: "blocked", severity: "critical",
    ip: "89.174.20.55", country: "PL", device: "Mobile", browser: "Safari 17", language: "pl",
  }),
  make({
    createdAt: iso(1, 14, 5), actorName: "Anna Weber (Admin)", actorEmail: "anna@projectjoy.app",
    role: "admin", module: "catalog", type: "content_published", action: "Template published",
    description: "Published catalog template ‘Warm Birthday Wishes’ to production.",
    result: "success", severity: "success",
    ip: "10.0.0.15", country: "DE", device: "Desktop", browser: "Firefox 130", language: "de",
    changes: [
      { field: "status", oldValue: "draft", newValue: "published" },
      { field: "featured", oldValue: "false", newValue: "true" },
    ],
  }),
  make({
    createdAt: iso(1, 15, 22), actorName: "Anna Weber (Admin)", actorEmail: "anna@projectjoy.app",
    role: "admin", module: "promotions", type: "promotion_created", action: "Promotion created",
    description: "Created ‘Spring Warmth 15%’ promotion valid for two weeks.",
    result: "success", severity: "success",
    ip: "10.0.0.15", country: "DE", device: "Desktop", browser: "Firefox 130", language: "de",
    relations: { promotionId: "PROMO-118" },
  }),
  make({
    createdAt: iso(2, 8, 10), actorName: "Jean Dupont", actorEmail: "jean@example.com",
    role: "user", module: "auth", type: "registration", action: "New registration",
    description: "New account created via email sign-up.", result: "success", severity: "success",
    ip: "82.66.10.4", country: "FR", device: "Mobile", browser: "Chrome 127", language: "fr",
  }),
  make({
    createdAt: iso(2, 8, 30), actorName: "Jean Dupont", actorEmail: "jean@example.com",
    role: "user", module: "auth", type: "email_change", action: "Email changed",
    description: "Primary email address updated.", result: "success", severity: "warning",
    ip: "82.66.10.4", country: "FR", device: "Mobile", browser: "Chrome 127", language: "fr",
    changes: [{ field: "email", oldValue: "old@example.com", newValue: "jean@example.com" }],
  }),
  make({
    createdAt: iso(2, 19, 45), actorName: "Ivan Melnyk", actorEmail: "ivan@example.com",
    role: "vip", module: "credits", type: "credit_purchase", action: "Credits purchased",
    description: "Purchased ‘Popular’ credits pack (250 credits).",
    result: "success", severity: "success",
    ip: "31.128.44.11", country: "UA", device: "Desktop", browser: "Edge 127", language: "uk",
    relations: { paymentId: "pi_demo_88231" },
  }),
  make({
    createdAt: iso(3, 10, 5), actorName: "Ivan Melnyk", actorEmail: "ivan@example.com",
    role: "vip", module: "studio", type: "order_created", action: "Studio order",
    description: "Song greeting requested — 2 minutes, priority queue.",
    result: "success", severity: "info",
    ip: "31.128.44.11", country: "UA", device: "Desktop", browser: "Edge 127", language: "uk",
    relations: { orderId: "PJ-10430" },
  }),
  make({
    createdAt: iso(3, 12, 40), actorName: "Generator Service", actorEmail: "generator@projectjoy.app",
    role: "system", module: "system", type: "system_event", action: "Generator service restarted",
    description: "Distribution generator restarted after configuration update.",
    result: "success", severity: "info", ip: "—", country: "—", device: "Server", browser: "—", language: "en",
  }),
  make({
    createdAt: iso(4, 7, 55), actorName: "Sophie Laurent", actorEmail: "sophie@example.com",
    role: "customer", module: "orders", type: "order_completed", action: "Order completed",
    description: "Order PJ-10422 marked as completed and delivered.",
    result: "success", severity: "success",
    ip: "212.55.99.4", country: "FR", device: "Tablet", browser: "Safari 17", language: "fr",
    relations: { orderId: "PJ-10422" },
  }),
  make({
    createdAt: iso(4, 16, 10), actorName: "Sophie Laurent", actorEmail: "sophie@example.com",
    role: "customer", module: "orders", type: "order_cancelled", action: "Order cancelled",
    description: "Customer cancelled duplicate order and requested refund.",
    result: "success", severity: "warning",
    ip: "212.55.99.4", country: "FR", device: "Tablet", browser: "Safari 17", language: "fr",
    relations: { orderId: "PJ-10423" },
  }),
  make({
    createdAt: iso(4, 16, 15), actorName: "Anna Weber (Admin)", actorEmail: "anna@projectjoy.app",
    role: "admin", module: "payments", type: "refund", action: "Refund issued",
    description: "Full refund €12.90 issued for PJ-10423.",
    result: "success", severity: "success",
    ip: "10.0.0.15", country: "DE", device: "Desktop", browser: "Firefox 130", language: "de",
    relations: { orderId: "PJ-10423", paymentId: "pi_demo_88222" },
  }),
  make({
    createdAt: iso(5, 3, 30), actorName: "Unknown", actorEmail: "—",
    role: "guest", module: "auth", type: "security_event", action: "Suspicious activity",
    description: "10 rapid sign-in attempts against multiple accounts from a single IP.",
    result: "blocked", severity: "critical",
    ip: "45.220.11.208", country: "—", device: "Desktop", browser: "Unknown", language: "en",
  }),
  make({
    createdAt: iso(5, 11, 0), actorName: "Anna Weber (Admin)", actorEmail: "anna@projectjoy.app",
    role: "admin", module: "platform", type: "admin_action", action: "Permission granted",
    description: "Granted moderator role to user maria@example.com.",
    result: "success", severity: "warning",
    ip: "10.0.0.15", country: "DE", device: "Desktop", browser: "Firefox 130", language: "de",
    changes: [{ field: "role", oldValue: "user", newValue: "moderator" }],
    relations: { userId: "USR-00214" },
  }),
  make({
    createdAt: iso(6, 9, 22), actorName: "Translation Service", actorEmail: "i18n@projectjoy.app",
    role: "system", module: "languages", type: "translation_created", action: "Translations imported",
    description: "Bulk import of 128 interface strings across 6 languages.",
    result: "success", severity: "info", ip: "—", country: "—", device: "Server", browser: "—", language: "en",
  }),
  make({
    createdAt: iso(7, 20, 12), actorName: "Anna Weber (Admin)", actorEmail: "anna@projectjoy.app",
    role: "admin", module: "catalog", type: "content_deleted", action: "Template deleted",
    description: "Removed deprecated template ‘Old Winter Card’.",
    result: "success", severity: "warning",
    ip: "10.0.0.15", country: "DE", device: "Desktop", browser: "Firefox 130", language: "de",
  }),
  make({
    createdAt: iso(8, 5, 30), actorName: "API Client (mobile)", actorEmail: "api@projectjoy.app",
    role: "api", module: "api", type: "api_event", action: "API key rotated",
    description: "Rotated public API key for the mobile client.",
    result: "success", severity: "info", ip: "—", country: "—", device: "Server", browser: "—", language: "en",
    archived: true,
  }),
  make({
    createdAt: iso(10, 14, 10), actorName: "Calendar Service", actorEmail: "calendar@projectjoy.app",
    role: "system", module: "calendar", type: "calendar_event", action: "Scheduled delivery",
    description: "Scheduled greeting dispatched for anniversary reminder.",
    result: "success", severity: "success", ip: "—", country: "—", device: "Server", browser: "—", language: "en",
    archived: true,
  }),
  make({
    createdAt: iso(12, 2, 15), actorName: "System", actorEmail: "system@projectjoy.app",
    role: "system", module: "system", type: "system_event", action: "Configuration changed",
    description: "Storage retention configuration updated to 365 days.",
    result: "success", severity: "info", ip: "—", country: "—", device: "Server", browser: "—", language: "en",
    changes: [{ field: "retention_days", oldValue: "180", newValue: "365" }],
    archived: true,
  }),
  make({
    createdAt: iso(14, 18, 5), actorName: "Piotr Kowalski", actorEmail: "piotr@example.com",
    role: "customer", module: "subscriptions", type: "subscription_purchase", action: "Subscription started",
    description: "Started monthly subscription tier ‘Warmth’.",
    result: "success", severity: "success",
    ip: "83.20.11.15", country: "PL", device: "Desktop", browser: "Chrome 127", language: "pl",
    relations: { paymentId: "pi_demo_88123" },
  }),
];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface AuditStats {
  total: number;
  today: number;
  last7: number;
  failed: number;
  security: number;
  admin: number;
  user: number;
  system: number;
}

export function computeStats(items: AuditRecord[]): AuditStats {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  let today = 0, last7 = 0, failed = 0, security = 0, admin = 0, user = 0, system = 0;
  for (const e of items) {
    const t = Date.parse(e.createdAt);
    if (t >= todayMs) today++;
    if (now - t <= 7 * oneDay) last7++;
    if (e.result === "failed" || e.result === "blocked") failed++;
    if (e.type === "security_event" || e.severity === "critical") security++;
    if (e.role === "admin" || e.role === "moderator") admin++;
    else if (e.role === "user" || e.role === "customer" || e.role === "vip") user++;
    else if (e.role === "system" || e.role === "api") system++;
  }
  return { total: items.length, today, last7, failed, security, admin, user, system };
}

// ---------------------------------------------------------------------------
// Default settings (frontend-only)
// ---------------------------------------------------------------------------

export interface AuditSettings {
  retentionDays: number;
  archiveAfterDays: number;
  logAdmin: boolean;
  logUsers: boolean;
  logApi: boolean;
  logGenerator: boolean;
  logTranslation: boolean;
  logPayments: boolean;
  logNotifications: boolean;
  logCalendar: boolean;
  securityAlerts: boolean;
}

export const DEFAULT_AUDIT_SETTINGS: AuditSettings = {
  retentionDays: 365,
  archiveAfterDays: 90,
  logAdmin: true,
  logUsers: true,
  logApi: true,
  logGenerator: true,
  logTranslation: true,
  logPayments: true,
  logNotifications: true,
  logCalendar: true,
  securityAlerts: true,
};

// Project Joy — Calendar Settings admin module.
// Frontend demonstration data only. No backend integration.

import type { Lang } from "@/lib/i18n";

export type EventTypeId =
  | "birthday" | "wedding_anniv" | "relation_anniv" | "family"
  | "graduation" | "religious" | "personal_holiday" | "travel"
  | "corporate" | "custom";

export const EVENT_TYPES: EventTypeId[] = [
  "birthday", "wedding_anniv", "relation_anniv", "family",
  "graduation", "religious", "personal_holiday", "travel",
  "corporate", "custom",
];

export interface EventTypeConfig {
  id: EventTypeId;
  icon: string;
  color: string;
  active: boolean;
  recurringByDefault: boolean;
  defaultReminderDays: number;
  allowScheduledGift: boolean;
  audience: "all" | "subscribers";
  order: number;
}

export const DEFAULT_EVENT_TYPES: EventTypeConfig[] = [
  { id: "birthday",       icon: "🎂", color: "#f59e0b", active: true,  recurringByDefault: true,  defaultReminderDays: 7,  allowScheduledGift: true,  audience: "all",         order: 1 },
  { id: "wedding_anniv",  icon: "💍", color: "#ec4899", active: true,  recurringByDefault: true,  defaultReminderDays: 7,  allowScheduledGift: true,  audience: "all",         order: 2 },
  { id: "relation_anniv", icon: "💖", color: "#f43f5e", active: true,  recurringByDefault: true,  defaultReminderDays: 3,  allowScheduledGift: true,  audience: "all",         order: 3 },
  { id: "family",         icon: "👪", color: "#8b5cf6", active: true,  recurringByDefault: false, defaultReminderDays: 3,  allowScheduledGift: true,  audience: "all",         order: 4 },
  { id: "graduation",     icon: "🎓", color: "#0ea5e9", active: true,  recurringByDefault: false, defaultReminderDays: 7,  allowScheduledGift: true,  audience: "all",         order: 5 },
  { id: "religious",      icon: "🕊️", color: "#14b8a6", active: true,  recurringByDefault: true,  defaultReminderDays: 3,  allowScheduledGift: false, audience: "all",         order: 6 },
  { id: "personal_holiday", icon: "🎉", color: "#eab308", active: true, recurringByDefault: true, defaultReminderDays: 3,  allowScheduledGift: true,  audience: "all",         order: 7 },
  { id: "travel",         icon: "✈️", color: "#6366f1", active: true,  recurringByDefault: false, defaultReminderDays: 2,  allowScheduledGift: false, audience: "all",         order: 8 },
  { id: "corporate",      icon: "🏢", color: "#64748b", active: true,  recurringByDefault: false, defaultReminderDays: 7,  allowScheduledGift: true,  audience: "subscribers", order: 9 },
  { id: "custom",         icon: "⭐", color: "#a3a3a3", active: true,  recurringByDefault: false, defaultReminderDays: 3,  allowScheduledGift: true,  audience: "all",         order: 10 },
];

export type Recurrence = "once" | "yearly" | "monthly" | "weekly" | "custom";
export type Feb29Rule = "feb28" | "mar1" | "leap_only";
export type ReminderChannel = "email" | "push" | "sms" | "internal";
export type SubscriptionTier = "none" | "monthly" | "yearly";
export type DeliveryChannel = "email" | "link" | "push" | "sms";
export type DeliveryWindow = "morning" | "afternoon" | "evening" | "custom";

export type EventStatus =
  | "draft" | "scheduled" | "preparing" | "ready" | "queued"
  | "sent" | "delivered" | "failed" | "cancelled" | "manual_review";

export const EVENT_STATUSES: EventStatus[] = [
  "draft", "scheduled", "preparing", "ready", "queued",
  "sent", "delivered", "failed", "cancelled", "manual_review",
];

export const STATUS_TONE: Record<EventStatus, string> = {
  draft:         "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  scheduled:     "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  preparing:     "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  ready:         "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200",
  queued:        "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
  sent:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  delivered:     "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200",
  failed:        "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  cancelled:     "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-200",
  manual_review: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
};

export interface PersonalEvent {
  id: string;
  customer: string;
  eventType: EventTypeId;
  name: string;
  recipient: string;
  date: string;          // ISO
  recurrence: Recurrence;
  timezone: string;
  recipientTimezone: string;
  reminderDaysBefore: number[];
  reminderChannel: ReminderChannel;
  reminderPaused: boolean;
  scheduledGift: boolean;
  deliveryChannel: DeliveryChannel;
  deliveryWindow: DeliveryWindow;
  status: EventStatus;
  subscription: SubscriptionTier;
  country: string;
  language: Lang;
  attempts: DeliveryAttempt[];
  createdAt: string;
}

export interface DeliveryAttempt {
  n: number;
  channel: DeliveryChannel;
  date: string;
  status: EventStatus;
  error: string;
}

export const IANA_TIMEZONES = [
  "Europe/Berlin", "Europe/Kyiv", "Europe/Warsaw", "Europe/Paris",
  "Europe/London", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam",
  "America/New_York", "America/Toronto", "America/Los_Angeles",
  "America/Chicago", "America/Sao_Paulo", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Dubai", "Asia/Jerusalem", "Australia/Sydney", "UTC",
];

function iso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

export const DEMO_EVENTS: PersonalEvent[] = [
  {
    id: "EV-1001", customer: "Anna M.", eventType: "birthday",
    name: "Mom's Birthday", recipient: "Elena M.", date: iso(4),
    recurrence: "yearly", timezone: "Europe/Berlin", recipientTimezone: "Europe/Kyiv",
    reminderDaysBefore: [7, 1], reminderChannel: "email", reminderPaused: false,
    scheduledGift: true, deliveryChannel: "email", deliveryWindow: "morning",
    status: "scheduled", subscription: "yearly", country: "DE", language: "en",
    attempts: [], createdAt: iso(-14),
  },
  {
    id: "EV-1002", customer: "Piotr K.", eventType: "wedding_anniv",
    name: "Wedding Anniversary", recipient: "Maria K.", date: iso(12),
    recurrence: "yearly", timezone: "Europe/Warsaw", recipientTimezone: "Europe/Warsaw",
    reminderDaysBefore: [14, 3], reminderChannel: "push", reminderPaused: false,
    scheduledGift: true, deliveryChannel: "link", deliveryWindow: "evening",
    status: "preparing", subscription: "monthly", country: "PL", language: "pl",
    attempts: [], createdAt: iso(-30),
  },
  {
    id: "EV-1003", customer: "Olena S.", eventType: "graduation",
    name: "Sister's Graduation", recipient: "Iryna S.", date: iso(28),
    recurrence: "once", timezone: "Europe/Kyiv", recipientTimezone: "Europe/Kyiv",
    reminderDaysBefore: [7], reminderChannel: "email", reminderPaused: false,
    scheduledGift: false, deliveryChannel: "email", deliveryWindow: "afternoon",
    status: "draft", subscription: "none", country: "UA", language: "uk",
    attempts: [], createdAt: iso(-2),
  },
  {
    id: "EV-1004", customer: "Marc D.", eventType: "birthday",
    name: "Best Friend Birthday", recipient: "Lucas P.", date: iso(-2),
    recurrence: "yearly", timezone: "Europe/Paris", recipientTimezone: "America/New_York",
    reminderDaysBefore: [3, 1], reminderChannel: "email", reminderPaused: false,
    scheduledGift: true, deliveryChannel: "email", deliveryWindow: "morning",
    status: "failed", subscription: "monthly", country: "FR", language: "fr",
    attempts: [
      { n: 1, channel: "email", date: iso(-2), status: "failed", error: "SMTP bounce (placeholder)" },
      { n: 2, channel: "email", date: iso(-1), status: "failed", error: "Recipient inbox full (placeholder)" },
    ],
    createdAt: iso(-40),
  },
  {
    id: "EV-1005", customer: "Ivan V.", eventType: "personal_holiday",
    name: "Christmas Greeting", recipient: "Nadia V.", date: iso(60),
    recurrence: "yearly", timezone: "Europe/Kyiv", recipientTimezone: "Europe/Kyiv",
    reminderDaysBefore: [14, 7, 1], reminderChannel: "email", reminderPaused: false,
    scheduledGift: true, deliveryChannel: "email", deliveryWindow: "morning",
    status: "scheduled", subscription: "yearly", country: "UA", language: "uk",
    attempts: [], createdAt: iso(-10),
  },
  {
    id: "EV-1006", customer: "Hans B.", eventType: "relation_anniv",
    name: "Anniversary Song", recipient: "Petra B.", date: iso(5),
    recurrence: "yearly", timezone: "Europe/Berlin", recipientTimezone: "Europe/Berlin",
    reminderDaysBefore: [7], reminderChannel: "email", reminderPaused: true,
    scheduledGift: true, deliveryChannel: "email", deliveryWindow: "evening",
    status: "ready", subscription: "monthly", country: "DE", language: "de",
    attempts: [], createdAt: iso(-8),
  },
  {
    id: "EV-1007", customer: "Sofia R.", eventType: "birthday",
    name: "Non-Sub Scheduled Card", recipient: "Alex R.", date: iso(20),
    recurrence: "yearly", timezone: "Europe/Madrid", recipientTimezone: "Europe/Madrid",
    reminderDaysBefore: [3], reminderChannel: "email", reminderPaused: false,
    scheduledGift: true, deliveryChannel: "email", deliveryWindow: "morning",
    status: "scheduled", subscription: "none", country: "ES", language: "en",
    attempts: [], createdAt: iso(-5),
  },
  {
    id: "EV-1008", customer: "Lena F.", eventType: "family",
    name: "Family Gathering", recipient: "Family", recipient_group: undefined as unknown as string,
    date: iso(40),
    recurrence: "once", timezone: "Europe/Berlin", recipientTimezone: "Europe/Berlin",
    reminderDaysBefore: [14], reminderChannel: "internal", reminderPaused: false,
    scheduledGift: false, deliveryChannel: "email", deliveryWindow: "afternoon",
    status: "manual_review", subscription: "yearly", country: "DE", language: "de",
    attempts: [], createdAt: iso(-3),
  },
];

// --- Subscription access matrix (editable, in-memory) ------------------

export interface SubscriptionAccess {
  tier: SubscriptionTier;
  schedulingEnabled: boolean;
  maxDaysAhead: number;
  creditCostNonSub: number;
  maxScheduledGifts: number;
  maxActiveReminders: number;
  allowedChannels: DeliveryChannel[];
  gracePeriodDays: number;
  onExpiration: "keep" | "require_credits" | "ask_renew" | "manual_review";
}

export const DEFAULT_ACCESS: SubscriptionAccess[] = [
  { tier: "none",    schedulingEnabled: true, maxDaysAhead: 180, creditCostNonSub: 25, maxScheduledGifts: 5,  maxActiveReminders: 5,  allowedChannels: ["email","link"], gracePeriodDays: 0,  onExpiration: "keep" },
  { tier: "monthly", schedulingEnabled: true, maxDaysAhead: 45,  creditCostNonSub: 0,  maxScheduledGifts: 25, maxActiveReminders: 25, allowedChannels: ["email","link","push"], gracePeriodDays: 7,  onExpiration: "keep" },
  { tier: "yearly",  schedulingEnabled: true, maxDaysAhead: 400, creditCostNonSub: 0,  maxScheduledGifts: 500,maxActiveReminders: 500,allowedChannels: ["email","link","push","sms"], gracePeriodDays: 30, onExpiration: "keep" },
];

// --- Reminder / safety defaults ---------------------------------------

export interface ReminderSettings {
  defaultChannel: ReminderChannel;
  maxPerEvent: number;
  quietStart: string;
  quietEnd: string;
  retryFailed: boolean;
  allowUserDisable: boolean;
  feb29Rule: Feb29Rule;
}

export const DEFAULT_REMINDER: ReminderSettings = {
  defaultChannel: "email", maxPerEvent: 5, quietStart: "22:00", quietEnd: "08:00",
  retryFailed: true, allowUserDisable: true, feb29Rule: "feb28",
};

export interface SafetyLimits {
  maxEventsPerUser: number;
  maxRemindersPerEvent: number;
  maxScheduledGiftsPerUser: number;
  maxScheduledGiftsPerDay: number;
  minLeadTimeMinutes: number;
  maxDaysInFuture: number;
  maxRetryAttempts: number;
  emergencyPause: boolean;
  reviewHighValue: boolean;
  reviewLargeGroup: boolean;
}

export const DEFAULT_SAFETY: SafetyLimits = {
  maxEventsPerUser: 100, maxRemindersPerEvent: 5, maxScheduledGiftsPerUser: 50,
  maxScheduledGiftsPerDay: 20, minLeadTimeMinutes: 30, maxDaysInFuture: 730,
  maxRetryAttempts: 3, emergencyPause: false, reviewHighValue: true, reviewLargeGroup: true,
};

// --- Holiday sources (future integration placeholders) -----------------

export type HolidaySourceStatus = "not_connected" | "test" | "active" | "disabled" | "error";

export interface HolidaySource {
  id: string;
  nameKey: string;
  countries: string;
  regions: string;
  types: string;
  updateMethod: string;
  lastSync: string | null;
  status: HolidaySourceStatus;
  priority: number;
}

export const DEFAULT_HOLIDAY_SOURCES: HolidaySource[] = [
  { id: "src-official",  nameKey: "cs_src_official",  countries: "—", regions: "—", types: "Public", updateMethod: "API",    lastSync: null, status: "not_connected", priority: 1 },
  { id: "src-religious", nameKey: "cs_src_religious", countries: "—", regions: "—", types: "Religious", updateMethod: "Calendar", lastSync: null, status: "not_connected", priority: 2 },
  { id: "src-regional",  nameKey: "cs_src_regional",  countries: "—", regions: "—", types: "Regional", updateMethod: "API",    lastSync: null, status: "not_connected", priority: 3 },
  { id: "src-pj",        nameKey: "cs_src_pj",        countries: "Global", regions: "—", types: "Custom", updateMethod: "Manual", lastSync: null, status: "test", priority: 4 },
  { id: "src-admin",     nameKey: "cs_src_admin",     countries: "—", regions: "—", types: "Custom", updateMethod: "Manual", lastSync: null, status: "active", priority: 5 },
];

// --- Custom admin events ----------------------------------------------

export interface AdminEvent {
  id: string;
  name: string;
  internalDescription: string;
  customerDescription: string;
  startDate: string;
  endDate: string;
  countries: string;
  languages: string;
  relatedPromotion: string;
  relatedCategory: string;
  active: boolean;
  visible: boolean;
}

export const DEFAULT_ADMIN_EVENTS: AdminEvent[] = [
  { id: "AE-01", name: "Project Joy Anniversary", internalDescription: "Platform anniversary", customerDescription: "Celebrating our journey", startDate: iso(90), endDate: iso(97), countries: "All", languages: "All", relatedPromotion: "PJ-ANNIV", relatedCategory: "seasonal", active: true, visible: true },
  { id: "AE-02", name: "Mother's Day Campaign",    internalDescription: "Mother's Day promo", customerDescription: "Give more than greetings", startDate: iso(30), endDate: iso(37), countries: "EU, US", languages: "en, de, fr", relatedPromotion: "MOM26", relatedCategory: "family", active: true, visible: true },
  { id: "AE-03", name: "Christmas Campaign",        internalDescription: "Year-end campaign", customerDescription: "Warm greetings for the season", startDate: iso(150), endDate: iso(175), countries: "All", languages: "All", relatedPromotion: "XMAS26", relatedCategory: "seasonal", active: false, visible: false },
];

// --- History log -------------------------------------------------------

export interface HistoryEntry {
  id: string;
  date: string;
  admin: string;
  actionKey: string;
  entity: string;
  previous: string;
  next: string;
}

export const DEMO_HISTORY: HistoryEntry[] = [
  { id: "H-1", date: iso(-1), admin: "Admin", actionKey: "cs_hist_event_created",    entity: "EV-1007", previous: "—",       next: "scheduled" },
  { id: "H-2", date: iso(-1), admin: "Admin", actionKey: "cs_hist_reminder_added",   entity: "EV-1001", previous: "1",       next: "2" },
  { id: "H-3", date: iso(-2), admin: "Admin", actionKey: "cs_hist_delivery_failed",  entity: "EV-1004", previous: "sent",    next: "failed" },
  { id: "H-4", date: iso(-3), admin: "Admin", actionKey: "cs_hist_rule_changed",     entity: "monthly", previous: "30 days", next: "45 days" },
  { id: "H-5", date: iso(-5), admin: "Admin", actionKey: "cs_hist_reminder_paused",  entity: "EV-1006", previous: "active",  next: "paused" },
  { id: "H-6", date: iso(-6), admin: "Admin", actionKey: "cs_hist_subscription_changed", entity: "yearly", previous: "500", next: "500" },
  { id: "H-7", date: iso(-8), admin: "Admin", actionKey: "cs_hist_event_edited",     entity: "EV-1003", previous: "draft",   next: "draft" },
];

// --- Statistics --------------------------------------------------------

export function computeCalendarStats(events: PersonalEvent[]) {
  const active = events.filter(e => e.status !== "cancelled" && e.status !== "delivered").length;
  const birthdays = events.filter(e => e.eventType === "birthday").length;
  const anniversaries = events.filter(e => e.eventType === "wedding_anniv" || e.eventType === "relation_anniv").length;
  const scheduledGifts = events.filter(e => e.scheduledGift).length;
  const now = new Date();
  const in7 = new Date(); in7.setDate(now.getDate() + 7);
  const remindersThisWeek = events.filter(e => {
    const d = new Date(e.date);
    return d >= now && d <= in7 && !e.reminderPaused;
  }).length;
  const failed = events.filter(e => e.status === "failed").length;
  const monthly = events.filter(e => e.subscription === "monthly").length;
  const yearly = events.filter(e => e.subscription === "yearly").length;
  return { active, birthdays, anniversaries, scheduledGifts, remindersThisWeek, failed, monthly, yearly };
}

export function nextEventId(existing: PersonalEvent[]): string {
  const nums = existing.map(e => parseInt(e.id.replace("EV-", ""), 10) || 0);
  return `EV-${Math.max(1000, ...nums) + 1}`;
}
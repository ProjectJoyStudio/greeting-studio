// ---------------------------------------------------------------------------
// Project Joy — Platform Settings (frontend-only demo state).
// Types, demonstration values and lightweight helpers powering the Admin
// Platform Settings module. A future backend will replace this in-memory
// store; the shape here is the integration contract.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

export type IndicatorStatus = "online" | "warning" | "error";

export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "PLN", "UAH", "CHF"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const SUPPORTED_TIMEZONES = [
  "UTC",
  "Europe/Berlin",
  "Europe/Warsaw",
  "Europe/Paris",
  "Europe/London",
  "Europe/Kyiv",
  "Europe/Moscow",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
] as const;
export type Timezone = (typeof SUPPORTED_TIMEZONES)[number];

export const DATE_FORMATS = ["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMM YYYY"] as const;
export const TIME_FORMATS = ["24h", "12h"] as const;
export const WEEK_STARTS = ["monday", "sunday", "saturday"] as const;

export const COUNTRY_CODES = [
  "DE", "AT", "CH", "PL", "FR", "GB", "UA", "US", "CA", "IT", "ES", "NL",
] as const;

// ---------- General ----------
export interface GeneralSettings {
  platformName: string;
  platformDescription: string;
  logoPlaceholder: string;
  supportEmail: string;
  notificationEmail: string;
  supportPhone: string;
  defaultLanguage: Lang;
  defaultCurrency: Currency;
  defaultCountry: (typeof COUNTRY_CODES)[number];
  defaultTimezone: Timezone;
  dateFormat: (typeof DATE_FORMATS)[number];
  timeFormat: (typeof TIME_FORMATS)[number];
  weekStart: (typeof WEEK_STARTS)[number];
}

// ---------- Domain ----------
export interface DomainSettings {
  primaryDomain: string;
  testingDomain: string;
  sslStatus: IndicatorStatus;
  sslExpiresAt: string; // ISO date
  httpsEnabled: boolean;
  httpRedirect: boolean;
  verificationStatus: "verified" | "pending" | "failed";
  dnsRecordsPlaceholder: { type: string; host: string; value: string }[];
}

// ---------- Server ----------
export interface ServerStatus {
  status: IndicatorStatus;
  cpuPercent: number;
  ramPercent: number;
  storagePercent: number;
  uptimeDays: number;
  operatingSystem: string;
  nodeVersion: string;
  databaseVersion: string;
}

// ---------- Maintenance ----------
export interface MaintenanceSettings {
  enabled: boolean;
  adminsOnly: boolean;
  message: string;
  scheduledEnd: string; // ISO or empty
}

// ---------- Backup ----------
export type BackupType = "full" | "database" | "media" | "config";
export interface BackupRecord {
  id: string;
  createdAt: string;
  sizeMb: number;
  type: BackupType;
  automatic: boolean;
}
export interface BackupSettings {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  retentionDays: number;
  history: BackupRecord[];
}

// ---------- Security ----------
export type PasswordComplexity = "basic" | "standard" | "strong";
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  passwordMinLength: number;
  passwordComplexity: PasswordComplexity;
  maxLoginAttempts: number;
  autoLockMinutes: number;
  sessionTimeoutMinutes: number;
  lastSecurityScan: string; // ISO
  status: IndicatorStatus;
}

// ---------- Monitoring ----------
export type MonitoringKind = "server" | "database" | "ssl" | "domain" | "email" | "backup";
export interface MonitoringCheck {
  kind: MonitoringKind;
  status: IndicatorStatus;
  lastCheck: string;
  responseMs: number;
}

// ---------- Platform information ----------
export interface PlatformInfo {
  platformVersion: string;
  adminVersion: string;
  lastUpdate: string;
  avgResponseMs: number;
  registeredUsers: number;
  totalOrders: number;
  catalogItems: number;
  totalDeliveries: number;
}

// ---------- Complete state ----------
export interface PlatformSettingsState {
  general: GeneralSettings;
  domain: DomainSettings;
  server: ServerStatus;
  maintenance: MaintenanceSettings;
  backup: BackupSettings;
  security: SecuritySettings;
  monitoring: MonitoringCheck[];
  info: PlatformInfo;
}

// ---------------------------------------------------------------------------
// Demonstration defaults.
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();
const daysAhead = (n: number) =>
  new Date(Date.now() + n * 24 * 3600 * 1000).toISOString();

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsState = {
  general: {
    platformName: "Project Joy",
    platformDescription:
      "Digital greetings crafted with warmth — cards, animations, songs, voice and video for every meaningful moment.",
    logoPlaceholder: "PJ",
    supportEmail: "support@project-joy.example",
    notificationEmail: "notifications@project-joy.example",
    supportPhone: "+49 30 000 0000",
    defaultLanguage: "en",
    defaultCurrency: "EUR",
    defaultCountry: "DE",
    defaultTimezone: "Europe/Berlin",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24h",
    weekStart: "monday",
  },
  domain: {
    primaryDomain: "project-joy.example",
    testingDomain: "staging.project-joy.example",
    sslStatus: "online",
    sslExpiresAt: daysAhead(62),
    httpsEnabled: true,
    httpRedirect: true,
    verificationStatus: "verified",
    dnsRecordsPlaceholder: [
      { type: "A", host: "@", value: "185.158.133.1" },
      { type: "A", host: "www", value: "185.158.133.1" },
      { type: "TXT", host: "_verify", value: "project-joy-demo=************" },
    ],
  },
  server: {
    status: "online",
    cpuPercent: 34,
    ramPercent: 58,
    storagePercent: 41,
    uptimeDays: 27,
    operatingSystem: "Linux (placeholder)",
    nodeVersion: "v20.x (placeholder)",
    databaseVersion: "PostgreSQL (placeholder)",
  },
  maintenance: {
    enabled: false,
    adminsOnly: true,
    message:
      "Project Joy is preparing something special. We'll be back in a moment — thank you for your patience.",
    scheduledEnd: "",
  },
  backup: {
    daily: true,
    weekly: true,
    monthly: false,
    retentionDays: 30,
    history: [
      { id: "bkp_2601", createdAt: daysAgo(0), sizeMb: 412, type: "full", automatic: true },
      { id: "bkp_2600", createdAt: daysAgo(1), sizeMb: 405, type: "database", automatic: true },
      { id: "bkp_2599", createdAt: daysAgo(2), sizeMb: 398, type: "full", automatic: true },
      { id: "bkp_2598", createdAt: daysAgo(6), sizeMb: 380, type: "media", automatic: false },
      { id: "bkp_2597", createdAt: daysAgo(13), sizeMb: 372, type: "full", automatic: true },
      { id: "bkp_2596", createdAt: daysAgo(27), sizeMb: 351, type: "config", automatic: false },
    ],
  },
  security: {
    twoFactorEnabled: true,
    passwordMinLength: 10,
    passwordComplexity: "strong",
    maxLoginAttempts: 5,
    autoLockMinutes: 15,
    sessionTimeoutMinutes: 60,
    lastSecurityScan: daysAgo(2),
    status: "online",
  },
  monitoring: [
    { kind: "server",   status: "online",  lastCheck: now(), responseMs: 42 },
    { kind: "database", status: "online",  lastCheck: now(), responseMs: 18 },
    { kind: "ssl",      status: "online",  lastCheck: now(), responseMs: 96 },
    { kind: "domain",   status: "online",  lastCheck: now(), responseMs: 61 },
    { kind: "email",    status: "warning", lastCheck: now(), responseMs: 240 },
    { kind: "backup",   status: "online",  lastCheck: now(), responseMs: 12 },
  ],
  info: {
    platformVersion: "1.4.0 (demo)",
    adminVersion: "0.9.0 (demo)",
    lastUpdate: daysAgo(5),
    avgResponseMs: 148,
    registeredUsers: 12480,
    totalOrders: 8342,
    catalogItems: 612,
    totalDeliveries: 24980,
  },
};

// ---------------------------------------------------------------------------
// Validation helpers.
// ---------------------------------------------------------------------------

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface FieldError {
  field: string;
  messageKey: string;
}

export function validateGeneral(g: GeneralSettings): FieldError[] {
  const errs: FieldError[] = [];
  if (!g.platformName.trim()) errs.push({ field: "platformName", messageKey: "err_required" });
  if (!g.supportEmail.trim()) errs.push({ field: "supportEmail", messageKey: "err_required" });
  else if (!EMAIL_RE.test(g.supportEmail)) errs.push({ field: "supportEmail", messageKey: "err_email" });
  if (!g.notificationEmail.trim()) errs.push({ field: "notificationEmail", messageKey: "err_required" });
  else if (!EMAIL_RE.test(g.notificationEmail)) errs.push({ field: "notificationEmail", messageKey: "err_email" });
  if (!g.defaultLanguage) errs.push({ field: "defaultLanguage", messageKey: "err_required" });
  if (!g.defaultCurrency) errs.push({ field: "defaultCurrency", messageKey: "err_required" });
  if (!g.defaultTimezone) errs.push({ field: "defaultTimezone", messageKey: "err_required" });
  return errs;
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function statusTone(s: IndicatorStatus): string {
  switch (s) {
    case "online":  return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "warning": return "bg-amber-100 text-amber-800 border-amber-200";
    case "error":   return "bg-rose-100 text-rose-700 border-rose-200";
  }
}

export function progressTone(p: number): string {
  if (p >= 85) return "bg-rose-500";
  if (p >= 65) return "bg-amber-500";
  return "bg-emerald-500";
}
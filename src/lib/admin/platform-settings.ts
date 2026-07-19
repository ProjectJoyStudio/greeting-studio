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

// ---------------------------------------------------------------------------
// Part 2 — advanced integrations & scaling. All frontend demonstration data.
// ---------------------------------------------------------------------------

export const GENERATOR_TYPES = [
  "images", "video", "animation", "music", "voice", "text", "translation",
] as const;
export type GeneratorType = (typeof GENERATOR_TYPES)[number];

export type GeneratorStatus = "online" | "offline" | "busy" | "maintenance";

export interface GeneratorRecord {
  id: string;
  name: string;
  type: GeneratorType;
  status: GeneratorStatus;
  priority: number; // 1..10 (higher = preferred)
  loadPercent: number;
  queue: number;
  avgSeconds: number;
  dailyRequests: number;
  errorRatePercent: number;
  enabled: boolean;
}

export type BalancerMode =
  | "lowest_queue" | "fastest" | "round_robin" | "priority" | "cheapest";

export interface BalancerSettings {
  enabled: boolean;
  mode: BalancerMode;
  maxQueueLength: number;
  maxConcurrent: number;
  autoOverflow: boolean;
  autoFailover: boolean;
  retryFailed: boolean;
  queueTimeoutSeconds: number;
}

export interface FailoverSettings {
  primaryId: string;
  secondaryId: string;
  tertiaryId: string;
  history: {
    id: string;
    at: string;
    from: string;
    to: string;
    reason: string;
  }[];
}

export const TRANSLATION_PROVIDERS = [
  "google", "deepl", "microsoft", "openai", "custom",
] as const;
export type TranslationProvider = (typeof TRANSLATION_PROVIDERS)[number];

export interface TranslationSettings {
  enabled: boolean;
  primary: TranslationProvider;
  backup: TranslationProvider;
  maxRetries: number;
  dailyLimit: number;
  autoDetectLanguage: boolean;
  translateTitle: boolean;
  translateDescription: boolean;
  translateGreeting: boolean;
  translateGeneratedText: boolean;
}

export interface OverlaySettings {
  autoPosition: boolean;
  autoFontSize: boolean;
  autoWrap: boolean;
  safeMarginPercent: number;
  shadow: boolean;
  outline: boolean;
  opacityPercent: number;
  languageSpecificFonts: boolean;
}

export interface StorageProviderRecord {
  id: string;
  name: string;
  status: IndicatorStatus;
  usedGb: number;
  totalGb: number;
  files: number;
  videos: number;
  images: number;
  music: number;
  backups: number;
  primary: boolean;
}

export interface ApiConnectionRecord {
  id: string;
  service: string;
  status: IndicatorStatus;
  apiKeyMasked: string;
  lastCheck: string;
  avgResponseMs: number;
  connected: boolean;
}

export type HealthKind =
  | "generators" | "translation" | "storage" | "api"
  | "queue" | "database" | "server";
export type HealthStatus = "healthy" | "warning" | "critical";
export interface HealthCard {
  kind: HealthKind;
  status: HealthStatus;
  message: string;
}

export interface ScalingSettings {
  enabled: boolean;
  minGenerators: number;
  maxGenerators: number;
  autoBalancing: boolean;
  peakMode: boolean;
  nightMode: boolean;
  holidayMode: boolean;
}

export type LogCategory =
  | "generation" | "translation" | "storage" | "api" | "balancer";
export type LogResult = "success" | "warning" | "error";
export interface LogRecord {
  id: string;
  at: string;
  category: LogCategory;
  service: string;
  action: string;
  durationMs: number;
  result: LogResult;
}

export interface PlatformAdvancedState {
  generators: GeneratorRecord[];
  balancer: BalancerSettings;
  failover: FailoverSettings;
  translation: TranslationSettings;
  overlay: OverlaySettings;
  storage: StorageProviderRecord[];
  apis: ApiConnectionRecord[];
  health: HealthCard[];
  scaling: ScalingSettings;
  logs: LogRecord[];
}

const isoAgo = (min: number) =>
  new Date(Date.now() - min * 60 * 1000).toISOString();

export const DEFAULT_PLATFORM_ADVANCED: PlatformAdvancedState = {
  generators: [
    { id: "gen_lyra",   name: "Lyra Images",    type: "images",      status: "online",      priority: 9, loadPercent: 42, queue: 3, avgSeconds: 14,  dailyRequests: 4820, errorRatePercent: 0.4, enabled: true },
    { id: "gen_prism",  name: "Prism Video",    type: "video",       status: "busy",        priority: 8, loadPercent: 78, queue: 11,avgSeconds: 82,  dailyRequests: 1240, errorRatePercent: 1.1, enabled: true },
    { id: "gen_wisp",   name: "Wisp Animation", type: "animation",   status: "online",      priority: 7, loadPercent: 31, queue: 2, avgSeconds: 46,  dailyRequests:  980, errorRatePercent: 0.7, enabled: true },
    { id: "gen_chord",  name: "Chord Music",    type: "music",       status: "online",      priority: 8, loadPercent: 25, queue: 1, avgSeconds: 38,  dailyRequests: 1560, errorRatePercent: 0.3, enabled: true },
    { id: "gen_vox",    name: "Vox Voice",      type: "voice",       status: "online",      priority: 8, loadPercent: 54, queue: 4, avgSeconds: 22,  dailyRequests: 2100, errorRatePercent: 0.5, enabled: true },
    { id: "gen_quill",  name: "Quill Text",     type: "text",        status: "online",      priority: 6, loadPercent: 18, queue: 0, avgSeconds:  6,  dailyRequests: 6420, errorRatePercent: 0.2, enabled: true },
    { id: "gen_beacon", name: "Beacon Translate", type: "translation", status: "maintenance", priority: 5, loadPercent:  0, queue: 0, avgSeconds:  4,  dailyRequests: 3210, errorRatePercent: 0.0, enabled: false },
    { id: "gen_nova",   name: "Nova Images",    type: "images",      status: "offline",     priority: 4, loadPercent:  0, queue: 0, avgSeconds: 18,  dailyRequests:    0, errorRatePercent: 0.0, enabled: false },
  ],
  balancer: {
    enabled: true,
    mode: "lowest_queue",
    maxQueueLength: 80,
    maxConcurrent: 24,
    autoOverflow: true,
    autoFailover: true,
    retryFailed: true,
    queueTimeoutSeconds: 180,
  },
  failover: {
    primaryId: "gen_lyra",
    secondaryId: "gen_nova",
    tertiaryId: "gen_wisp",
    history: [
      { id: "fo_004", at: isoAgo(35),   from: "gen_prism", to: "gen_wisp",  reason: "queue_timeout" },
      { id: "fo_003", at: isoAgo(210),  from: "gen_nova",  to: "gen_lyra",  reason: "provider_offline" },
      { id: "fo_002", at: isoAgo(1240), from: "gen_beacon",to: "gen_quill", reason: "maintenance" },
      { id: "fo_001", at: isoAgo(3060), from: "gen_prism", to: "gen_wisp",  reason: "error_spike" },
    ],
  },
  translation: {
    enabled: true,
    primary: "deepl",
    backup: "google",
    maxRetries: 3,
    dailyLimit: 50000,
    autoDetectLanguage: true,
    translateTitle: true,
    translateDescription: true,
    translateGreeting: true,
    translateGeneratedText: false,
  },
  overlay: {
    autoPosition: true,
    autoFontSize: true,
    autoWrap: true,
    safeMarginPercent: 8,
    shadow: true,
    outline: false,
    opacityPercent: 100,
    languageSpecificFonts: true,
  },
  storage: [
    { id: "st_a", name: "Cloud Storage A", status: "online",  usedGb: 812,  totalGb: 2048, files: 128400, videos: 5240, images: 96210, music: 21050, backups: 5900,  primary: true  },
    { id: "st_b", name: "Cloud Storage B", status: "online",  usedGb: 420,  totalGb: 1024, files:  62100, videos: 3120, images: 41800, music: 12700, backups: 4480,  primary: false },
    { id: "st_c", name: "Cloud Storage C", status: "warning", usedGb: 940,  totalGb: 1024, files:  84300, videos: 4620, images: 58200, music: 15300, backups: 6180,  primary: false },
    { id: "st_local", name: "Local Storage", status: "online", usedGb: 62,  totalGb:  256, files:   4820, videos:  310, images:  3200, music:   860, backups:  450,  primary: false },
  ],
  apis: [
    { id: "api_mail",   service: "Email Delivery",    status: "online",  apiKeyMasked: "sk_live_••••••1428", lastCheck: isoAgo(2),  avgResponseMs: 148, connected: true  },
    { id: "api_sms",    service: "SMS Gateway",       status: "warning", apiKeyMasked: "sk_live_••••••9032", lastCheck: isoAgo(4),  avgResponseMs: 512, connected: true  },
    { id: "api_pay",    service: "Payments",          status: "online",  apiKeyMasked: "sk_live_••••••7215", lastCheck: isoAgo(1),  avgResponseMs: 220, connected: true  },
    { id: "api_push",   service: "Push Notifications",status: "online",  apiKeyMasked: "sk_live_••••••3388", lastCheck: isoAgo(3),  avgResponseMs: 96,  connected: true  },
    { id: "api_maps",   service: "Maps & Geo",        status: "online",  apiKeyMasked: "sk_live_••••••6104", lastCheck: isoAgo(9),  avgResponseMs: 172, connected: true  },
    { id: "api_meta",   service: "Metadata Enrichment", status: "error", apiKeyMasked: "sk_live_••••••2277", lastCheck: isoAgo(28), avgResponseMs: 0,   connected: false },
  ],
  health: [
    { kind: "generators",  status: "healthy",  message: "8/8 providers reachable" },
    { kind: "translation", status: "healthy",  message: "Primary and backup online" },
    { kind: "storage",     status: "warning",  message: "Storage C above 90% usage" },
    { kind: "api",         status: "warning",  message: "1 external API offline" },
    { kind: "queue",       status: "healthy",  message: "Queue within limits" },
    { kind: "database",    status: "healthy",  message: "Read/write latency normal" },
    { kind: "server",      status: "healthy",  message: "CPU and RAM within thresholds" },
  ],
  scaling: {
    enabled: true,
    minGenerators: 2,
    maxGenerators: 12,
    autoBalancing: true,
    peakMode: true,
    nightMode: true,
    holidayMode: false,
  },
  logs: [
    { id: "log_020", at: isoAgo(1),   category: "generation", service: "Lyra Images",    action: "generate_card_image",  durationMs: 12400, result: "success" },
    { id: "log_019", at: isoAgo(2),   category: "generation", service: "Prism Video",    action: "render_short_video",   durationMs: 84200, result: "success" },
    { id: "log_018", at: isoAgo(3),   category: "translation",service: "DeepL",          action: "translate_greeting",   durationMs:   410, result: "success" },
    { id: "log_017", at: isoAgo(5),   category: "storage",    service: "Cloud Storage C",action: "upload_media",         durationMs:  1820, result: "warning" },
    { id: "log_016", at: isoAgo(7),   category: "api",        service: "SMS Gateway",    action: "send_reminder",        durationMs:   730, result: "warning" },
    { id: "log_015", at: isoAgo(11),  category: "balancer",   service: "Load Balancer",  action: "reroute_queue",        durationMs:    24, result: "success" },
    { id: "log_014", at: isoAgo(14),  category: "generation", service: "Wisp Animation", action: "render_animation",     durationMs: 46200, result: "success" },
    { id: "log_013", at: isoAgo(18),  category: "api",        service: "Metadata API",   action: "enrich_order",         durationMs:  6000, result: "error"   },
    { id: "log_012", at: isoAgo(22),  category: "generation", service: "Chord Music",    action: "compose_song",         durationMs: 38400, result: "success" },
    { id: "log_011", at: isoAgo(28),  category: "translation",service: "Google",         action: "translate_title",      durationMs:   210, result: "success" },
    { id: "log_010", at: isoAgo(35),  category: "balancer",   service: "Load Balancer",  action: "failover_trigger",     durationMs:    18, result: "warning" },
    { id: "log_009", at: isoAgo(46),  category: "storage",    service: "Cloud Storage A",action: "sync_media",           durationMs:  4200, result: "success" },
  ],
};

export function computeBalancerLive(generators: GeneratorRecord[]) {
  const active = generators.filter((g) => g.enabled && g.status !== "offline");
  return {
    total: generators.length,
    active: active.length,
    running: active.reduce((s, g) => s + Math.max(0, Math.round(g.loadPercent / 10)), 0),
    waiting: active.reduce((s, g) => s + g.queue, 0),
    completedToday: active.reduce((s, g) => s + g.dailyRequests, 0),
    failedToday: Math.round(
      active.reduce((s, g) => s + g.dailyRequests * (g.errorRatePercent / 100), 0),
    ),
  };
}

// ---------------------------------------------------------------------------
// Load Balancer — extended dashboard (frontend demo state).
// ---------------------------------------------------------------------------

export const CONTENT_TYPES = [
  "images", "videos", "animation", "music", "voice", "translation", "text",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const PRIORITY_TIERS = [
  "vip", "premium", "paid", "scheduled", "free", "manual", "admin",
] as const;
export type PriorityTier = (typeof PRIORITY_TIERS)[number];

export interface SmartRoutingRule {
  content: ContentType;
  targetType: GeneratorType;
  enabled: boolean;
}

export interface BalancerLimits {
  maxJobsPerGenerator: number;
  maxQueue: number;
  maxCpuPercent: number;
  maxMemoryPercent: number;
  maxDailyRequests: number;
  maxHourlyRequests: number;
}

export type BalancerEventKind =
  | "overload" | "disconnected" | "switch" | "queue_moved"
  | "emergency_on" | "emergency_off" | "recovered";
export type BalancerEventSeverity = "info" | "warning" | "critical";

export interface BalancerEvent {
  id: string;
  at: string;
  kind: BalancerEventKind;
  generator?: string;
  severity: BalancerEventSeverity;
  detail: string;
}

export interface BalancerDashboardSettings {
  smartRouting: SmartRoutingRule[];
  priorityOrder: PriorityTier[];
  limits: BalancerLimits;
  emergencyMode: boolean;
  backupGenerators: number;
  queueThreshold: number;
  events: BalancerEvent[];
}

export const DEFAULT_BALANCER_DASHBOARD: BalancerDashboardSettings = {
  smartRouting: [
    { content: "images",      targetType: "images",      enabled: true },
    { content: "videos",      targetType: "video",       enabled: true },
    { content: "animation",   targetType: "animation",   enabled: true },
    { content: "music",       targetType: "music",       enabled: true },
    { content: "voice",       targetType: "voice",       enabled: true },
    { content: "translation", targetType: "translation", enabled: true },
    { content: "text",        targetType: "text",        enabled: true },
  ],
  priorityOrder: ["vip", "premium", "paid", "scheduled", "admin", "manual", "free"],
  limits: {
    maxJobsPerGenerator: 12,
    maxQueue: 80,
    maxCpuPercent: 85,
    maxMemoryPercent: 80,
    maxDailyRequests: 25000,
    maxHourlyRequests: 2400,
  },
  emergencyMode: false,
  backupGenerators: 2,
  queueThreshold: 60,
  events: [
    { id: "bev_010", at: isoAgo(2),   kind: "switch",       generator: "Prism Video",    severity: "warning",  detail: "Rerouted 4 waiting jobs to Wisp Animation." },
    { id: "bev_009", at: isoAgo(8),   kind: "overload",     generator: "Prism Video",    severity: "warning",  detail: "Load reached 78% — throttling free tier." },
    { id: "bev_008", at: isoAgo(21),  kind: "queue_moved",  generator: "Vox Voice",      severity: "info",     detail: "Queue rebalanced: 3 jobs → Quill Text buffer." },
    { id: "bev_007", at: isoAgo(48),  kind: "recovered",    generator: "Chord Music",    severity: "info",     detail: "Provider recovered after transient error." },
    { id: "bev_006", at: isoAgo(96),  kind: "disconnected", generator: "Nova Images",    severity: "critical", detail: "Generator unreachable — marked offline." },
    { id: "bev_005", at: isoAgo(180), kind: "emergency_on", severity: "critical", detail: "Emergency Mode enabled by administrator." },
    { id: "bev_004", at: isoAgo(200), kind: "emergency_off",severity: "info",     detail: "Emergency Mode disabled — normal traffic resumed." },
  ],
};

export function computeBalancerStats(
  generators: GeneratorRecord[],
  dash: BalancerDashboardSettings,
) {
  const total = generators.length;
  const active = generators.filter((g) => g.enabled && g.status !== "offline");
  const offline = generators.filter((g) => g.status === "offline").length;
  const running = active.reduce((s, g) => s + Math.max(0, Math.round(g.loadPercent / 10)), 0);
  const waiting = active.reduce((s, g) => s + g.queue, 0);
  const daily = active.reduce((s, g) => s + g.dailyRequests, 0) || 1;
  const avgProcessingSec = Math.round(
    active.reduce((s, g) => s + g.avgSeconds * g.dailyRequests, 0) / daily,
  );
  const avgLoadPercent = active.length
    ? Math.round(active.reduce((s, g) => s + g.loadPercent, 0) / active.length)
    : 0;
  const errorRate = Number(
    (active.reduce((s, g) => s + g.errorRatePercent * g.dailyRequests, 0) / daily).toFixed(2),
  );
  const completedToday = active.reduce((s, g) => s + g.dailyRequests, 0);
  const failedToday = Math.round(
    active.reduce((s, g) => s + g.dailyRequests * (g.errorRatePercent / 100), 0),
  );
  return {
    total,
    active: active.length,
    offline,
    backup: dash.backupGenerators,
    currentQueue: waiting + running,
    activeJobs: running,
    waitingJobs: waiting,
    avgProcessingSec,
    avgLoadPercent,
    errorRate,
    completedToday,
    failedToday,
  };
}
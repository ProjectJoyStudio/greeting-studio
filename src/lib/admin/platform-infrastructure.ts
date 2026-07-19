// ---------------------------------------------------------------------------
// Project Joy — Platform Settings: Infrastructure & Integrations state.
// Frontend-only demonstration state. No external calls.
// ---------------------------------------------------------------------------

export type ISO = string;

export type ProviderStatus =
  | "not_connected" | "test" | "connected" | "warning" | "error" | "disabled";
export type Mode = "test" | "live";

export function providerTone(s: ProviderStatus): string {
  switch (s) {
    case "connected": return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
    case "test":      return "border-sky-500/40 bg-sky-500/10 text-sky-700";
    case "warning":   return "border-amber-500/40 bg-amber-500/10 text-amber-700";
    case "error":     return "border-rose-500/40 bg-rose-500/10 text-rose-700";
    case "disabled":  return "border-border/60 bg-muted/50 text-muted-foreground";
    default:          return "border-border/60 bg-background text-muted-foreground";
  }
}

// ================= PAYMENTS =================
export type PaymentProviderKey =
  | "stripe" | "paypal" | "bank_card" | "apple_pay" | "google_pay" | "additional";

export interface PaymentProvider {
  id: PaymentProviderKey;
  name: string;
  status: ProviderStatus;
  mode: Mode;
  countries: string[];
  currencies: string[];
  methods: string[];
  feePlaceholder: string;
  lastCheck: ISO;
  lastPayment: ISO | null;
  lastError: string | null;
  enabled: boolean;
}

export type TxStatus =
  | "created" | "requires_payment" | "processing" | "successful"
  | "failed" | "refunded" | "partial_refund" | "cancelled" | "disputed";
export type PurchaseType =
  | "credit_pkg" | "sub_monthly" | "sub_yearly"
  | "order_individual" | "order_premium" | "order_corporate";

export interface PaymentTx {
  id: string; date: ISO; customer: string; email: string;
  provider: PaymentProviderKey; purchaseType: PurchaseType;
  relatedOrder: string | null; creditPackage: string | null; subscription: string | null;
  gross: number; discount: number; fee: number; net: number;
  currency: string; mode: Mode; status: TxStatus;
}

export type PayoutStatus = "pending" | "in_transit" | "paid" | "failed" | "cancelled";
export interface Payout {
  id: string; provider: PaymentProviderKey; date: ISO;
  gross: number; fees: number; net: number; currency: string;
  destination: string; status: PayoutStatus;
}

export type PayoutSchedule = "manual" | "daily" | "weekly" | "monthly";
export interface PaymentBalance {
  providerBalance: number; available: number; pending: number;
  reservedForRefunds: number; fees: number;
  lastPayout: ISO | null; nextEstimated: ISO | null;
  destination: string; currency: string; schedule: PayoutSchedule;
}

export interface PaymentSafety {
  duplicateProtection: boolean; confirmationRequired: boolean;
  refundManualReview: boolean; maxAutoRefund: number;
  suspiciousReview: boolean; failedNotifications: boolean; webhookPlaceholder: boolean;
}

export interface PaymentsState {
  providers: PaymentProvider[];
  balance: PaymentBalance;
  payouts: Payout[];
  transactions: PaymentTx[];
  safety: PaymentSafety;
}

// ================= AUTHENTICATION =================
export interface AuthRegistration {
  allowNew: boolean; requireEmailVerification: boolean;
  allowGuestPreview: boolean; allowGuestFreeCard: boolean;
  requireTerms: boolean; requirePrivacy: boolean; minAge: number;
  defaultLanguage: string; defaultCountry: string;
  welcomeCredits: number; firstVisitFree: boolean;
  preventMultipleRewards: boolean; rateLimitPlaceholder: number;
}

export interface AuthSecurity {
  maxFailed: number; lockDurationMin: number;
  customerSessionH: number; adminSessionH: number;
  requireAdmin2FA: boolean; optionalCustomer2FA: boolean;
  suspiciousDetection: boolean; newDeviceNotification: boolean;
  passwordMinLength: number; passwordComplexity: "basic" | "medium" | "strong";
  resetLinkExpMin: number;
}

export interface AuthSession {
  id: string; account: string;
  role: "customer" | "admin" | "super_admin" | "moderator";
  device: string; browser: string; country: string;
  createdAt: ISO; lastActive: ISO;
  trusted: boolean; active: boolean;
}

export interface AuthState {
  registration: AuthRegistration;
  security: AuthSecurity;
  socialLogin: { google: boolean; apple: boolean; facebook: boolean };
  sessions: AuthSession[];
}

// ================= STORAGE MANAGEMENT =================
export type StorageProviderType =
  | "primary" | "secondary" | "backup" | "temporary" | "local_dev";

export interface StorageProvider {
  id: string; name: string; type: StorageProviderType;
  status: ProviderStatus; region: string;
  capacityGb: number; usedGb: number; files: number;
  avgUploadMs: number; avgDownloadMs: number;
  lastCheck: ISO; lastError: string | null;
  priority: number; enabled: boolean;
}

export type FileCategoryKey =
  | "greeting_images" | "animated_greetings" | "video_clips" | "cartoons"
  | "songs" | "voice_files" | "customer_uploads" | "generated_previews"
  | "finished_orders" | "translation_versions" | "overlay_versions"
  | "temp_files" | "notification_attachments" | "reports" | "backups";

export interface FileCategoryUsage { key: FileCategoryKey; files: number; sizeGb: number; }

export interface StorageRetention {
  tempPreviewDays: number; failedProcessingDays: number;
  completedOrderDays: number; customerUploadDays: number;
  backupDays: number; archivedDays: number; recoveryPeriodDays: number;
}

export interface StorageFailoverEvent {
  id: string; date: ISO; fromProvider: string; toProvider: string;
  reason: string; filesMoved: number;
}

export interface StorageMgmtState {
  providers: StorageProvider[];
  categories: FileCategoryUsage[];
  retention: StorageRetention;
  failoverHistory: StorageFailoverEvent[];
  verifyIntegrity: boolean; retryFailedUploads: boolean; autoBackupImportant: boolean;
}

// ================= SERVICE CONNECTIONS =================
export type ServiceCategory =
  | "payments" | "authentication" | "image" | "video" | "animation"
  | "music" | "voice" | "translation" | "overlay" | "storage"
  | "email" | "sms" | "push" | "telegram" | "whatsapp"
  | "analytics" | "monitoring";

export type ServiceStatus =
  | "not_configured" | "connected" | "warning" | "error"
  | "rate_limited" | "disabled" | "maintenance";

export interface ServiceConnection {
  id: string; name: string; category: ServiceCategory;
  status: ServiceStatus; environment: Mode;
  credentialMasked: string; baseUrl: string;
  lastCheck: ISO; responseMs: number;
  dailyUsage: number; usageLimit: number;
  estimatedCost: number; lastError: string | null;
  role?: "primary" | "backup"; priority?: number;
  maxConcurrent?: number; maxQueue?: number;
  hourlyLimit?: number; dailyLimit?: number;
  monthlyBudget?: number; costPerUnit?: string;
  supportedFormats?: string[]; supportedDurations?: string[]; supportedLanguages?: string[];
  autoFailover?: boolean; autoDisableOnErrors?: boolean; manualReviewAfterFail?: boolean;
}

export type RoutingStrategy =
  | "best_available" | "lowest_queue" | "fastest" | "lowest_cost"
  | "highest_quality" | "balanced" | "manual_rules";

export interface ServicesState { services: ServiceConnection[]; routingStrategy: RoutingStrategy; }

export function serviceStatusTone(s: ServiceStatus): string {
  switch (s) {
    case "connected": return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
    case "warning": case "rate_limited": case "maintenance":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700";
    case "error": return "border-rose-500/40 bg-rose-500/10 text-rose-700";
    case "disabled": return "border-border/60 bg-muted/50 text-muted-foreground";
    default: return "border-border/60 bg-background text-muted-foreground";
  }
}

// ================= SANDBOX =================
export interface SandboxSwitches {
  enabled: boolean; testPayments: boolean; testRegistration: boolean;
  testCredits: boolean; testSubscriptions: boolean;
  testGeneration: boolean; testTranslation: boolean; testOverlay: boolean;
  testStorage: boolean; testNotifications: boolean; testScheduled: boolean;
}

export type TestRole =
  | "free" | "credit_buyer" | "sub_monthly" | "sub_yearly"
  | "premium" | "corporate" | "admin";

export interface TestAccount {
  id: string; role: TestRole; email: string;
  credits: number; subscription: string | null; createdAt: ISO;
}

export interface SandboxState { switches: SandboxSwitches; accounts: TestAccount[]; }

// ================= PLATFORM CONTROL =================
export type PlatformMode = "normal" | "partial" | "full_maintenance";

export interface PartialPauseFlags {
  newRegistrations: boolean; customerLogin: boolean;
  creditPurchases: boolean; subscriptionPurchases: boolean;
  newOrders: boolean; studioAccess: boolean;
  newGeneration: boolean; scheduledProcessing: boolean;
  outgoingNotifications: boolean; scheduledDelivery: boolean;
  customerUploads: boolean;
}

export type ActiveJobsBehavior =
  | "finish" | "stop_safely" | "return_queue" | "manual_review";

export interface MaintenanceMessages {
  en: string; ru: string; de: string; uk: string; fr: string; pl: string;
}

export interface PlatformControlState {
  mode: PlatformMode;
  partial: PartialPauseFlags;
  activeJobs: ActiveJobsBehavior;
  scheduleStart: ISO | null; scheduleEnd: ISO | null; autoResume: boolean;
  messages: MaintenanceMessages;
  returnTime: string; supportEmail: string;
  allowSuperAdmins: boolean; allowAdmins: boolean;
  testUserAllowlist: string[]; ipAllowlist: string[];
  notify: { email: boolean; push: boolean; internal: boolean };
  demoStats: {
    activeUsers: number; activeOrders: number;
    runningJobs: number; queuedJobs: number;
    scheduledDeliveries: number; pendingConfirmations: number;
  };
}

// ================= LAUNCH READINESS =================
export type ReadinessStatus =
  | "not_started" | "prepared" | "test" | "connected"
  | "verified" | "warning" | "blocking";

export interface ReadinessItem { key: string; status: ReadinessStatus; }
export interface IntegrationChecklistItem { key: string; done: boolean; }
export interface ServiceIntegrationChecklist {
  serviceId: string; serviceName: string; items: IntegrationChecklistItem[];
}
export interface LaunchReadinessState {
  items: ReadinessItem[];
  checklists: ServiceIntegrationChecklist[];
}

export function readinessTone(s: ReadinessStatus): string {
  switch (s) {
    case "verified": case "connected":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
    case "test": case "prepared":
      return "border-sky-500/40 bg-sky-500/10 text-sky-700";
    case "warning": return "border-amber-500/40 bg-amber-500/10 text-amber-700";
    case "blocking": return "border-rose-500/40 bg-rose-500/10 text-rose-700";
    default: return "border-border/60 bg-muted/50 text-muted-foreground";
  }
}

export function readinessScore(items: ReadinessItem[]): number {
  if (items.length === 0) return 0;
  const weight: Record<ReadinessStatus, number> = {
    not_started: 0, prepared: 30, test: 55,
    connected: 75, verified: 100, warning: 60, blocking: 20,
  };
  const sum = items.reduce((a, i) => a + weight[i.status], 0);
  return Math.round(sum / items.length);
}

// ================= AGGREGATE =================
export interface InfrastructureState {
  payments: PaymentsState;
  auth: AuthState;
  storageMgmt: StorageMgmtState;
  services: ServicesState;
  sandbox: SandboxState;
  control: PlatformControlState;
  launch: LaunchReadinessState;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const DEFAULT_PAYMENTS: PaymentsState = {
  providers: [
    { id: "stripe", name: "Stripe", status: "test", mode: "test",
      countries: ["US","GB","DE","FR","PL","UA","CA","AU"], currencies: ["USD","EUR","GBP","UAH","PLN"],
      methods: ["card","apple_pay","google_pay","link"], feePlaceholder: "2.9% + $0.30",
      lastCheck: daysAgo(0), lastPayment: daysAgo(2), lastError: null, enabled: true },
    { id: "paypal", name: "PayPal", status: "not_connected", mode: "test",
      countries: ["US","EU","GB","UA"], currencies: ["USD","EUR"],
      methods: ["paypal","card"], feePlaceholder: "3.49% + fixed",
      lastCheck: daysAgo(5), lastPayment: null, lastError: null, enabled: false },
    { id: "bank_card", name: "Bank Card Provider", status: "not_connected", mode: "test",
      countries: ["UA","PL","DE"], currencies: ["UAH","PLN","EUR"],
      methods: ["card"], feePlaceholder: "2.5%",
      lastCheck: daysAgo(7), lastPayment: null, lastError: null, enabled: false },
    { id: "apple_pay", name: "Apple Pay (via provider)", status: "test", mode: "test",
      countries: ["US","EU","GB"], currencies: ["USD","EUR","GBP"],
      methods: ["apple_pay"], feePlaceholder: "via provider",
      lastCheck: daysAgo(1), lastPayment: null, lastError: null, enabled: true },
    { id: "google_pay", name: "Google Pay (via provider)", status: "test", mode: "test",
      countries: ["US","EU","GB"], currencies: ["USD","EUR","GBP"],
      methods: ["google_pay"], feePlaceholder: "via provider",
      lastCheck: daysAgo(1), lastPayment: null, lastError: null, enabled: true },
    { id: "additional", name: "Additional Provider", status: "not_connected", mode: "test",
      countries: [], currencies: [], methods: [], feePlaceholder: "—",
      lastCheck: daysAgo(30), lastPayment: null, lastError: null, enabled: false },
  ],
  balance: {
    providerBalance: 4820.55, available: 3120.10, pending: 1250.45,
    reservedForRefunds: 450.00, fees: 128.75, lastPayout: daysAgo(6),
    nextEstimated: daysAgo(-1), destination: "•••• 7841", currency: "EUR", schedule: "weekly",
  },
  payouts: [
    { id: "po_8842", provider: "stripe", date: daysAgo(6), gross: 2100, fees: 62, net: 2038, currency: "EUR", destination: "•••• 7841", status: "paid" },
    { id: "po_8801", provider: "stripe", date: daysAgo(13), gross: 1780, fees: 55, net: 1725, currency: "EUR", destination: "•••• 7841", status: "paid" },
    { id: "po_8790", provider: "stripe", date: daysAgo(20), gross: 2440, fees: 68, net: 2372, currency: "EUR", destination: "•••• 7841", status: "in_transit" },
  ],
  transactions: [
    { id: "tx_10241", date: daysAgo(0), customer: "Anna K.", email: "anna@example.com", provider: "stripe", purchaseType: "credit_pkg", relatedOrder: null, creditPackage: "Popular", subscription: null, gross: 19, discount: 0, fee: 0.85, net: 18.15, currency: "EUR", mode: "test", status: "successful" },
    { id: "tx_10240", date: daysAgo(0), customer: "Marek W.", email: "marek@example.com", provider: "stripe", purchaseType: "sub_monthly", relatedOrder: null, creditPackage: null, subscription: "Monthly", gross: 9.99, discount: 0, fee: 0.60, net: 9.39, currency: "EUR", mode: "test", status: "successful" },
    { id: "tx_10239", date: daysAgo(1), customer: "Léa D.", email: "lea@example.com", provider: "stripe", purchaseType: "order_premium", relatedOrder: "ord_5581", creditPackage: null, subscription: null, gross: 89, discount: 5, fee: 2.60, net: 81.40, currency: "EUR", mode: "test", status: "processing" },
    { id: "tx_10238", date: daysAgo(1), customer: "Ivan P.", email: "ivan@example.com", provider: "stripe", purchaseType: "credit_pkg", relatedOrder: null, creditPackage: "Starter", subscription: null, gross: 9, discount: 0, fee: 0.55, net: 8.45, currency: "EUR", mode: "test", status: "failed" },
    { id: "tx_10237", date: daysAgo(2), customer: "Sofia H.", email: "sofia@example.com", provider: "stripe", purchaseType: "credit_pkg", relatedOrder: null, creditPackage: "Value", subscription: null, gross: 35, discount: 0, fee: 1.30, net: 33.70, currency: "EUR", mode: "test", status: "refunded" },
    { id: "tx_10236", date: daysAgo(3), customer: "Corp Studio", email: "orders@corp.example", provider: "stripe", purchaseType: "order_corporate", relatedOrder: "ord_5570", creditPackage: null, subscription: null, gross: 490, discount: 40, fee: 13.05, net: 436.95, currency: "EUR", mode: "test", status: "successful" },
  ],
  safety: {
    duplicateProtection: true, confirmationRequired: true, refundManualReview: true,
    maxAutoRefund: 30, suspiciousReview: true, failedNotifications: true, webhookPlaceholder: true,
  },
};

export const DEFAULT_AUTH: AuthState = {
  registration: {
    allowNew: true, requireEmailVerification: true,
    allowGuestPreview: true, allowGuestFreeCard: true,
    requireTerms: true, requirePrivacy: true, minAge: 13,
    defaultLanguage: "en", defaultCountry: "DE",
    welcomeCredits: 3, firstVisitFree: true, preventMultipleRewards: true,
    rateLimitPlaceholder: 20,
  },
  security: {
    maxFailed: 5, lockDurationMin: 15,
    customerSessionH: 168, adminSessionH: 12,
    requireAdmin2FA: true, optionalCustomer2FA: true,
    suspiciousDetection: true, newDeviceNotification: true,
    passwordMinLength: 10, passwordComplexity: "medium", resetLinkExpMin: 30,
  },
  socialLogin: { google: false, apple: false, facebook: false },
  sessions: [
    { id: "sess_a1", account: "anna@example.com", role: "customer", device: "MacBook Pro", browser: "Safari 17", country: "DE", createdAt: daysAgo(2), lastActive: daysAgo(0), trusted: true, active: true },
    { id: "sess_a2", account: "admin@projectjoy.example", role: "admin", device: "iPhone 15", browser: "Safari iOS", country: "PL", createdAt: daysAgo(1), lastActive: daysAgo(0), trusted: true, active: true },
    { id: "sess_a3", account: "super@projectjoy.example", role: "super_admin", device: "Linux Workstation", browser: "Firefox 129", country: "UA", createdAt: daysAgo(0), lastActive: daysAgo(0), trusted: true, active: true },
    { id: "sess_a4", account: "marek@example.com", role: "customer", device: "Windows PC", browser: "Chrome 128", country: "PL", createdAt: daysAgo(5), lastActive: daysAgo(3), trusted: false, active: false },
  ],
};

export const DEFAULT_STORAGE_MGMT: StorageMgmtState = {
  providers: [
    { id: "stg_primary", name: "Primary Cloud", type: "primary", status: "connected", region: "eu-central", capacityGb: 2048, usedGb: 512, files: 128400, avgUploadMs: 240, avgDownloadMs: 180, lastCheck: daysAgo(0), lastError: null, priority: 1, enabled: true },
    { id: "stg_backup", name: "Backup Cloud", type: "backup", status: "connected", region: "eu-west", capacityGb: 4096, usedGb: 640, files: 210800, avgUploadMs: 320, avgDownloadMs: 220, lastCheck: daysAgo(0), lastError: null, priority: 2, enabled: true },
    { id: "stg_secondary", name: "Secondary Cloud", type: "secondary", status: "warning", region: "us-east", capacityGb: 1024, usedGb: 210, files: 44200, avgUploadMs: 380, avgDownloadMs: 240, lastCheck: daysAgo(0), lastError: "Elevated latency", priority: 3, enabled: true },
    { id: "stg_temp", name: "Temporary Processing", type: "temporary", status: "connected", region: "eu-central", capacityGb: 512, usedGb: 84, files: 12300, avgUploadMs: 90, avgDownloadMs: 80, lastCheck: daysAgo(0), lastError: null, priority: 4, enabled: true },
    { id: "stg_local", name: "Local Development", type: "local_dev", status: "test", region: "local", capacityGb: 128, usedGb: 8, files: 320, avgUploadMs: 10, avgDownloadMs: 10, lastCheck: daysAgo(0), lastError: null, priority: 5, enabled: true },
  ],
  categories: [
    { key: "greeting_images", files: 32400, sizeGb: 68 },
    { key: "animated_greetings", files: 14800, sizeGb: 128 },
    { key: "video_clips", files: 8400, sizeGb: 240 },
    { key: "cartoons", files: 2100, sizeGb: 96 },
    { key: "songs", files: 6800, sizeGb: 42 },
    { key: "voice_files", files: 12200, sizeGb: 28 },
    { key: "customer_uploads", files: 18500, sizeGb: 74 },
    { key: "generated_previews", files: 22400, sizeGb: 38 },
    { key: "finished_orders", files: 9800, sizeGb: 156 },
    { key: "translation_versions", files: 4200, sizeGb: 3 },
    { key: "overlay_versions", files: 5600, sizeGb: 6 },
    { key: "temp_files", files: 8400, sizeGb: 12 },
    { key: "notification_attachments", files: 1200, sizeGb: 2 },
    { key: "reports", files: 480, sizeGb: 1 },
    { key: "backups", files: 120, sizeGb: 480 },
  ],
  retention: {
    tempPreviewDays: 7, failedProcessingDays: 3, completedOrderDays: 365,
    customerUploadDays: 180, backupDays: 90, archivedDays: 730, recoveryPeriodDays: 30,
  },
  failoverHistory: [
    { id: "sf_1", date: daysAgo(2), fromProvider: "Secondary Cloud", toProvider: "Primary Cloud", reason: "Elevated error rate", filesMoved: 340 },
    { id: "sf_2", date: daysAgo(9), fromProvider: "Primary Cloud", toProvider: "Backup Cloud", reason: "Scheduled maintenance", filesMoved: 2180 },
  ],
  verifyIntegrity: true, retryFailedUploads: true, autoBackupImportant: true,
};

const svc = (
  id: string, name: string, category: ServiceCategory,
  status: ServiceStatus, environment: Mode,
  extras: Partial<ServiceConnection> = {},
): ServiceConnection => ({
  id, name, category, status, environment,
  credentialMasked: "••••••••••••AB12",
  baseUrl: "https://api.provider.example",
  lastCheck: daysAgo(0), responseMs: 220,
  dailyUsage: 0, usageLimit: 10000,
  estimatedCost: 0, lastError: null,
  ...extras,
});

export const DEFAULT_SERVICES: ServicesState = {
  routingStrategy: "balanced",
  services: [
    svc("srv_pay_stripe", "Stripe (Payments)", "payments", "connected", "test", { dailyUsage: 128, usageLimit: 5000 }),
    svc("srv_auth_email", "Email + Password", "authentication", "connected", "test"),
    svc("srv_img_a", "Image Provider A", "image", "connected", "test",
      { role: "primary", priority: 1, maxConcurrent: 8, maxQueue: 200, hourlyLimit: 800, dailyLimit: 12000, monthlyBudget: 400, costPerUnit: "≈ €0.008", supportedFormats: ["1024","1536","1920"], supportedLanguages: ["*"], autoFailover: true, autoDisableOnErrors: true, manualReviewAfterFail: true }),
    svc("srv_img_b", "Image Provider B", "image", "connected", "test",
      { role: "backup", priority: 2, maxConcurrent: 4, maxQueue: 120, hourlyLimit: 400, dailyLimit: 8000, monthlyBudget: 200, costPerUnit: "≈ €0.010", supportedFormats: ["1024","1536"], supportedLanguages: ["*"], autoFailover: true, autoDisableOnErrors: true, manualReviewAfterFail: true }),
    svc("srv_vid_a", "Video Provider A", "video", "connected", "test",
      { role: "primary", priority: 1, maxConcurrent: 3, maxQueue: 60, supportedDurations: ["15s","30s","60s"], supportedFormats: ["1080p","720p"], autoFailover: true }),
    svc("srv_anim_a", "Animation Provider A", "animation", "connected", "test",
      { role: "primary", priority: 1, maxConcurrent: 4, maxQueue: 80, supportedFormats: ["mp4","webm"] }),
    svc("srv_music_a", "Music Provider A", "music", "connected", "test",
      { role: "primary", priority: 1, maxConcurrent: 6, maxQueue: 120, supportedDurations: ["30s","60s","120s"] }),
    svc("srv_voice_a", "Voice Provider A", "voice", "connected", "test",
      { role: "primary", priority: 1, maxConcurrent: 8, maxQueue: 200, supportedLanguages: ["en","ru","de","uk","fr","pl"] }),
    svc("srv_txt_a", "Text Provider A", "translation", "connected", "test",
      { role: "primary", priority: 1, supportedLanguages: ["en","ru","de","uk","fr","pl"] }),
    svc("srv_ovl_a", "Text Overlay Provider", "overlay", "connected", "test"),
    svc("srv_stg_a", "Primary Cloud Storage", "storage", "connected", "test"),
    svc("srv_email", "Transactional Email", "email", "warning", "test", { lastError: "Elevated bounce rate" }),
    svc("srv_sms", "SMS Gateway", "sms", "not_configured", "test"),
    svc("srv_push", "Push Notifications", "push", "connected", "test"),
    svc("srv_tg", "Telegram Bot", "telegram", "not_configured", "test"),
    svc("srv_wa", "WhatsApp Business", "whatsapp", "not_configured", "test"),
    svc("srv_analytics", "Analytics", "analytics", "connected", "test"),
    svc("srv_monitoring", "Monitoring", "monitoring", "connected", "test"),
  ],
};

export const DEFAULT_SANDBOX: SandboxState = {
  switches: {
    enabled: true, testPayments: true, testRegistration: true, testCredits: true,
    testSubscriptions: true, testGeneration: true, testTranslation: true,
    testOverlay: true, testStorage: true, testNotifications: true, testScheduled: true,
  },
  accounts: [
    { id: "ta_free", role: "free", email: "test-free@sandbox.projectjoy", credits: 3, subscription: null, createdAt: daysAgo(30) },
    { id: "ta_credit", role: "credit_buyer", email: "test-credit@sandbox.projectjoy", credits: 50, subscription: null, createdAt: daysAgo(30) },
    { id: "ta_month", role: "sub_monthly", email: "test-monthly@sandbox.projectjoy", credits: 120, subscription: "Monthly", createdAt: daysAgo(30) },
    { id: "ta_year", role: "sub_yearly", email: "test-yearly@sandbox.projectjoy", credits: 1500, subscription: "Yearly", createdAt: daysAgo(30) },
    { id: "ta_prem", role: "premium", email: "test-premium@sandbox.projectjoy", credits: 200, subscription: "Premium", createdAt: daysAgo(30) },
    { id: "ta_corp", role: "corporate", email: "test-corp@sandbox.projectjoy", credits: 500, subscription: "Corporate", createdAt: daysAgo(30) },
    { id: "ta_admin", role: "admin", email: "test-admin@sandbox.projectjoy", credits: 0, subscription: null, createdAt: daysAgo(30) },
  ],
};

export const DEFAULT_CONTROL: PlatformControlState = {
  mode: "normal",
  partial: {
    newRegistrations: false, customerLogin: false, creditPurchases: false,
    subscriptionPurchases: false, newOrders: false, studioAccess: false,
    newGeneration: false, scheduledProcessing: false, outgoingNotifications: false,
    scheduledDelivery: false, customerUploads: false,
  },
  activeJobs: "finish",
  scheduleStart: null, scheduleEnd: null, autoResume: true,
  returnTime: "",
  supportEmail: "support@projectjoy.example",
  messages: {
    en: "Project Joy is temporarily unavailable while we improve the platform. Please try again a little later.",
    ru: "Project Joy временно недоступен — мы улучшаем платформу. Пожалуйста, попробуйте немного позже.",
    de: "Project Joy ist vorübergehend nicht erreichbar, während wir die Plattform verbessern. Bitte versuchen Sie es später erneut.",
    uk: "Project Joy тимчасово недоступний — ми покращуємо платформу. Будь ласка, спробуйте трохи пізніше.",
    fr: "Project Joy est temporairement indisponible pendant que nous améliorons la plateforme. Merci de réessayer un peu plus tard.",
    pl: "Project Joy jest tymczasowo niedostępny — ulepszamy platformę. Prosimy spróbować za chwilę.",
  },
  allowSuperAdmins: true, allowAdmins: true,
  testUserAllowlist: [], ipAllowlist: [],
  notify: { email: true, push: true, internal: true },
  demoStats: {
    activeUsers: 128, activeOrders: 42, runningJobs: 14,
    queuedJobs: 38, scheduledDeliveries: 9, pendingConfirmations: 3,
  },
};

export const DEFAULT_LAUNCH: LaunchReadinessState = {
  items: [
    { key: "admin_panel",   status: "verified" },
    { key: "public_site",   status: "connected" },
    { key: "registration",  status: "prepared" },
    { key: "authentication",status: "prepared" },
    { key: "payments",      status: "test" },
    { key: "credits",       status: "prepared" },
    { key: "subscriptions", status: "prepared" },
    { key: "orders",        status: "prepared" },
    { key: "generators",    status: "test" },
    { key: "load_balancer", status: "prepared" },
    { key: "translation",   status: "test" },
    { key: "overlay",       status: "prepared" },
    { key: "storage",       status: "connected" },
    { key: "notifications", status: "prepared" },
    { key: "calendar",      status: "prepared" },
    { key: "security",      status: "prepared" },
    { key: "legal_pages",   status: "not_started" },
    { key: "backups",       status: "connected" },
    { key: "monitoring",    status: "connected" },
    { key: "domain",        status: "connected" },
    { key: "ssl",           status: "connected" },
  ],
  checklists: [
    { serviceId: "srv_pay_stripe", serviceName: "Stripe (Payments)",
      items: [
        { key: "account_created", done: true },
        { key: "test_credentials", done: true },
        { key: "test_connection", done: true },
        { key: "test_transaction", done: true },
        { key: "error_handling", done: false },
        { key: "limits", done: true },
        { key: "budget", done: false },
        { key: "audit_verified", done: true },
        { key: "live_credentials", done: false },
        { key: "live_verified", done: false },
        { key: "enabled_customers", done: false },
      ] },
    { serviceId: "srv_img_a", serviceName: "Image Provider A",
      items: [
        { key: "account_created", done: true },
        { key: "test_credentials", done: true },
        { key: "test_connection", done: true },
        { key: "test_transaction", done: true },
        { key: "error_handling", done: true },
        { key: "limits", done: true },
        { key: "budget", done: true },
        { key: "audit_verified", done: true },
        { key: "live_credentials", done: false },
        { key: "live_verified", done: false },
        { key: "enabled_customers", done: false },
      ] },
  ],
};

export const DEFAULT_INFRASTRUCTURE: InfrastructureState = {
  payments: DEFAULT_PAYMENTS,
  auth: DEFAULT_AUTH,
  storageMgmt: DEFAULT_STORAGE_MGMT,
  services: DEFAULT_SERVICES,
  sandbox: DEFAULT_SANDBOX,
  control: DEFAULT_CONTROL,
  launch: DEFAULT_LAUNCH,
};

export interface ConnectedSummary {
  paymentsConnected: number; authConnected: number;
  generationConnected: number; translationConnected: number;
  storageConnected: number; notificationsConnected: number;
  withErrors: number; inTest: number; inLive: number;
}

export function computeConnectedSummary(services: ServiceConnection[]): ConnectedSummary {
  const gen: ServiceCategory[] = ["image","video","animation","music","voice","overlay"];
  const notif: ServiceCategory[] = ["email","sms","push","telegram","whatsapp"];
  const isConn = (s: ServiceConnection) => s.status === "connected";
  const inCat = (c: ServiceCategory[]) => services.filter((s) => c.includes(s.category));
  return {
    paymentsConnected: services.filter((s) => s.category === "payments" && isConn(s)).length,
    authConnected: services.filter((s) => s.category === "authentication" && isConn(s)).length,
    generationConnected: inCat(gen).filter(isConn).length,
    translationConnected: services.filter((s) => s.category === "translation" && isConn(s)).length,
    storageConnected: services.filter((s) => s.category === "storage" && isConn(s)).length,
    notificationsConnected: inCat(notif).filter(isConn).length,
    withErrors: services.filter((s) => s.status === "error" || s.status === "warning").length,
    inTest: services.filter((s) => s.environment === "test").length,
    inLive: services.filter((s) => s.environment === "live").length,
  };
}

export const PAUSE_CONFIRMATION_PHRASE = "PAUSE PROJECT JOY";

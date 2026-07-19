// ---------------------------------------------------------------------------
// Reports & Analytics — frontend-only demonstration data source.
// All values are simulated for UI purposes. No real business results.
// Prepared for future backend integration: keep IDs stable and shapes flat.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n/types";

export type DateRangeKey =
  | "today" | "yesterday" | "last7" | "last30"
  | "this_month" | "prev_month" | "this_quarter" | "this_year" | "custom";

export type CompareKey = "prev_period" | "prev_month" | "prev_year" | "none";

export type ProductType =
  | "card" | "animated" | "song" | "video" | "cartoon"
  | "premium" | "individual" | "corporate";

export const PRODUCT_TYPES: ProductType[] = [
  "card","animated","song","video","cartoon","premium","individual","corporate",
];

export type OrderStatus =
  | "created" | "paid" | "queue" | "processing" | "completed"
  | "delivered" | "failed" | "cancelled";

export type NotifChannel =
  | "email" | "sms" | "push" | "telegram" | "whatsapp" | "internal";

export const REPORT_LANGS: Lang[] = ["en","de","ru","uk","fr","pl"];
export const REPORT_COUNTRIES = ["DE","FR","PL","UA","GB","US","RU","IT","ES","NL"];

// --- deterministic pseudo-random so demo numbers stay stable across renders ---
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const R = seeded(20260719);
const rand = (min: number, max: number) => Math.round(min + R() * (max - min));
const randF = (min: number, max: number) =>
  Math.round((min + R() * (max - min)) * 100) / 100;

// ---------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------

export interface SeriesPoint { date: string; value: number; }

function makeSeries(days: number, min: number, max: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), value: rand(min, max) });
  }
  return out;
}

export const REVENUE_SERIES_90 = makeSeries(90, 800, 3200);
export const ORDERS_SERIES_90 = makeSeries(90, 40, 180);
export const USERS_SERIES_90 = makeSeries(90, 8, 55);
export const SUB_SERIES_90 = makeSeries(90, 2, 22);

/** Return the trailing N points of a series and a comparison window (same len). */
export function sliceRange(
  s: SeriesPoint[], days: number,
): { current: SeriesPoint[]; previous: SeriesPoint[] } {
  const n = Math.min(days, s.length);
  const current = s.slice(s.length - n);
  const prevEnd = s.length - n;
  const prevStart = Math.max(0, prevEnd - n);
  const previous = s.slice(prevStart, prevEnd);
  return { current, previous };
}

export function sumSeries(s: SeriesPoint[]): number {
  return s.reduce((a, b) => a + b.value, 0);
}

export function pctChange(a: number, b: number): number {
  if (!b) return a > 0 ? 100 : 0;
  return Math.round(((a - b) / b) * 1000) / 10;
}

export function daysForRange(k: DateRangeKey): number {
  switch (k) {
    case "today": return 1;
    case "yesterday": return 1;
    case "last7": return 7;
    case "last30": return 30;
    case "this_month": return 30;
    case "prev_month": return 30;
    case "this_quarter": return 90;
    case "this_year": return 90;
    case "custom": return 30;
  }
}

// ---------------------------------------------------------------------------
// Breakdowns
// ---------------------------------------------------------------------------

export interface Breakdown { label: string; value: number; }

export const REVENUE_BY_PRODUCT: Record<ProductType, number> = {
  card: 3820, animated: 6410, song: 9250, video: 12780,
  cartoon: 8140, premium: 15320, individual: 4210, corporate: 6980,
};

export const REVENUE_BY_COUNTRY: Record<string, number> = Object.fromEntries(
  REPORT_COUNTRIES.map((c) => [c, rand(1200, 9800)]),
);

export const REVENUE_BY_LANGUAGE: Record<Lang, number> = {
  en: 14200, de: 11800, ru: 9200, uk: 6100, fr: 8400, pl: 5900,
};

export const CHANNEL_STATS: Record<NotifChannel, {
  sent: number; delivered: number; read: number; failed: number;
}> = {
  email:    { sent: 18420, delivered: 17840, read: 12980, failed: 580 },
  sms:      { sent:  4210, delivered:  4090, read:  3620, failed: 120 },
  push:     { sent: 12680, delivered: 12280, read:  8410, failed: 400 },
  telegram: { sent:  2140, delivered:  2100, read:  1820, failed:  40 },
  whatsapp: { sent:  3820, delivered:  3720, read:  3010, failed: 100 },
  internal: { sent:  8420, delivered:  8420, read:  6410, failed:   0 },
};

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export interface RevenueRow {
  date: string; orderId: string; customer: string; product: ProductType;
  gross: number; discount: number; refund: number; net: number;
  currency: "EUR"; status: OrderStatus;
}

const CUSTOMER_NAMES = [
  "Anna Weber","Jean Dupont","Marek Kowalski","Olga Ivanenko","Liam Smith",
  "Sofia Rossi","Katrin Berg","Piotr Nowak","Sergiy Kravets","Chloé Martin",
];

export const REVENUE_ROWS: RevenueRow[] = Array.from({ length: 24 }, (_, i) => {
  const products: ProductType[] = PRODUCT_TYPES;
  const product = products[i % products.length];
  const gross = rand(15, 240);
  const discount = i % 5 === 0 ? rand(2, 20) : 0;
  const refund = i % 11 === 0 ? rand(5, 30) : 0;
  const d = new Date(); d.setDate(d.getDate() - i);
  const statuses: OrderStatus[] =
    ["delivered","completed","completed","delivered","paid","cancelled","failed"];
  return {
    date: d.toISOString().slice(0, 10),
    orderId: `ORD-${(90000 + i * 37).toString().padStart(5, "0")}`,
    customer: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
    product,
    gross, discount, refund,
    net: Math.max(0, gross - discount - refund),
    currency: "EUR",
    status: statuses[i % statuses.length],
  };
});

export interface OrdersByType {
  product: ProductType;
  created: number; paid: number; queue: number; processing: number;
  completed: number; delivered: number; failed: number; cancelled: number;
  avgProcessingMin: number; avgQueueMin: number; avgDeliveryMin: number;
}

export const ORDERS_BY_TYPE: OrdersByType[] = PRODUCT_TYPES.map((p) => ({
  product: p,
  created: rand(120, 640), paid: rand(100, 600),
  queue: rand(2, 40), processing: rand(5, 50),
  completed: rand(90, 560), delivered: rand(80, 540),
  failed: rand(0, 20), cancelled: rand(2, 30),
  avgProcessingMin: rand(4, 45),
  avgQueueMin: rand(1, 12),
  avgDeliveryMin: rand(1, 8),
}));

export interface UserRow {
  id: string; name: string; country: string; lang: Lang;
  orders: number; revenueEUR: number; creditBalance: number;
  status: "active" | "returning" | "inactive" | "blocked";
  hasSubscription: boolean;
  lastActive: string;
}

export const USER_ROWS: UserRow[] = Array.from({ length: 22 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - rand(0, 120));
  const statuses: UserRow["status"][] = ["active","returning","inactive","blocked"];
  return {
    id: `USR-${(1000 + i * 7).toString(36).toUpperCase()}`,
    name: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length] + (i > 9 ? ` #${i}` : ""),
    country: REPORT_COUNTRIES[i % REPORT_COUNTRIES.length],
    lang: REPORT_LANGS[i % REPORT_LANGS.length],
    orders: rand(0, 42),
    revenueEUR: rand(0, 1800),
    creditBalance: rand(0, 320),
    status: statuses[i % statuses.length],
    hasSubscription: i % 3 !== 0,
    lastActive: d.toISOString().slice(0, 10),
  };
});

export interface CreditPackageSale {
  packageId: string; name: string; sold: number; revenueEUR: number;
  bonusCredits: number; refundedCredits: number;
}
export const CREDIT_PACKAGE_SALES: CreditPackageSale[] = [
  { packageId: "pkg_starter",  name: "Starter",  sold: 812, revenueEUR: 4060,  bonusCredits: 1200, refundedCredits: 40 },
  { packageId: "pkg_popular",  name: "Popular",  sold: 640, revenueEUR: 9600,  bonusCredits: 3200, refundedCredits: 80 },
  { packageId: "pkg_value",    name: "Value",    sold: 410, revenueEUR: 12300, bonusCredits: 4800, refundedCredits: 60 },
  { packageId: "pkg_premium",  name: "Premium",  sold: 210, revenueEUR: 10500, bonusCredits: 3200, refundedCredits: 30 },
];

export interface CatalogRow {
  id: string; title: string; type: ProductType; category: string;
  views: number; uses: number; favorites: number; shares: number;
  revenueEUR: number; status: "published" | "draft" | "archived";
  missingTranslations: number; missingMedia: boolean;
}

const CATALOG_CATEGORIES = [
  "Birthday","Anniversary","Wedding","Newborn","Family","Holiday",
  "Corporate","Get Well","Congratulations","Friendship",
];

export const CATALOG_ROWS: CatalogRow[] = Array.from({ length: 18 }, (_, i) => ({
  id: `CAT-${(200 + i).toString()}`,
  title: `${CATALOG_CATEGORIES[i % CATALOG_CATEGORIES.length]} #${i + 1}`,
  type: PRODUCT_TYPES[i % PRODUCT_TYPES.length],
  category: CATALOG_CATEGORIES[i % CATALOG_CATEGORIES.length],
  views: rand(120, 9800), uses: rand(10, 640),
  favorites: rand(0, 380), shares: rand(0, 210),
  revenueEUR: rand(0, 4200),
  status: (["published","published","published","draft","archived"] as const)[i % 5],
  missingTranslations: i % 4 === 0 ? rand(1, 3) : 0,
  missingMedia: i % 7 === 0,
}));

export interface PromotionPerf {
  id: string; name: string; code: string | null;
  uses: number; discountEUR: number; revenueEUR: number;
  status: "active" | "expired" | "scheduled" | "no_usage";
}
export const PROMOTION_PERF: PromotionPerf[] = [
  { id: "prm_welcome",  name: "Welcome Offer",   code: null,        uses: 1820, discountEUR:  920, revenueEUR: 14200, status: "active" },
  { id: "prm_birthday", name: "Birthday Campaign",code: null,       uses:  640, discountEUR:  480, revenueEUR:  6200, status: "active" },
  { id: "prm_holiday",  name: "Holiday Sale",    code: null,        uses:  980, discountEUR: 1820, revenueEUR: 12600, status: "expired" },
  { id: "pc_pop10",     name: "Popular 10% Off", code: "POPULAR10", uses:  312, discountEUR:  380, revenueEUR:  3820, status: "active" },
  { id: "pc_first",     name: "First Purchase",  code: "JOY5",      uses:    0, discountEUR:    0, revenueEUR:     0, status: "no_usage" },
];

export interface NotifFailRow {
  id: string; channel: NotifChannel; type: string;
  recipient: string; country: string; language: Lang;
  attempts: number; lastError: string; at: string;
}
export const NOTIF_FAILS: NotifFailRow[] = Array.from({ length: 12 }, (_, i) => {
  const chans: NotifChannel[] = ["email","sms","push","telegram","whatsapp"];
  const d = new Date(); d.setHours(d.getHours() - i * 3);
  return {
    id: `NF-${1000 + i}`,
    channel: chans[i % chans.length],
    type: ["order_confirmation","payment_receipt","reminder","delivery_ready","account_alert"][i % 5],
    recipient: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
    country: REPORT_COUNTRIES[i % REPORT_COUNTRIES.length],
    language: REPORT_LANGS[i % REPORT_LANGS.length],
    attempts: rand(1, 4),
    lastError: ["bounce","rate_limited","invalid_address","timeout","provider_error"][i % 5],
    at: d.toISOString(),
  };
});

export interface CalendarUpcoming {
  id: string; customer: string; eventType: string; occursAt: string;
  reminderChannel: NotifChannel; country: string;
}
export const CALENDAR_UPCOMING: CalendarUpcoming[] = Array.from({ length: 10 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() + i + 1);
  const chans: NotifChannel[] = ["email","push","sms"];
  return {
    id: `CE-${500 + i}`,
    customer: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
    eventType: ["Birthday","Anniversary","Wedding","Nameday","Custom"][i % 5],
    occursAt: d.toISOString().slice(0, 10),
    reminderChannel: chans[i % chans.length],
    country: REPORT_COUNTRIES[i % REPORT_COUNTRIES.length],
  };
});

// ---------------------------------------------------------------------------
// Costs & profitability
// ---------------------------------------------------------------------------

export interface CostRow {
  category: string;
  estimatedEUR: number;
}
export const COST_BREAKDOWN: CostRow[] = [
  { category: "generation",   estimatedEUR: 4820 },
  { category: "translation",  estimatedEUR:  680 },
  { category: "storage",      estimatedEUR:  320 },
  { category: "notifications",estimatedEUR:  410 },
  { category: "payment_fees", estimatedEUR: 1240 },
  { category: "infrastructure",estimatedEUR: 980 },
];

export interface ProfitByProductRow {
  product: ProductType; orders: number; revenueEUR: number;
  costEUR: number; refundEUR: number; discountEUR: number;
  netEUR: number; profitEUR: number; marginPct: number;
  avgProcessingMin: number;
}
export const PROFIT_BY_PRODUCT: ProfitByProductRow[] = PRODUCT_TYPES.map((p, i) => {
  const revenue = REVENUE_BY_PRODUCT[p];
  const cost = Math.round(revenue * (0.35 + (i % 3) * 0.05));
  const refund = Math.round(revenue * 0.02);
  const discount = Math.round(revenue * 0.05);
  const net = revenue - refund - discount;
  const profit = net - cost;
  return {
    product: p, orders: rand(80, 520), revenueEUR: revenue,
    costEUR: cost, refundEUR: refund, discountEUR: discount,
    netEUR: net, profitEUR: profit,
    marginPct: net > 0 ? Math.round((profit / net) * 1000) / 10 : 0,
    avgProcessingMin: rand(4, 45),
  };
});

// ---------------------------------------------------------------------------
// Service performance & load distribution
// ---------------------------------------------------------------------------

export type ServiceCategory =
  | "image" | "video" | "cartoon" | "music" | "voice"
  | "translation" | "text_overlay" | "storage"
  | "email" | "sms" | "push" | "payment";

export interface ServiceRow {
  id: string; category: ServiceCategory;
  status: "healthy" | "degraded" | "offline";
  assigned: number; completed: number; failed: number;
  avgMs: number; queue: number; estimatedCostEUR: number;
  successRate: number; lastError: string; lastCheck: string;
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "image","video","cartoon","music","voice","translation",
  "text_overlay","storage","email","sms","push","payment",
];

export const SERVICE_ROWS: ServiceRow[] = SERVICE_CATEGORIES.map((c, i) => {
  const assigned = rand(400, 4200);
  const failed = rand(0, 60);
  const completed = assigned - failed - rand(0, 40);
  const d = new Date(); d.setMinutes(d.getMinutes() - i * 7);
  const status: ServiceRow["status"] =
    i % 9 === 0 ? "offline" : i % 5 === 0 ? "degraded" : "healthy";
  return {
    id: `SVC-${(100 + i).toString()}`,
    category: c, status,
    assigned, completed, failed,
    avgMs: rand(140, 4800),
    queue: rand(0, 24),
    estimatedCostEUR: randF(20, 480),
    successRate: Math.round((completed / assigned) * 1000) / 10,
    lastError: status === "healthy" ? "" : ["timeout","rate_limited","provider_error","unavailable"][i % 4],
    lastCheck: d.toISOString(),
  };
});

export interface RoutingEvent {
  id: string; at: string; kind: "auto" | "manual" | "reassign" | "failover" | "overload";
  fromServiceId: string | null; toServiceId: string; taskId: string; reason: string;
}
export const ROUTING_EVENTS: RoutingEvent[] = Array.from({ length: 14 }, (_, i) => {
  const kinds: RoutingEvent["kind"][] = ["auto","manual","reassign","failover","overload"];
  const d = new Date(); d.setMinutes(d.getMinutes() - i * 23);
  return {
    id: `RT-${9000 + i}`,
    at: d.toISOString(),
    kind: kinds[i % kinds.length],
    fromServiceId: i % 3 === 0 ? null : `SVC-${100 + (i % 12)}`,
    toServiceId: `SVC-${100 + ((i + 3) % 12)}`,
    taskId: `TSK-${5000 + i * 11}`,
    reason: ["queue_length","health_check","cost_optimization","manual_override","provider_offline"][i % 5],
  };
});

// ---------------------------------------------------------------------------
// Saved & scheduled reports
// ---------------------------------------------------------------------------

export interface SavedReport {
  id: string; name: string; owner: string; range: DateRangeKey;
  scheduled: "daily" | "weekly" | "monthly" | "quarterly" | null;
  lastGeneratedAt: string; status: "ready" | "pending" | "failed";
}

export const SAVED_REPORTS: SavedReport[] = [
  { id: "rp_rev_m",   name: "Monthly Revenue",       owner: "admin", range: "this_month",   scheduled: "monthly",   lastGeneratedAt: new Date(Date.now()-86400000).toISOString(), status: "ready" },
  { id: "rp_ord_w",   name: "Weekly Orders",         owner: "admin", range: "last7",        scheduled: "weekly",    lastGeneratedAt: new Date(Date.now()-3600000).toISOString(),  status: "ready" },
  { id: "rp_sub_g",   name: "Subscription Growth",   owner: "admin", range: "this_quarter", scheduled: "monthly",   lastGeneratedAt: new Date(Date.now()-7200000).toISOString(),  status: "ready" },
  { id: "rp_cred",    name: "Credit Sales",          owner: "admin", range: "last30",       scheduled: "weekly",    lastGeneratedAt: new Date(Date.now()-10800000).toISOString(), status: "pending" },
  { id: "rp_cat",     name: "Catalog Performance",   owner: "admin", range: "last30",       scheduled: null,        lastGeneratedAt: new Date(Date.now()-172800000).toISOString(),status: "ready" },
  { id: "rp_fail",    name: "Failed Deliveries",     owner: "admin", range: "last7",        scheduled: "daily",     lastGeneratedAt: new Date().toISOString(),                    status: "ready" },
  { id: "rp_costs",   name: "Production Costs",      owner: "admin", range: "this_month",   scheduled: "monthly",   lastGeneratedAt: new Date(Date.now()-259200000).toISOString(),status: "failed" },
  { id: "rp_svc",     name: "Service Failures",      owner: "admin", range: "last7",        scheduled: "daily",     lastGeneratedAt: new Date().toISOString(),                    status: "ready" },
  { id: "rp_prof",    name: "Profitability by Product",owner: "admin",range: "this_quarter",scheduled: "quarterly", lastGeneratedAt: new Date(Date.now()-604800000).toISOString(),status: "ready" },
];

// ---------------------------------------------------------------------------
// Alerts & thresholds
// ---------------------------------------------------------------------------

export type AlertKind =
  | "revenue_below" | "costs_above" | "failed_orders" | "notif_failure_rate"
  | "delivery_failure_rate" | "sub_churn" | "queue_too_long"
  | "service_error_rate" | "low_margin" | "refund_activity";

export const ALERT_KINDS: AlertKind[] = [
  "revenue_below","costs_above","failed_orders","notif_failure_rate",
  "delivery_failure_rate","sub_churn","queue_too_long","service_error_rate",
  "low_margin","refund_activity",
];

export interface AlertRule {
  id: string; kind: AlertKind; enabled: boolean;
  threshold: number;
  severity: "info" | "warning" | "critical";
  channel: "internal" | "email" | "push";
}

export const DEFAULT_ALERTS: AlertRule[] = ALERT_KINDS.map((k, i) => ({
  id: `AL-${k}`,
  kind: k,
  enabled: i % 3 !== 0,
  threshold: [1000, 2000, 10, 5, 3, 8, 30, 4, 20, 15][i] ?? 10,
  severity: (["info","warning","critical"] as const)[i % 3],
  channel: (["internal","email","push"] as const)[i % 3],
}));

// ---------------------------------------------------------------------------
// Metric / dimension registries for the custom report builder
// ---------------------------------------------------------------------------

export const CUSTOM_METRICS = [
  "revenue","orders","users","credits","subscriptions",
  "catalog_views","notifications","calendar_events","costs","profit",
] as const;
export type CustomMetric = typeof CUSTOM_METRICS[number];

export const CUSTOM_DIMENSIONS = [
  "date","country","language","product_type","order_status",
  "subscription_type","channel","category",
] as const;
export type CustomDimension = typeof CUSTOM_DIMENSIONS[number];

// ---------------------------------------------------------------------------
// Overview KPI aggregator — pure, driven by the selected range.
// ---------------------------------------------------------------------------

export interface OverviewKpis {
  totalRevenueEUR: number;
  netRevenueEUR: number;
  creditsSold: number;
  activeSubscriptions: number;
  newUsers: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundsEUR: number;
  avgOrderValueEUR: number;
  estimatedCostsEUR: number;
  estimatedProfitEUR: number;
  // deltas vs comparison window (percent)
  revenueDeltaPct: number;
  ordersDeltaPct: number;
  usersDeltaPct: number;
  subsDeltaPct: number;
}

export function computeOverview(range: DateRangeKey, compare: CompareKey): OverviewKpis {
  const days = daysForRange(range);
  const rev = sliceRange(REVENUE_SERIES_90, days);
  const ord = sliceRange(ORDERS_SERIES_90, days);
  const usr = sliceRange(USERS_SERIES_90, days);
  const sub = sliceRange(SUB_SERIES_90, days);

  const totalRevenue = sumSeries(rev.current);
  const orders = sumSeries(ord.current);
  const users = sumSeries(usr.current);
  const subs = sumSeries(sub.current);

  const refunds = Math.round(totalRevenue * 0.023);
  const discounts = Math.round(totalRevenue * 0.048);
  const net = totalRevenue - refunds - discounts;
  const costs = Math.round(totalRevenue * 0.42);

  const useCompare = compare !== "none";
  return {
    totalRevenueEUR: totalRevenue,
    netRevenueEUR: net,
    creditsSold: Math.round(totalRevenue * 4.2),
    activeSubscriptions: 420 + subs,
    newUsers: users,
    totalOrders: orders,
    completedOrders: Math.round(orders * 0.86),
    cancelledOrders: Math.round(orders * 0.05),
    refundsEUR: refunds,
    avgOrderValueEUR: orders > 0 ? Math.round((totalRevenue / orders) * 100) / 100 : 0,
    estimatedCostsEUR: costs,
    estimatedProfitEUR: net - costs,
    revenueDeltaPct: useCompare ? pctChange(totalRevenue, sumSeries(rev.previous)) : 0,
    ordersDeltaPct:  useCompare ? pctChange(orders,       sumSeries(ord.previous)) : 0,
    usersDeltaPct:   useCompare ? pctChange(users,        sumSeries(usr.previous)) : 0,
    subsDeltaPct:    useCompare ? pctChange(subs,         sumSeries(sub.previous)) : 0,
  };
}

// ---------------------------------------------------------------------------
// Validation for the custom-report / alert editors.
// ---------------------------------------------------------------------------

export interface CustomReportDraft {
  name: string;
  metrics: CustomMetric[];
  dimensions: CustomDimension[];
  range: DateRangeKey;
  startDate: string | null;
  endDate: string | null;
  compare: CompareKey;
  filters: {
    country: string; language: Lang | "all";
    status: OrderStatus | "all"; productType: ProductType | "all";
    subscription: "all" | "monthly" | "yearly" | "none";
    channel: "all" | NotifChannel;
  };
  schedule: "daily" | "weekly" | "monthly" | "quarterly" | null;
  exportFormats: ("csv" | "xlsx" | "pdf")[];
}

export function emptyDraft(): CustomReportDraft {
  return {
    name: "",
    metrics: ["revenue","orders"],
    dimensions: ["date"],
    range: "last30",
    startDate: null, endDate: null,
    compare: "prev_period",
    filters: {
      country: "", language: "all", status: "all",
      productType: "all", subscription: "all", channel: "all",
    },
    schedule: null,
    exportFormats: [],
  };
}

export type ValidationCode =
  | "name_required" | "metric_required" | "dimension_required"
  | "invalid_range" | "invalid_compare" | "negative_threshold"
  | "schedule_required" | "export_needs_section" | "unsupported_combo";

export function validateDraft(d: CustomReportDraft): ValidationCode[] {
  const errs: ValidationCode[] = [];
  if (!d.name.trim()) errs.push("name_required");
  if (d.metrics.length === 0) errs.push("metric_required");
  if (d.dimensions.length === 0) errs.push("dimension_required");
  if (d.range === "custom" && d.startDate && d.endDate) {
    if (new Date(d.startDate).getTime() > new Date(d.endDate).getTime()) {
      errs.push("invalid_range");
    }
  }
  if (d.compare !== "none" && d.range === "today") errs.push("invalid_compare");
  if (d.exportFormats.length > 0 && d.metrics.length === 0) errs.push("export_needs_section");
  if (d.metrics.includes("subscriptions") && d.dimensions.includes("channel")) {
    errs.push("unsupported_combo");
  }
  return errs;
}

export function validateAlert(a: AlertRule): ValidationCode[] {
  const errs: ValidationCode[] = [];
  if (a.threshold < 0) errs.push("negative_threshold");
  return errs;
}

// Deep-equality helper for unsaved-changes tracking.
export function draftEqual(a: CustomReportDraft, b: CustomReportDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// EUR formatter (locale-agnostic, keeps demo numbers readable).
export function fmtEUR(n: number): string {
  return `€${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}
export function fmtPct(n: number): string {
  const s = n > 0 ? `+${n}` : `${n}`;
  return `${s}%`;
}
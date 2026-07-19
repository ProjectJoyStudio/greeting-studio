import { useMemo, useState, useEffect } from "react";
import {
  RefreshCw, Download, CalendarClock, GitCompare, Bookmark,
  TrendingUp, TrendingDown, AlertTriangle, Plus, Trash2,
  Copy, Save, FileText, FileSpreadsheet, FileImage, Bell,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import {
  computeOverview, sliceRange, sumSeries,
  REVENUE_SERIES_90, ORDERS_SERIES_90, USERS_SERIES_90, SUB_SERIES_90,
  REVENUE_BY_PRODUCT, REVENUE_BY_COUNTRY, REVENUE_BY_LANGUAGE,
  REVENUE_ROWS, ORDERS_BY_TYPE, USER_ROWS, CREDIT_PACKAGE_SALES,
  CATALOG_ROWS, PROMOTION_PERF, NOTIF_FAILS, CHANNEL_STATS,
  CALENDAR_UPCOMING, COST_BREAKDOWN, PROFIT_BY_PRODUCT,
  SERVICE_ROWS, ROUTING_EVENTS, SAVED_REPORTS, DEFAULT_ALERTS,
  ALERT_KINDS, CUSTOM_METRICS, CUSTOM_DIMENSIONS, PRODUCT_TYPES,
  REPORT_COUNTRIES, REPORT_LANGS, daysForRange, fmtEUR, fmtNum, fmtPct,
  emptyDraft, validateDraft, validateAlert, draftEqual,
  type DateRangeKey, type CompareKey, type ProductType, type OrderStatus,
  type CustomReportDraft, type AlertRule, type SeriesPoint,
  type ValidationCode,
} from "@/lib/admin/reports";
import { useLocalRP, type RPKey } from "./i18n";

// ---------- shared class strings --------------------------------------------

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90";
const chipCls =
  "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground";

const RANGES: DateRangeKey[] = [
  "today","yesterday","last7","last30","this_month",
  "prev_month","this_quarter","this_year","custom",
];
const COMPARES: CompareKey[] = ["prev_period","prev_month","prev_year","none"];

type MainTab =
  | "overview" | "revenue" | "orders" | "users" | "subs" | "credits"
  | "catalog" | "promos" | "notifs" | "calendar" | "production"
  | "service" | "load" | "profit" | "country" | "custom" | "alerts";

const TABS: { key: MainTab; label: RPKey }[] = [
  { key: "overview",   label: "rp_tab_overview" },
  { key: "revenue",    label: "rp_tab_revenue" },
  { key: "orders",     label: "rp_tab_orders" },
  { key: "users",      label: "rp_tab_users" },
  { key: "subs",       label: "rp_tab_subs" },
  { key: "credits",    label: "rp_tab_credits" },
  { key: "catalog",    label: "rp_tab_catalog" },
  { key: "promos",     label: "rp_tab_promos" },
  { key: "notifs",     label: "rp_tab_notifs" },
  { key: "calendar",   label: "rp_tab_calendar" },
  { key: "production", label: "rp_tab_production" },
  { key: "service",    label: "rp_tab_service" },
  { key: "load",       label: "rp_tab_load" },
  { key: "profit",     label: "rp_tab_profit" },
  { key: "country",    label: "rp_tab_country" },
  { key: "custom",     label: "rp_tab_custom" },
  { key: "alerts",     label: "rp_tab_alerts" },
];

function productLabel(p: ProductType): RPKey {
  return (`p_${p}` as RPKey);
}

// ---------- reusable presentation pieces ------------------------------------

function Kpi({
  label, value, delta, tone,
}: {
  label: string; value: string; delta?: number; tone?: "up" | "down" | "muted";
}) {
  const showDelta = typeof delta === "number";
  const positive = showDelta && delta! >= 0;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-[Fraunces] text-2xl font-semibold text-foreground">
        {value}
      </div>
      {showDelta && (
        <div className={`mt-1 inline-flex items-center gap-1 text-xs ${
          tone === "muted" ? "text-muted-foreground" :
          positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
        }`}>
          {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {fmtPct(delta!)}
        </div>
      )}
    </div>
  );
}

function Card({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-[Fraunces] text-base font-semibold text-foreground">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Compact inline bar chart (SVG). */
function BarChart({ data, max, formatter }: {
  data: { label: string; value: number }[];
  max?: number;
  formatter?: (n: number) => string;
}) {
  const cap = max ?? Math.max(1, ...data.map((d) => d.value));
  const fmt = formatter ?? fmtNum;
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[7rem_1fr_5rem] items-center gap-2 text-xs">
          <div className="truncate text-muted-foreground">{d.label}</div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80"
              style={{ width: `${Math.max(2, (d.value / cap) * 100)}%` }}
            />
          </div>
          <div className="text-right font-medium tabular-nums text-foreground">{fmt(d.value)}</div>
        </div>
      ))}
    </div>
  );
}

/** Sparkline (SVG). */
function Spark({ points, height = 60 }: { points: SeriesPoint[]; height?: number }) {
  if (points.length === 0) return null;
  const w = 600, h = height;
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const range = Math.max(1, max - min);
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1 || 1)) * w;
    const y = h - ((p.value - min) / range) * (h - 6) - 3;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full">
      <path d={area} fill="currentColor" className="text-primary/15" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.6} className="text-primary" />
    </svg>
  );
}

function StatusPill({ children, tone = "muted" }: {
  children: React.ReactNode; tone?: "muted" | "success" | "warning" | "danger";
}) {
  const map = {
    muted:   "bg-muted text-muted-foreground",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    danger:  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${map[tone]}`}>{children}</span>;
}

function statusTone(s: OrderStatus): "muted" | "success" | "warning" | "danger" {
  if (s === "delivered" || s === "completed") return "success";
  if (s === "failed" || s === "cancelled") return "danger";
  if (s === "queue" || s === "processing") return "warning";
  return "muted";
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  );
}

// ---------- main component --------------------------------------------------

export function ReportsPage() {
  const { lang } = useI18n();
  const L = useLocalRP(lang);

  const [tab, setTab] = useState<MainTab>("overview");
  const [range, setRange] = useState<DateRangeKey>("last30");
  const [compare, setCompare] = useState<CompareKey>("prev_period");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [tick, setTick] = useState(0);

  const [showExport, setShowExport] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  const [alerts, setAlerts] = useState<AlertRule[]>(() => [...DEFAULT_ALERTS]);

  const [savedReports] = useState(() => [...SAVED_REPORTS]);

  // recompute demo data by range
  const overview = useMemo(() => computeOverview(range, compare), [range, compare, tick]);
  const days = daysForRange(range);
  const revSeries = useMemo(() => sliceRange(REVENUE_SERIES_90, days).current, [days]);
  const ordSeries = useMemo(() => sliceRange(ORDERS_SERIES_90, days).current, [days]);
  const usrSeries = useMemo(() => sliceRange(USERS_SERIES_90, days).current, [days]);
  const subSeries = useMemo(() => sliceRange(SUB_SERIES_90, days).current, [days]);

  return (
    <div className="space-y-6">
      {/* ---------------- Header ---------------- */}
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="font-[Fraunces] text-3xl font-semibold text-foreground">{L("rp_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{L("rp_subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className={btnBase} onClick={() => setTick((n) => n + 1)}>
            <RefreshCw className="h-3.5 w-3.5" />{L("rp_refresh")}
          </button>
          <button className={btnBase} onClick={() => setShowExport(true)}>
            <Download className="h-3.5 w-3.5" />{L("rp_export")}
          </button>
          <button className={btnBase} onClick={() => setShowSchedule(true)}>
            <CalendarClock className="h-3.5 w-3.5" />{L("rp_schedule")}
          </button>
          <button className={btnBase} onClick={() => setShowCompare(true)}>
            <GitCompare className="h-3.5 w-3.5" />{L("rp_compare")}
          </button>
          <button className={btnBase} onClick={() => setShowSaved(true)}>
            <Bookmark className="h-3.5 w-3.5" />{L("rp_saved")}
          </button>
          <span className={`${chipCls} border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300`}>
            <AlertTriangle className="h-3 w-3" />{L("rp_demo_note")}
          </span>
        </div>

        {/* Global range / compare */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-2">
          <label className="text-xs font-medium text-muted-foreground">{L("lbl_from")}–{L("lbl_to")}:</label>
          <select
            className={`${inputCls} !w-auto`}
            value={range}
            onChange={(e) => setRange(e.target.value as DateRangeKey)}
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>{L(`dr_${r}` as RPKey)}</option>
            ))}
          </select>
          {range === "custom" && (
            <>
              <input type="date" className={`${inputCls} !w-auto`} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <span className="text-xs text-muted-foreground">→</span>
              <input type="date" className={`${inputCls} !w-auto`} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </>
          )}
          <span className="mx-2 h-4 w-px bg-border/60" />
          <label className="text-xs font-medium text-muted-foreground">{L("rp_compare")}:</label>
          <select
            className={`${inputCls} !w-auto`}
            value={compare}
            onChange={(e) => setCompare(e.target.value as CompareKey)}
          >
            {COMPARES.map((c) => (
              <option key={c} value={c}>{L(`cmp_${c}` as RPKey)}</option>
            ))}
          </select>
        </div>
      </header>

      {/* ---------------- Tabs ---------------- */}
      <nav className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-card/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {L(t.label)}
          </button>
        ))}
      </nav>

      {/* ---------------- Panels ---------------- */}
      {tab === "overview"   && <OverviewPanel L={L} kpis={overview} revSeries={revSeries} ordSeries={ordSeries} />}
      {tab === "revenue"    && <RevenuePanel L={L} revSeries={revSeries} />}
      {tab === "orders"     && <OrdersPanel L={L} />}
      {tab === "users"      && <UsersPanel L={L} usrSeries={usrSeries} />}
      {tab === "subs"       && <SubscriptionsPanel L={L} subSeries={subSeries} />}
      {tab === "credits"    && <CreditsPanel L={L} />}
      {tab === "catalog"    && <CatalogPanel L={L} />}
      {tab === "promos"     && <PromotionsPanel L={L} />}
      {tab === "notifs"     && <NotificationsPanel L={L} />}
      {tab === "calendar"   && <CalendarPanel L={L} />}
      {tab === "production" && <ProductionPanel L={L} />}
      {tab === "service"    && <ServicePanel L={L} />}
      {tab === "load"       && <LoadPanel L={L} />}
      {tab === "profit"     && <ProfitPanel L={L} />}
      {tab === "country"    && <CountryLangPanel L={L} />}
      {tab === "custom"     && <CustomPanel L={L} open={showBuilder} setOpen={setShowBuilder} />}
      {tab === "alerts"     && <AlertsPanel L={L} alerts={alerts} setAlerts={setAlerts} />}

      {/* ---------------- Modals ---------------- */}
      {showExport   && <ExportModal L={L} onClose={() => setShowExport(false)} />}
      {showSchedule && <ScheduleModal L={L} onClose={() => setShowSchedule(false)} />}
      {showSaved    && <SavedReportsModal L={L} rows={savedReports} onClose={() => setShowSaved(false)} />}
      {showCompare  && <CompareModal L={L} value={compare} onChange={setCompare} onClose={() => setShowCompare(false)} />}
    </div>
  );
}

type Lloc = ReturnType<typeof useLocalRP>;

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewPanel({ L, kpis, revSeries, ordSeries }: {
  L: Lloc; kpis: ReturnType<typeof computeOverview>;
  revSeries: SeriesPoint[]; ordSeries: SeriesPoint[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={L("k_total_revenue")} value={fmtEUR(kpis.totalRevenueEUR)} delta={kpis.revenueDeltaPct} />
        <Kpi label={L("k_net_revenue")}   value={fmtEUR(kpis.netRevenueEUR)}   delta={kpis.revenueDeltaPct} />
        <Kpi label={L("k_credits_sold")}  value={fmtNum(kpis.creditsSold)}     delta={kpis.revenueDeltaPct} tone="muted" />
        <Kpi label={L("k_active_subs")}   value={fmtNum(kpis.activeSubscriptions)} delta={kpis.subsDeltaPct} />
        <Kpi label={L("k_new_users")}     value={fmtNum(kpis.newUsers)}        delta={kpis.usersDeltaPct} />
        <Kpi label={L("k_total_orders")}  value={fmtNum(kpis.totalOrders)}     delta={kpis.ordersDeltaPct} />
        <Kpi label={L("k_completed")}     value={fmtNum(kpis.completedOrders)} />
        <Kpi label={L("k_cancelled")}     value={fmtNum(kpis.cancelledOrders)} />
        <Kpi label={L("k_refunds")}       value={fmtEUR(kpis.refundsEUR)} />
        <Kpi label={L("k_aov")}           value={fmtEUR(kpis.avgOrderValueEUR)} />
        <Kpi label={L("k_costs")}         value={fmtEUR(kpis.estimatedCostsEUR)} tone="muted" />
        <Kpi label={L("k_profit")}        value={fmtEUR(kpis.estimatedProfitEUR)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`${L("k_total_revenue")} · ${L("s_over_time")}`}>
          <Spark points={revSeries} />
        </Card>
        <Card title={`${L("k_total_orders")} · ${L("s_over_time")}`}>
          <Spark points={ordSeries} />
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue
// ---------------------------------------------------------------------------

function RevenuePanel({ L, revSeries }: { L: Lloc; revSeries: SeriesPoint[] }) {
  const gross = sumSeries(revSeries);
  const discounts = Math.round(gross * 0.048);
  const refunds = Math.round(gross * 0.023);
  const fees = Math.round(gross * 0.028);
  const net = gross - discounts - refunds - fees;
  const tax = Math.round(net * 0.19);

  const byProduct = PRODUCT_TYPES.map((p) => ({ label: L(productLabel(p)), value: REVENUE_BY_PRODUCT[p] }));
  const byCountry = Object.entries(REVENUE_BY_COUNTRY).map(([k, v]) => ({ label: k, value: v }));
  const byLang = LANGS.map((l) => ({ label: l.label, value: REVENUE_BY_LANGUAGE[l.code] }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={L("h_gross")} value={fmtEUR(gross)} />
        <Kpi label={L("h_discount")} value={fmtEUR(discounts)} />
        <Kpi label={L("h_refund")} value={fmtEUR(refunds)} />
        <Kpi label="Payment Fees" value={fmtEUR(fees)} tone="muted" />
        <Kpi label={L("h_net")} value={fmtEUR(net)} />
        <Kpi label="Tax (placeholder)" value={fmtEUR(tax)} tone="muted" />
        <Kpi label="ARPU" value={fmtEUR(Math.round(net / 620))} tone="muted" />
        <Kpi label={L("k_aov")} value={fmtEUR(Math.round(gross / 320))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`${L("h_revenue")} · ${L("s_over_time")}`}><Spark points={revSeries} /></Card>
        <Card title={`${L("h_revenue")} · ${L("s_by_product")}`}><BarChart data={byProduct} formatter={fmtEUR} /></Card>
        <Card title={`${L("h_revenue")} · ${L("s_by_country")}`}><BarChart data={byCountry} formatter={fmtEUR} /></Card>
        <Card title={`${L("h_revenue")} · ${L("s_by_language")}`}><BarChart data={byLang} formatter={fmtEUR} /></Card>
      </div>

      <Card title={L("rp_tab_revenue")}>
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">{L("h_date")}</th>
              <th className="p-2">{L("h_order_id")}</th>
              <th className="p-2">{L("h_customer")}</th>
              <th className="p-2">{L("h_product")}</th>
              <th className="p-2 text-right">{L("h_gross")}</th>
              <th className="p-2 text-right">{L("h_discount")}</th>
              <th className="p-2 text-right">{L("h_refund")}</th>
              <th className="p-2 text-right">{L("h_net")}</th>
              <th className="p-2">{L("h_currency")}</th>
              <th className="p-2">{L("h_status")}</th>
            </tr>
          </thead>
          <tbody>
            {REVENUE_ROWS.map((r) => (
              <tr key={r.orderId} className="border-t border-border/60 text-sm">
                <td className="p-2 tabular-nums">{r.date}</td>
                <td className="p-2 font-mono text-xs">{r.orderId}</td>
                <td className="p-2">{r.customer}</td>
                <td className="p-2">{L(productLabel(r.product))}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.gross)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.discount)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.refund)}</td>
                <td className="p-2 text-right tabular-nums font-medium">{fmtEUR(r.net)}</td>
                <td className="p-2">{r.currency}</td>
                <td className="p-2"><StatusPill tone={statusTone(r.status)}>{r.status}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function OrdersPanel({ L }: { L: Lloc }) {
  const [typeF, setTypeF] = useState<"all" | ProductType>("all");
  const [statusF, setStatusF] = useState<"all" | OrderStatus>("all");
  const [prioF, setPrioF] = useState<"all" | "standard" | "priority">("all");
  const [countryF, setCountryF] = useState("");
  const [langF, setLangF] = useState<"all" | Lang>("all");

  const rows = ORDERS_BY_TYPE.filter((r) => typeF === "all" || r.product === typeF);
  const totals = rows.reduce((a, r) => ({
    created: a.created + r.created, paid: a.paid + r.paid,
    queue: a.queue + r.queue, processing: a.processing + r.processing,
    completed: a.completed + r.completed, delivered: a.delivered + r.delivered,
    failed: a.failed + r.failed, cancelled: a.cancelled + r.cancelled,
  }), { created:0, paid:0, queue:0, processing:0, completed:0, delivered:0, failed:0, cancelled:0 });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Orders Created" value={fmtNum(totals.created)} />
        <Kpi label="Orders Paid" value={fmtNum(totals.paid)} />
        <Kpi label="Orders in Queue" value={fmtNum(totals.queue)} tone="muted" />
        <Kpi label="Processing" value={fmtNum(totals.processing)} tone="muted" />
        <Kpi label={L("k_completed")} value={fmtNum(totals.completed)} />
        <Kpi label="Delivered" value={fmtNum(totals.delivered)} />
        <Kpi label="Failed" value={fmtNum(totals.failed)} />
        <Kpi label={L("k_cancelled")} value={fmtNum(totals.cancelled)} />
      </div>

      <Card title={L("cb_filters")}>
        <div className="flex flex-wrap gap-2">
          <select className={`${inputCls} !w-auto`} value={typeF} onChange={(e) => setTypeF(e.target.value as any)}>
            <option value="all">{L("lbl_all")} · {L("lbl_type_filter")}</option>
            {PRODUCT_TYPES.map((p) => <option key={p} value={p}>{L(productLabel(p))}</option>)}
          </select>
          <select className={`${inputCls} !w-auto`} value={statusF} onChange={(e) => setStatusF(e.target.value as any)}>
            <option value="all">{L("lbl_all")} · {L("lbl_status_filter")}</option>
            {(["created","paid","queue","processing","completed","delivered","failed","cancelled"] as OrderStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={`${inputCls} !w-auto`} value={prioF} onChange={(e) => setPrioF(e.target.value as any)}>
            <option value="all">{L("lbl_all")} · {L("lbl_priority")}</option>
            <option value="standard">Standard</option>
            <option value="priority">Priority</option>
          </select>
          <select className={`${inputCls} !w-auto`} value={countryF} onChange={(e) => setCountryF(e.target.value)}>
            <option value="">{L("lbl_all")} · {L("lbl_country_filter")}</option>
            {REPORT_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={`${inputCls} !w-auto`} value={langF} onChange={(e) => setLangF(e.target.value as any)}>
            <option value="all">{L("lbl_all")} · {L("lbl_language_filter")}</option>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
      </Card>

      <Card title={`${L("rp_tab_orders")} · ${L("s_by_product")}`}>
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">{L("h_product")}</th>
              <th className="p-2 text-right">Created</th>
              <th className="p-2 text-right">Paid</th>
              <th className="p-2 text-right">Queue</th>
              <th className="p-2 text-right">Processing</th>
              <th className="p-2 text-right">{L("k_completed")}</th>
              <th className="p-2 text-right">Delivered</th>
              <th className="p-2 text-right">Failed</th>
              <th className="p-2 text-right">Cancelled</th>
              <th className="p-2 text-right">Avg Proc (min)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product} className="border-t border-border/60 text-sm">
                <td className="p-2 font-medium">{L(productLabel(r.product))}</td>
                <td className="p-2 text-right tabular-nums">{r.created}</td>
                <td className="p-2 text-right tabular-nums">{r.paid}</td>
                <td className="p-2 text-right tabular-nums">{r.queue}</td>
                <td className="p-2 text-right tabular-nums">{r.processing}</td>
                <td className="p-2 text-right tabular-nums">{r.completed}</td>
                <td className="p-2 text-right tabular-nums">{r.delivered}</td>
                <td className="p-2 text-right tabular-nums">{r.failed}</td>
                <td className="p-2 text-right tabular-nums">{r.cancelled}</td>
                <td className="p-2 text-right tabular-nums text-muted-foreground">{r.avgProcessingMin}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function UsersPanel({ L, usrSeries }: { L: Lloc; usrSeries: SeriesPoint[] }) {
  const total = 12840;
  const nw = sumSeries(usrSeries);
  const active = 3820, returning = 1420, inactive = 6120, blocked = 82;
  const withSub = 2140, withoutSub = total - withSub;
  const topRevenue = [...USER_ROWS].sort((a, b) => b.revenueEUR - a.revenueEUR).slice(0, 6);
  const topOrders = [...USER_ROWS].sort((a, b) => b.orders - a.orders).slice(0, 6);
  const lowCredit = [...USER_ROWS].filter((u) => u.creditBalance < 30).slice(0, 6);
  const inactives = [...USER_ROWS].filter((u) => u.status === "inactive").slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Users" value={fmtNum(total)} />
        <Kpi label={L("k_new_users")} value={fmtNum(nw)} />
        <Kpi label="Active" value={fmtNum(active)} />
        <Kpi label="Returning" value={fmtNum(returning)} />
        <Kpi label="Inactive" value={fmtNum(inactive)} tone="muted" />
        <Kpi label="Blocked" value={fmtNum(blocked)} tone="muted" />
        <Kpi label="With Subscription" value={fmtNum(withSub)} />
        <Kpi label="Without Subscription" value={fmtNum(withoutSub)} tone="muted" />
      </div>

      <Card title={`${L("k_new_users")} · ${L("s_over_time")}`}><Spark points={usrSeries} /></Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top Customers by Revenue">
          <UserMiniTable L={L} rows={topRevenue} showRevenue />
        </Card>
        <Card title="Top Customers by Orders">
          <UserMiniTable L={L} rows={topOrders} showOrders />
        </Card>
        <Card title="Users with Low Credit Balance">
          <UserMiniTable L={L} rows={lowCredit} showCredits />
        </Card>
        <Card title="Recently Inactive Users">
          <UserMiniTable L={L} rows={inactives} />
        </Card>
      </div>
    </div>
  );
}

function UserMiniTable({ L, rows, showRevenue, showOrders, showCredits }: {
  L: Lloc; rows: typeof USER_ROWS;
  showRevenue?: boolean; showOrders?: boolean; showCredits?: boolean;
}) {
  return (
    <TableWrap>
      <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="p-2">{L("h_customer")}</th>
          <th className="p-2">{L("h_country")}</th>
          <th className="p-2">{L("h_language")}</th>
          {showRevenue && <th className="p-2 text-right">{L("h_revenue")}</th>}
          {showOrders && <th className="p-2 text-right">{L("h_orders")}</th>}
          {showCredits && <th className="p-2 text-right">{L("h_credits")}</th>}
          <th className="p-2">{L("h_status")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u) => (
          <tr key={u.id} className="border-t border-border/60 text-sm">
            <td className="p-2 font-medium">{u.name}</td>
            <td className="p-2">{u.country}</td>
            <td className="p-2">{u.lang.toUpperCase()}</td>
            {showRevenue && <td className="p-2 text-right tabular-nums">{fmtEUR(u.revenueEUR)}</td>}
            {showOrders && <td className="p-2 text-right tabular-nums">{u.orders}</td>}
            {showCredits && <td className="p-2 text-right tabular-nums">{u.creditBalance}</td>}
            <td className="p-2"><StatusPill tone={u.status === "blocked" ? "danger" : u.status === "inactive" ? "muted" : "success"}>{u.status}</StatusPill></td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

function SubscriptionsPanel({ L, subSeries }: { L: Lloc; subSeries: SeriesPoint[] }) {
  const monthly = 1420, yearly = 720;
  const newSubs = sumSeries(subSeries);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active Monthly" value={fmtNum(monthly)} />
        <Kpi label="Active Yearly" value={fmtNum(yearly)} />
        <Kpi label="New Subscriptions" value={fmtNum(newSubs)} />
        <Kpi label="Renewals" value={fmtNum(Math.round(newSubs * 0.62))} />
        <Kpi label="Expired" value={fmtNum(Math.round(newSubs * 0.18))} tone="muted" />
        <Kpi label="Cancelled" value={fmtNum(Math.round(newSubs * 0.12))} tone="muted" />
        <Kpi label="Trial (placeholder)" value="—" tone="muted" />
        <Kpi label="MRR (placeholder)" value={fmtEUR(monthly * 6)} tone="muted" />
        <Kpi label="ARR (placeholder)" value={fmtEUR(monthly * 72 + yearly * 60)} tone="muted" />
        <Kpi label="Churn (placeholder)" value="3.4%" tone="muted" />
      </div>
      <Card title={`${L("rp_tab_subs")} · ${L("s_over_time")}`}><Spark points={subSeries} /></Card>
      <Card title={`${L("s_by_country")}`}>
        <BarChart data={REPORT_COUNTRIES.map((c) => ({ label: c, value: Math.round((monthly + yearly) / REPORT_COUNTRIES.length + (c.charCodeAt(0) % 40)) }))} />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

function CreditsPanel({ L }: { L: Lloc }) {
  const totalSold = CREDIT_PACKAGE_SALES.reduce((a, r) => a + r.sold, 0);
  const totalRev = CREDIT_PACKAGE_SALES.reduce((a, r) => a + r.revenueEUR, 0);
  const bonus = CREDIT_PACKAGE_SALES.reduce((a, r) => a + r.bonusCredits, 0);
  const refunded = CREDIT_PACKAGE_SALES.reduce((a, r) => a + r.refundedCredits, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={L("k_credits_sold")} value={fmtNum(totalSold)} />
        <Kpi label="Bonus Credits Granted" value={fmtNum(bonus)} />
        <Kpi label="Credits Used" value={fmtNum(Math.round(totalSold * 0.72))} />
        <Kpi label="Credits Refunded" value={fmtNum(refunded)} tone="muted" />
        <Kpi label="Credits Expired" value={fmtNum(Math.round(totalSold * 0.03))} tone="muted" />
        <Kpi label="Current Balance" value={fmtNum(Math.round(totalSold * 0.28))} />
        <Kpi label="Avg Credit Purchase" value={fmtEUR(Math.round(totalRev / totalSold))} />
        <Kpi label="Avg Usage / Order" value={fmtNum(18)} tone="muted" />
      </div>
      <Card title="Credit Package Sales">
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">Package</th>
              <th className="p-2 text-right">Sold</th>
              <th className="p-2 text-right">{L("h_revenue")}</th>
              <th className="p-2 text-right">Bonus</th>
              <th className="p-2 text-right">Refunded</th>
            </tr>
          </thead>
          <tbody>
            {CREDIT_PACKAGE_SALES.map((r) => (
              <tr key={r.packageId} className="border-t border-border/60 text-sm">
                <td className="p-2 font-medium">{r.name}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(r.sold)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.revenueEUR)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(r.bonusCredits)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(r.refundedCredits)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

function CatalogPanel({ L }: { L: Lloc }) {
  const [statusF, setStatusF] = useState<"all" | "published" | "draft" | "archived">("all");
  const [typeF, setTypeF] = useState<"all" | ProductType>("all");

  const filtered = CATALOG_ROWS.filter((r) =>
    (statusF === "all" || r.status === statusF) &&
    (typeF === "all" || r.type === typeF)
  );
  const published = CATALOG_ROWS.filter((r) => r.status === "published").length;
  const drafts = CATALOG_ROWS.filter((r) => r.status === "draft").length;
  const archived = CATALOG_ROWS.filter((r) => r.status === "archived").length;
  const views = CATALOG_ROWS.reduce((a, r) => a + r.views, 0);
  const uses = CATALOG_ROWS.reduce((a, r) => a + r.uses, 0);
  const favs = CATALOG_ROWS.reduce((a, r) => a + r.favorites, 0);
  const shares = CATALOG_ROWS.reduce((a, r) => a + r.shares, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Items" value={fmtNum(CATALOG_ROWS.length)} />
        <Kpi label="Published" value={fmtNum(published)} />
        <Kpi label="Drafts" value={fmtNum(drafts)} tone="muted" />
        <Kpi label="Archived" value={fmtNum(archived)} tone="muted" />
        <Kpi label={L("h_views")} value={fmtNum(views)} />
        <Kpi label={L("h_uses")} value={fmtNum(uses)} />
        <Kpi label={L("h_favorites")} value={fmtNum(favs)} />
        <Kpi label={L("h_shares")} value={fmtNum(shares)} />
      </div>

      <Card title={L("cb_filters")}>
        <div className="flex flex-wrap gap-2">
          <select className={`${inputCls} !w-auto`} value={statusF} onChange={(e) => setStatusF(e.target.value as any)}>
            <option value="all">{L("lbl_all")} · {L("lbl_status_filter")}</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select className={`${inputCls} !w-auto`} value={typeF} onChange={(e) => setTypeF(e.target.value as any)}>
            <option value="all">{L("lbl_all")} · {L("lbl_type_filter")}</option>
            {PRODUCT_TYPES.map((p) => <option key={p} value={p}>{L(productLabel(p))}</option>)}
          </select>
        </div>
      </Card>

      <Card title={L("rp_tab_catalog")}>
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Category</th>
              <th className="p-2">{L("h_type")}</th>
              <th className="p-2 text-right">{L("h_views")}</th>
              <th className="p-2 text-right">{L("h_uses")}</th>
              <th className="p-2 text-right">{L("h_favorites")}</th>
              <th className="p-2 text-right">{L("h_shares")}</th>
              <th className="p-2 text-right">{L("h_revenue")}</th>
              <th className="p-2">{L("h_status")}</th>
              <th className="p-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border/60 text-sm">
                <td className="p-2 font-medium">{r.title}</td>
                <td className="p-2">{r.category}</td>
                <td className="p-2">{L(productLabel(r.type))}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(r.views)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(r.uses)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(r.favorites)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(r.shares)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.revenueEUR)}</td>
                <td className="p-2">
                  <StatusPill tone={r.status === "published" ? "success" : r.status === "draft" ? "warning" : "muted"}>
                    {r.status}
                  </StatusPill>
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {r.missingTranslations > 0 && <span className="mr-2">·{r.missingTranslations} tr</span>}
                  {r.missingMedia && <span>·media</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

function PromotionsPanel({ L }: { L: Lloc }) {
  const activeCount = PROMOTION_PERF.filter((p) => p.status === "active").length;
  const codesUsed = PROMOTION_PERF.reduce((a, p) => a + p.uses, 0);
  const discount = PROMOTION_PERF.reduce((a, p) => a + p.discountEUR, 0);
  const revenue = PROMOTION_PERF.reduce((a, p) => a + p.revenueEUR, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active Promotions" value={fmtNum(activeCount)} />
        <Kpi label="Promo Codes Used" value={fmtNum(codesUsed)} />
        <Kpi label="Total Discount Given" value={fmtEUR(discount)} tone="muted" />
        <Kpi label={L("h_revenue")} value={fmtEUR(revenue)} />
      </div>
      <Card title="Best Performing Promotions">
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Code</th>
              <th className="p-2 text-right">{L("h_uses")}</th>
              <th className="p-2 text-right">{L("h_discount")}</th>
              <th className="p-2 text-right">{L("h_revenue")}</th>
              <th className="p-2">{L("h_status")}</th>
            </tr>
          </thead>
          <tbody>
            {PROMOTION_PERF.map((p) => (
              <tr key={p.id} className="border-t border-border/60 text-sm">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2 font-mono text-xs">{p.code ?? "—"}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(p.uses)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(p.discountEUR)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(p.revenueEUR)}</td>
                <td className="p-2">
                  <StatusPill tone={p.status === "active" ? "success" : p.status === "expired" ? "muted" : "warning"}>{p.status}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function NotificationsPanel({ L }: { L: Lloc }) {
  const totals = Object.values(CHANNEL_STATS).reduce((a, s) => ({
    sent: a.sent + s.sent, delivered: a.delivered + s.delivered,
    read: a.read + s.read, failed: a.failed + s.failed,
  }), { sent: 0, delivered: 0, read: 0, failed: 0 });
  const delivRate = Math.round((totals.delivered / totals.sent) * 1000) / 10;
  const readRate = Math.round((totals.read / totals.sent) * 1000) / 10;
  const failRate = Math.round((totals.failed / totals.sent) * 1000) / 10;

  const chData = (Object.keys(CHANNEL_STATS) as (keyof typeof CHANNEL_STATS)[]).map((c) => ({
    label: L(`ch_${c}` as RPKey), value: CHANNEL_STATS[c].sent,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Sent" value={fmtNum(totals.sent)} />
        <Kpi label="Delivered" value={fmtNum(totals.delivered)} />
        <Kpi label="Read" value={fmtNum(totals.read)} />
        <Kpi label="Failed" value={fmtNum(totals.failed)} tone="muted" />
        <Kpi label="Delivery Rate" value={`${delivRate}%`} />
        <Kpi label="Read Rate" value={`${readRate}%`} />
        <Kpi label="Failure Rate" value={`${failRate}%`} tone="muted" />
      </div>
      <Card title={`${L("s_by_channel")}`}>
        <BarChart data={chData} />
      </Card>
      <Card title="Failed Notifications">
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">{L("h_channel")}</th>
              <th className="p-2">{L("h_type")}</th>
              <th className="p-2">{L("h_customer")}</th>
              <th className="p-2">{L("h_country")}</th>
              <th className="p-2">{L("h_language")}</th>
              <th className="p-2 text-right">Attempts</th>
              <th className="p-2">Error</th>
              <th className="p-2">{L("h_date")}</th>
            </tr>
          </thead>
          <tbody>
            {NOTIF_FAILS.map((n) => (
              <tr key={n.id} className="border-t border-border/60 text-sm">
                <td className="p-2">{L(`ch_${n.channel}` as RPKey)}</td>
                <td className="p-2">{n.type}</td>
                <td className="p-2">{n.recipient}</td>
                <td className="p-2">{n.country}</td>
                <td className="p-2">{n.language.toUpperCase()}</td>
                <td className="p-2 text-right tabular-nums">{n.attempts}</td>
                <td className="p-2 text-xs text-muted-foreground">{n.lastError}</td>
                <td className="p-2 text-xs">{new Date(n.at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

function CalendarPanel({ L }: { L: Lloc }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active Calendar Users" value={fmtNum(4820)} />
        <Kpi label="Monthly" value={fmtNum(1240)} />
        <Kpi label="Yearly" value={fmtNum(620)} />
        <Kpi label="Personal Events" value={fmtNum(9820)} />
        <Kpi label="Scheduled Gifts" value={fmtNum(1420)} />
        <Kpi label="Reminders Sent" value={fmtNum(24820)} />
        <Kpi label="Failed Deliveries" value={fmtNum(82)} tone="muted" />
        <Kpi label="Upcoming Deliveries" value={fmtNum(320)} />
      </div>
      <Card title="Upcoming Scheduled Gifts">
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">{L("h_customer")}</th>
              <th className="p-2">Event</th>
              <th className="p-2">{L("h_date")}</th>
              <th className="p-2">{L("h_channel")}</th>
              <th className="p-2">{L("h_country")}</th>
            </tr>
          </thead>
          <tbody>
            {CALENDAR_UPCOMING.map((c) => (
              <tr key={c.id} className="border-t border-border/60 text-sm">
                <td className="p-2 font-mono text-xs">{c.id}</td>
                <td className="p-2">{c.customer}</td>
                <td className="p-2">{c.eventType}</td>
                <td className="p-2">{c.occursAt}</td>
                <td className="p-2">{L(`ch_${c.reminderChannel}` as RPKey)}</td>
                <td className="p-2">{c.country}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Production and Costs
// ---------------------------------------------------------------------------

function ProductionPanel({ L }: { L: Lloc }) {
  const total = COST_BREAKDOWN.reduce((a, r) => a + r.estimatedEUR, 0);
  const revenue = Object.values(REVENUE_BY_PRODUCT).reduce((a, b) => a + b, 0);
  const profit = revenue - total;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COST_BREAKDOWN.map((c) => (
          <Kpi key={c.category} label={c.category.replace(/_/g, " ")} value={fmtEUR(c.estimatedEUR)} tone="muted" />
        ))}
        <Kpi label="Total Estimated Cost" value={fmtEUR(total)} />
        <Kpi label={L("k_profit")} value={fmtEUR(profit)} />
        <Kpi label="Estimated Margin" value={`${margin}%`} />
      </div>

      <Card title="Cost Breakdown">
        <BarChart data={COST_BREAKDOWN.map((c) => ({ label: c.category, value: c.estimatedEUR }))} formatter={fmtEUR} />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service performance
// ---------------------------------------------------------------------------

function ServicePanel({ L }: { L: Lloc }) {
  return (
    <div className="space-y-6">
      <Card title={L("rp_tab_service")}>
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">Service ID</th>
              <th className="p-2">Category</th>
              <th className="p-2">{L("h_status")}</th>
              <th className="p-2 text-right">Assigned</th>
              <th className="p-2 text-right">Completed</th>
              <th className="p-2 text-right">Failed</th>
              <th className="p-2 text-right">Avg (ms)</th>
              <th className="p-2 text-right">Queue</th>
              <th className="p-2 text-right">Est. Cost</th>
              <th className="p-2 text-right">Success %</th>
              <th className="p-2">Last Error</th>
              <th className="p-2">Last Check</th>
            </tr>
          </thead>
          <tbody>
            {SERVICE_ROWS.map((s) => (
              <tr key={s.id} className="border-t border-border/60 text-sm">
                <td className="p-2 font-mono text-xs">{s.id}</td>
                <td className="p-2">{s.category}</td>
                <td className="p-2">
                  <StatusPill tone={s.status === "healthy" ? "success" : s.status === "degraded" ? "warning" : "danger"}>{s.status}</StatusPill>
                </td>
                <td className="p-2 text-right tabular-nums">{fmtNum(s.assigned)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(s.completed)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(s.failed)}</td>
                <td className="p-2 text-right tabular-nums">{s.avgMs}</td>
                <td className="p-2 text-right tabular-nums">{s.queue}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(Math.round(s.estimatedCostEUR))}</td>
                <td className="p-2 text-right tabular-nums">{s.successRate}%</td>
                <td className="p-2 text-xs text-muted-foreground">{s.lastError || "—"}</td>
                <td className="p-2 text-xs">{new Date(s.lastCheck).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Load distribution
// ---------------------------------------------------------------------------

function LoadPanel({ L }: { L: Lloc }) {
  const total = ROUTING_EVENTS.length;
  const auto = ROUTING_EVENTS.filter((r) => r.kind === "auto").length;
  const manual = ROUTING_EVENTS.filter((r) => r.kind === "manual").length;
  const reassign = ROUTING_EVENTS.filter((r) => r.kind === "reassign").length;
  const failover = ROUTING_EVENTS.filter((r) => r.kind === "failover").length;
  const overload = ROUTING_EVENTS.filter((r) => r.kind === "overload").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Tasks" value={fmtNum(total * 128)} />
        <Kpi label="Automatically Routed" value={fmtNum(auto * 96)} />
        <Kpi label="Manually Routed" value={fmtNum(manual * 12)} tone="muted" />
        <Kpi label="Reassigned" value={fmtNum(reassign * 24)} />
        <Kpi label="Failover Events" value={fmtNum(failover)} />
        <Kpi label="Overload Events" value={fmtNum(overload)} tone="muted" />
        <Kpi label="Avg Queue Time" value="3.4 min" />
        <Kpi label="Cost Saved (placeholder)" value="—" tone="muted" />
      </div>

      <Card title="Routing History">
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">{L("h_date")}</th>
              <th className="p-2">Kind</th>
              <th className="p-2">From</th>
              <th className="p-2">To</th>
              <th className="p-2">Task</th>
              <th className="p-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {ROUTING_EVENTS.map((r) => (
              <tr key={r.id} className="border-t border-border/60 text-sm">
                <td className="p-2 text-xs">{new Date(r.at).toLocaleString()}</td>
                <td className="p-2">{r.kind}</td>
                <td className="p-2 font-mono text-xs">{r.fromServiceId ?? "—"}</td>
                <td className="p-2 font-mono text-xs">{r.toServiceId}</td>
                <td className="p-2 font-mono text-xs">{r.taskId}</td>
                <td className="p-2 text-xs text-muted-foreground">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profit
// ---------------------------------------------------------------------------

function ProfitPanel({ L }: { L: Lloc }) {
  type Sort = "revenue" | "profit" | "margin_hi" | "margin_lo" | "orders" | "cost";
  const [sort, setSort] = useState<Sort>("revenue");
  const rows = useMemo(() => {
    const arr = [...PROFIT_BY_PRODUCT];
    switch (sort) {
      case "revenue": arr.sort((a, b) => b.revenueEUR - a.revenueEUR); break;
      case "profit":  arr.sort((a, b) => b.profitEUR - a.profitEUR); break;
      case "margin_hi": arr.sort((a, b) => b.marginPct - a.marginPct); break;
      case "margin_lo": arr.sort((a, b) => a.marginPct - b.marginPct); break;
      case "orders":  arr.sort((a, b) => b.orders - a.orders); break;
      case "cost":    arr.sort((a, b) => b.costEUR - a.costEUR); break;
    }
    return arr;
  }, [sort]);

  return (
    <div className="space-y-6">
      <Card title={L("rp_tab_profit")} action={
        <select className={`${inputCls} !w-auto`} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="revenue">Highest Revenue</option>
          <option value="profit">Highest Profit</option>
          <option value="margin_hi">Highest Margin</option>
          <option value="margin_lo">Lowest Margin</option>
          <option value="orders">Most Orders</option>
          <option value="cost">Highest Cost</option>
        </select>
      }>
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">{L("h_product")}</th>
              <th className="p-2 text-right">{L("h_orders")}</th>
              <th className="p-2 text-right">{L("h_revenue")}</th>
              <th className="p-2 text-right">Cost</th>
              <th className="p-2 text-right">{L("h_refund")}</th>
              <th className="p-2 text-right">{L("h_discount")}</th>
              <th className="p-2 text-right">{L("h_net")}</th>
              <th className="p-2 text-right">Profit</th>
              <th className="p-2 text-right">Margin</th>
              <th className="p-2 text-right">Avg Proc</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product} className="border-t border-border/60 text-sm">
                <td className="p-2 font-medium">{L(productLabel(r.product))}</td>
                <td className="p-2 text-right tabular-nums">{r.orders}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.revenueEUR)}</td>
                <td className="p-2 text-right tabular-nums text-muted-foreground">{fmtEUR(r.costEUR)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.refundEUR)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.discountEUR)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(r.netEUR)}</td>
                <td className="p-2 text-right tabular-nums font-medium">{fmtEUR(r.profitEUR)}</td>
                <td className="p-2 text-right tabular-nums">{r.marginPct}%</td>
                <td className="p-2 text-right tabular-nums text-muted-foreground">{r.avgProcessingMin} min</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Country & language
// ---------------------------------------------------------------------------

function CountryLangPanel({ L }: { L: Lloc }) {
  return (
    <div className="space-y-6">
      <Card title={`${L("h_revenue")} · ${L("s_by_country")}`}>
        <BarChart data={Object.entries(REVENUE_BY_COUNTRY).map(([k, v]) => ({ label: k, value: v }))} formatter={fmtEUR} />
      </Card>
      <Card title={`${L("h_revenue")} · ${L("s_by_language")}`}>
        <BarChart data={LANGS.map((l) => ({ label: l.label, value: REVENUE_BY_LANGUAGE[l.code] }))} formatter={fmtEUR} />
      </Card>
      <Card title={`${L("rp_tab_country")}`}>
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">{L("h_country")}</th>
              <th className="p-2 text-right">{L("h_revenue")}</th>
              <th className="p-2 text-right">Users</th>
              <th className="p-2 text-right">{L("h_orders")}</th>
              <th className="p-2 text-right">Subs</th>
              <th className="p-2 text-right">{L("h_credits")}</th>
              <th className="p-2 text-right">{L("k_aov")}</th>
            </tr>
          </thead>
          <tbody>
            {REPORT_COUNTRIES.map((c, i) => (
              <tr key={c} className="border-t border-border/60 text-sm">
                <td className="p-2 font-medium">{c}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(REVENUE_BY_COUNTRY[c])}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(120 + i * 42)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(240 + i * 18)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(20 + i * 4)}</td>
                <td className="p-2 text-right tabular-nums">{fmtNum(1200 + i * 210)}</td>
                <td className="p-2 text-right tabular-nums">{fmtEUR(28 + i)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Report Builder
// ---------------------------------------------------------------------------

function CustomPanel({ L, open, setOpen }: { L: Lloc; open: boolean; setOpen: (v: boolean) => void }) {
  const [draft, setDraft] = useState<CustomReportDraft>(() => emptyDraft());
  const [initial, setInitial] = useState<CustomReportDraft>(() => emptyDraft());
  const [saved, setSaved] = useState<CustomReportDraft[]>([]);
  const dirty = !draftEqual(draft, initial);
  const errors = validateDraft(draft);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function toggleArr<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function reset() {
    const e = emptyDraft();
    setDraft(e); setInitial(e);
  }

  return (
    <div className="space-y-6">
      <Card title={L("rp_tab_custom")} action={
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">· {L("cb_unsaved")}</span>}
          <button className={btnBase} onClick={reset}>{L("cb_cancel")}</button>
          <button className={btnBase} onClick={() => setDraft(initial)}>{L("cb_discard")}</button>
          <button
            className={btnPrimary}
            disabled={errors.length > 0}
            onClick={() => {
              setSaved((s) => [...s, draft]);
              setInitial(draft);
            }}
          >
            <Save className="h-3.5 w-3.5" />{L("cb_save")}
          </button>
        </div>
      }>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{L("cb_name")}</label>
              <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{L("cb_metrics")}</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {CUSTOM_METRICS.map((m) => (
                  <button key={m}
                    onClick={() => setDraft({ ...draft, metrics: toggleArr(draft.metrics, m) })}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${draft.metrics.includes(m) ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/50"}`}
                  >{m}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{L("cb_dimensions")}</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {CUSTOM_DIMENSIONS.map((d) => (
                  <button key={d}
                    onClick={() => setDraft({ ...draft, dimensions: toggleArr(draft.dimensions, d) })}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${draft.dimensions.includes(d) ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/50"}`}
                  >{d}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{L("cb_filters")}</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <select className={inputCls} value={draft.filters.country} onChange={(e) => setDraft({ ...draft, filters: { ...draft.filters, country: e.target.value } })}>
                  <option value="">{L("lbl_all")} · {L("lbl_country_filter")}</option>
                  {REPORT_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className={inputCls} value={draft.filters.language} onChange={(e) => setDraft({ ...draft, filters: { ...draft.filters, language: e.target.value as any } })}>
                  <option value="all">{L("lbl_all")} · {L("lbl_language_filter")}</option>
                  {REPORT_LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
                <select className={inputCls} value={draft.filters.productType} onChange={(e) => setDraft({ ...draft, filters: { ...draft.filters, productType: e.target.value as any } })}>
                  <option value="all">{L("lbl_all")} · {L("lbl_type_filter")}</option>
                  {PRODUCT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className={inputCls} value={draft.filters.status} onChange={(e) => setDraft({ ...draft, filters: { ...draft.filters, status: e.target.value as any } })}>
                  <option value="all">{L("lbl_all")} · {L("lbl_status_filter")}</option>
                  {(["created","paid","queue","processing","completed","delivered","failed","cancelled"] as OrderStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={inputCls} value={draft.filters.subscription} onChange={(e) => setDraft({ ...draft, filters: { ...draft.filters, subscription: e.target.value as any } })}>
                  <option value="all">{L("lbl_all")} · Subscription</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="none">None</option>
                </select>
                <select className={inputCls} value={draft.filters.channel} onChange={(e) => setDraft({ ...draft, filters: { ...draft.filters, channel: e.target.value as any } })}>
                  <option value="all">{L("lbl_all")} · {L("h_channel")}</option>
                  {(["email","sms","push","telegram","whatsapp","internal"] as const).map((c) => <option key={c} value={c}>{L(`ch_${c}` as RPKey)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{L("dr_custom")}</label>
                <select className={inputCls} value={draft.range} onChange={(e) => setDraft({ ...draft, range: e.target.value as any })}>
                  {RANGES.map((r) => <option key={r} value={r}>{L(`dr_${r}` as RPKey)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{L("rp_compare")}</label>
                <select className={inputCls} value={draft.compare} onChange={(e) => setDraft({ ...draft, compare: e.target.value as any })}>
                  {COMPARES.map((c) => <option key={c} value={c}>{L(`cmp_${c}` as RPKey)}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> {errors.length}</div>
            <ul className="mt-1 list-disc pl-4">
              {errors.map((e) => <li key={e}>{L(`v_${e}` as RPKey)}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className={btnBase} disabled={errors.length > 0}><FileText className="h-3.5 w-3.5" />{L("cb_generate")}</button>
          <button className={btnBase}><Copy className="h-3.5 w-3.5" />{L("cb_duplicate")}</button>
          <button className={btnBase}><Download className="h-3.5 w-3.5" />{L("rp_export")}</button>
          <button className={btnBase}><Trash2 className="h-3.5 w-3.5" />{L("cb_delete")}</button>
        </div>
      </Card>

      {saved.length > 0 && (
        <Card title={L("rp_saved")}>
          <ul className="space-y-1 text-sm">
            {saved.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-1.5">
                <span className="truncate">{r.name || `(untitled #${i + 1})`}</span>
                <span className="text-xs text-muted-foreground">
                  {r.metrics.length} metric · {r.dimensions.length} dim · {L(`dr_${r.range}` as RPKey)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts & Thresholds
// ---------------------------------------------------------------------------

function AlertsPanel({ L, alerts, setAlerts }: {
  L: Lloc; alerts: AlertRule[]; setAlerts: (a: AlertRule[]) => void;
}) {
  const [initial, setInitial] = useState<AlertRule[]>(alerts);
  const dirty = JSON.stringify(alerts) !== JSON.stringify(initial);

  return (
    <div className="space-y-6">
      <Card
        title={L("rp_tab_alerts")}
        action={
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">· {L("cb_unsaved")}</span>}
            <button className={btnBase} onClick={() => setAlerts(initial)}>{L("cb_discard")}</button>
            <button className={btnPrimary} onClick={() => setInitial(alerts)}>
              <Save className="h-3.5 w-3.5" />{L("cb_save")}
            </button>
          </div>
        }
      >
        <TableWrap>
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">Rule</th>
              <th className="p-2">{L("h_threshold")}</th>
              <th className="p-2">{L("h_severity")}</th>
              <th className="p-2">{L("h_channel")}</th>
              <th className="p-2">{L("h_enabled")}</th>
              <th className="p-2">{L("h_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => {
              const errs = validateAlert(a);
              return (
                <tr key={a.id} className="border-t border-border/60 text-sm">
                  <td className="p-2 font-medium">{L(`ak_${a.kind}` as RPKey)}</td>
                  <td className="p-2">
                    <input
                      type="number" min={0} className={`${inputCls} !w-24`}
                      value={a.threshold}
                      onChange={(e) => setAlerts(alerts.map((x) => x.id === a.id ? { ...x, threshold: Number(e.target.value) } : x))}
                    />
                    {errs.includes("negative_threshold") && (
                      <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{L("v_negative_threshold")}</div>
                    )}
                  </td>
                  <td className="p-2">
                    <select
                      className={`${inputCls} !w-auto`} value={a.severity}
                      onChange={(e) => setAlerts(alerts.map((x) => x.id === a.id ? { ...x, severity: e.target.value as any } : x))}
                    >
                      <option value="info">info</option>
                      <option value="warning">warning</option>
                      <option value="critical">critical</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className={`${inputCls} !w-auto`} value={a.channel}
                      onChange={(e) => setAlerts(alerts.map((x) => x.id === a.id ? { ...x, channel: e.target.value as any } : x))}
                    >
                      <option value="internal">{L("ch_internal")}</option>
                      <option value="email">{L("ch_email")}</option>
                      <option value="push">{L("ch_push")}</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <input type="checkbox" checked={a.enabled}
                      onChange={(e) => setAlerts(alerts.map((x) => x.id === a.id ? { ...x, enabled: e.target.checked } : x))}
                    />
                  </td>
                  <td className="p-2">
                    <button className={btnBase}><Bell className="h-3.5 w-3.5" />{L("al_test")}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function ModalShell({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
        <header className="flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3">
          <h3 className="font-[Fraunces] text-base font-semibold text-foreground">{title}</h3>
          <button className={btnBase} onClick={onClose}>Close</button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function ExportModal({ L, onClose }: { L: Lloc; onClose: () => void }) {
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [scope, setScope] = useState<"current" | "selected" | "full" | "summary">("current");
  return (
    <ModalShell title={L("rp_export")} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Format</label>
          <div className="mt-1 flex gap-2">
            {(["csv","xlsx","pdf"] as const).map((f) => (
              <button key={f}
                onClick={() => setFormat(f)}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${format === f ? "border-primary bg-primary/10 text-primary" : "border-border/60"}`}
              >
                {f === "csv" ? <FileText className="h-3.5 w-3.5" /> : f === "xlsx" ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />}
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Scope</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {[
              { k: "current", label: L("exp_current") },
              { k: "selected", label: L("exp_selected") },
              { k: "full", label: L("exp_full") },
              { k: "summary", label: L("exp_summary") },
            ].map((o) => (
              <button key={o.k}
                onClick={() => setScope(o.k as any)}
                className={`rounded-md border px-2 py-1.5 text-left text-xs ${scope === o.k ? "border-primary bg-primary/10 text-primary" : "border-border/60"}`}
              >{o.label}</button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{L("rp_demo_note")}</p>
        <div className="flex justify-end">
          <button className={btnPrimary} onClick={onClose}>{L("rp_export")}</button>
        </div>
      </div>
    </ModalShell>
  );
}

function ScheduleModal({ L, onClose }: { L: Lloc; onClose: () => void }) {
  const [freq, setFreq] = useState<"daily" | "weekly" | "monthly" | "quarterly">("weekly");
  const [delivery, setDelivery] = useState<"email" | "internal" | "download">("internal");
  return (
    <ModalShell title={L("rp_schedule")} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Frequency</label>
          <select className={inputCls} value={freq} onChange={(e) => setFreq(e.target.value as any)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Delivery</label>
          <select className={inputCls} value={delivery} onChange={(e) => setDelivery(e.target.value as any)}>
            <option value="internal">Internal Notification</option>
            <option value="email">Email (future)</option>
            <option value="download">Download (placeholder)</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">{L("rp_demo_note")}</p>
        <div className="flex justify-end">
          <button className={btnPrimary} onClick={onClose}>{L("cb_save")}</button>
        </div>
      </div>
    </ModalShell>
  );
}

function SavedReportsModal({ L, rows, onClose }: {
  L: Lloc; rows: typeof SAVED_REPORTS; onClose: () => void;
}) {
  return (
    <ModalShell title={L("rp_saved")} onClose={onClose}>
      <TableWrap>
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Owner</th>
            <th className="p-2">Range</th>
            <th className="p-2">Schedule</th>
            <th className="p-2">Last Generated</th>
            <th className="p-2">{L("h_status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60 text-sm">
              <td className="p-2 font-medium">{r.name}</td>
              <td className="p-2">{r.owner}</td>
              <td className="p-2">{L(`dr_${r.range}` as RPKey)}</td>
              <td className="p-2">{r.scheduled ?? "—"}</td>
              <td className="p-2 text-xs">{new Date(r.lastGeneratedAt).toLocaleString()}</td>
              <td className="p-2">
                <StatusPill tone={r.status === "ready" ? "success" : r.status === "pending" ? "warning" : "danger"}>{r.status}</StatusPill>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </ModalShell>
  );
}

function CompareModal({ L, value, onChange, onClose }: {
  L: Lloc; value: CompareKey; onChange: (v: CompareKey) => void; onClose: () => void;
}) {
  return (
    <ModalShell title={L("rp_compare")} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {COMPARES.map((c) => (
          <button key={c}
            onClick={() => { onChange(c); onClose(); }}
            className={`rounded-md border px-3 py-2 text-left text-sm ${value === c ? "border-primary bg-primary/10 text-primary" : "border-border/60"}`}
          >{L(`cmp_${c}` as RPKey)}</button>
        ))}
      </div>
    </ModalShell>
  );
}
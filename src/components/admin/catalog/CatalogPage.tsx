import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Plus, RefreshCw, Search, Eye, Pencil, Copy, Archive, Trash2, X, AlertTriangle,
  Image as ImageIcon, Music, Video, Sparkles, Layers, FileText, Film,
  Star, Award, Crown, Flame, Snowflake, Pin, RotateCcw, Upload, History,
  BarChart3, Filter, ChevronDown, Check,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import {
  DEMO_CATALOG, CATALOG_TYPES, CATALOG_CATEGORIES, CATALOG_STATUSES,
  CATALOG_GRADIENTS, DISPLAY_STATUS_TONE,
  duplicateCatalogItem, makeBlankCatalogItem, validateCatalog,
  translationStatus, emptyTranslation, deriveDisplayStatus, appendVersion,
  displayTitle, displayShort, displayLong,
  type CatalogItem, type CatalogCategory, type CatalogType, type CatalogStatus,
  type CatalogValidation, type CatalogTranslation, type DisplayStatus,
  type TranslationStatus, type CatalogFlags,
  AUTHOR_TYPES, PERFORMANCE_STATUSES, derivePerformance, formatCompact,
  defaultAuthor, missingMediaWarning,
  type AuthorType, type PerformanceStatus, type CatalogAuthor,
} from "@/lib/admin/catalog";
import { useLocalCatalog, type LocalCatalog } from "./i18n";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-200";

type SortKey =
  | "title" | "created" | "credits"
  | "views" | "uses" | "favorites"
  | "most_viewed" | "least_viewed" | "most_purchased" | "least_purchased";
type TransFilter = "any" | "complete" | "incomplete" | "missing_primary";
type PeriodFilter = "any" | "upcoming" | "live" | "past";
type ActiveFilter = "any" | "active" | "archived";
type MediaFilter =
  | "any" | "has_thumb" | "missing_thumb" | "has_views"
  | "never_viewed" | "has_purchases" | "never_purchased"
  | "published_missing_media";

const PERF_TONE: Record<PerformanceStatus, string> = {
  new: "bg-sky-500/15 text-sky-700 dark:text-sky-200 border-sky-500/30",
  growing: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 border-indigo-500/30",
  popular: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30",
  top: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  low_activity: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-200 border-zinc-500/30",
};

function PerformancePill({ item, L }: { item: CatalogItem; L: LocalCatalog }) {
  const p = derivePerformance(item.stats);
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${PERF_TONE[p]}`}>
      {L("perf_" + p)}
    </span>
  );
}

function formatDate(iso: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateTime(iso: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function typeIcon(t: CatalogType) {
  switch (t) {
    case "card": return <ImageIcon className="h-4 w-4" />;
    case "animated": return <Sparkles className="h-4 w-4" />;
    case "song": return <Music className="h-4 w-4" />;
    case "video-clip": return <Video className="h-4 w-4" />;
    case "cartoon": return <Film className="h-4 w-4" />;
    case "premium": return <Crown className="h-4 w-4" />;
    case "template": return <Layers className="h-4 w-4" />;
  }
}

/** Content-type preview placeholder that varies by type. */
function TypedPreview({ it, size = "sm", L }: { it: CatalogItem; size?: "sm" | "md" | "lg"; L: LocalCatalog }) {
  const dim = size === "lg" ? "h-32 w-32" : size === "md" ? "h-20 w-20" : "h-10 w-10";
  const iconSize = size === "lg" ? "h-8 w-8" : size === "md" ? "h-6 w-6" : "h-4 w-4";
  const gradient = CATALOG_GRADIENTS[it.gradientIndex % CATALOG_GRADIENTS.length];

  const overlay: Record<CatalogType, { icon: ReactNode; label?: string; ring?: string }> = {
    card: { icon: <ImageIcon className={iconSize} />, label: L("pv_card") },
    animated: { icon: <Sparkles className={iconSize} />, label: L("pv_animated"), ring: "ring-2 ring-fuchsia-400/60 ring-offset-2 ring-offset-transparent" },
    song: { icon: <Music className={iconSize} />, label: L("pv_audio") },
    "video-clip": { icon: <Video className={iconSize} />, label: L("pv_video") },
    cartoon: { icon: <Film className={iconSize} />, label: L("pv_cartoon") },
    premium: { icon: <Crown className={iconSize} />, label: L("pv_premium"), ring: "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-transparent" },
    template: { icon: <Layers className={iconSize} />, label: L("pv_template") },
  };
  const o = overlay[it.type];
  return (
    <div
      className={`${dim} relative shrink-0 overflow-hidden rounded-md border border-border/60 ${o.ring ?? ""}`}
      style={{ backgroundImage: gradient }}
      aria-label={o.label}
      title={o.label}
    >
      <div className="absolute inset-0 flex items-center justify-center text-white/95 drop-shadow-sm">
        {o.icon}
      </div>
      {size !== "sm" && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/90">
          {o.label}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, L }: { status: DisplayStatus; L: LocalCatalog }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${DISPLAY_STATUS_TONE[status]}`}>
      {L("status_" + status)}
    </span>
  );
}

const FLAG_META: { key: keyof CatalogFlags; icon: ReactNode; tKey: string; tone: string }[] = [
  { key: "featured", icon: <Star className="h-3 w-3" />, tKey: "flag_featured", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30" },
  { key: "recommended", icon: <Award className="h-3 w-3" />, tKey: "flag_recommended", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-200 border-sky-500/30" },
  { key: "premium", icon: <Crown className="h-3 w-3" />, tKey: "flag_premium", tone: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-200 border-fuchsia-500/30" },
  { key: "newBadge", icon: <Sparkles className="h-3 w-3" />, tKey: "flag_new", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30" },
  { key: "popular", icon: <Flame className="h-3 w-3" />, tKey: "flag_popular", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-200 border-rose-500/30" },
  { key: "seasonal", icon: <Snowflake className="h-3 w-3" />, tKey: "flag_seasonal", tone: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 border-cyan-500/30" },
  { key: "pinToTop", icon: <Pin className="h-3 w-3" />, tKey: "flag_pin", tone: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30" },
];

function FlagBadges({ flags, L, max = 3 }: { flags: CatalogFlags; L: LocalCatalog; max?: number }) {
  const on = FLAG_META.filter((f) => flags[f.key]);
  const shown = on.slice(0, max);
  const rest = on.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((f) => (
        <span key={f.key} className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${f.tone}`}>
          {f.icon}{L(f.tKey)}
        </span>
      ))}
      {rest > 0 && <span className="text-[9px] text-muted-foreground">+{rest}</span>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export function CatalogPage() {
  const { lang } = useI18n();
  const L = useLocalCatalog(lang);

  const [items, setItems] = useState<CatalogItem[]>(() => [...DEMO_CATALOG]);
  const [tick, setTick] = useState(0);

  // Filters
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CatalogCategory>("all");
  const [langFilter, setLangFilter] = useState<"all" | Lang>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | DisplayStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CatalogType>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [flagFeatured, setFlagFeatured] = useState(false);
  const [flagRecommended, setFlagRecommended] = useState(false);
  const [flagPremium, setFlagPremium] = useState(false);
  const [transFilter, setTransFilter] = useState<TransFilter>("any");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("any");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("any");
  const [creditsMin, setCreditsMin] = useState<string>("");
  const [creditsMax, setCreditsMax] = useState<string>("");
  const [authorFilter, setAuthorFilter] = useState<"all" | AuthorType>("all");
  const [perfFilter, setPerfFilter] = useState<"all" | PerformanceStatus>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("any");

  // Modals
  const [viewing, setViewing] = useState<CatalogItem | null>(null);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [previewing, setPreviewing] = useState<CatalogItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatalogItem | null>(null);
  const [pinConfirm, setPinConfirm] = useState<{ next: CatalogItem; existing: CatalogItem } | null>(null);

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<null | (() => void)>(null);

  const resetFilters = () => {
    setQuery(""); setCategoryFilter("all"); setLangFilter("all"); setStatusFilter("all");
    setTypeFilter("all"); setFlagFeatured(false); setFlagRecommended(false); setFlagPremium(false);
    setTransFilter("any"); setPeriodFilter("any"); setActiveFilter("any");
    setCreditsMin(""); setCreditsMax("");
    setAuthorFilter("all"); setPerfFilter("all"); setMediaFilter("any");
  };

  const filtered = useMemo(() => {
    void tick;
    const q = query.trim().toLowerCase();
    let list = items.filter((it) => {
      const ds = deriveDisplayStatus(it);
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (typeFilter !== "all" && it.type !== typeFilter) return false;
      if (langFilter !== "all") {
        const hasLang = !!it.translations[langFilter];
        if (!hasLang) return false;
      }
      if (statusFilter !== "all" && ds !== statusFilter) return false;
      if (flagFeatured && !it.flags.featured) return false;
      if (flagRecommended && !it.flags.recommended) return false;
      if (flagPremium && !it.flags.premium) return false;
      if (transFilter !== "any") {
        const primary = translationStatus(it.translations[it.primaryLanguage]);
        if (transFilter === "complete" && primary !== "complete") return false;
        if (transFilter === "incomplete" && primary !== "incomplete") return false;
        if (transFilter === "missing_primary" && primary === "complete") return false;
      }
      if (activeFilter === "active" && it.status === "archived") return false;
      if (activeFilter === "archived" && it.status !== "archived") return false;
      if (periodFilter !== "any") {
        if (periodFilter === "upcoming" && ds !== "scheduled") return false;
        if (periodFilter === "live" && ds !== "published") return false;
        if (periodFilter === "past" && ds !== "expired") return false;
      }
      const cMin = creditsMin === "" ? -Infinity : Number(creditsMin);
      const cMax = creditsMax === "" ? Infinity : Number(creditsMax);
      if (it.credits < cMin || it.credits > cMax) return false;
      if (authorFilter !== "all" && (it.author?.type ?? "project_joy") !== authorFilter) return false;
      if (perfFilter !== "all" && derivePerformance(it.stats) !== perfFilter) return false;
      if (mediaFilter !== "any") {
        const hasThumb = !!(it.media.thumbnail || it.media.thumbnailUrl || it.media.mainPreview);
        if (mediaFilter === "has_thumb" && !hasThumb) return false;
        if (mediaFilter === "missing_thumb" && hasThumb) return false;
        if (mediaFilter === "has_views" && !(it.stats.views > 0)) return false;
        if (mediaFilter === "never_viewed" && it.stats.views > 0) return false;
        if (mediaFilter === "has_purchases" && !((it.stats.purchases ?? it.stats.uses) > 0)) return false;
        if (mediaFilter === "never_purchased" && (it.stats.purchases ?? it.stats.uses) > 0) return false;
        if (mediaFilter === "published_missing_media") {
          if (deriveDisplayStatus(it) !== "published" || !missingMediaWarning(it)) return false;
        }
      }
      if (q) {
        const parts = [it.id, it.internalName, L("cat_" + it.category)];
        parts.push(it.author?.displayName ?? "", it.author?.internalOwner ?? "");
        for (const l of LANGS) {
          const tr = it.translations[l.code];
          if (tr) parts.push(tr.title, tr.shortDescription, tr.tags.join(" "), tr.searchKeywords.join(" "));
        }
        const hay = parts.join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      // Pinned first within same category filter for user affordance.
      if (a.flags.pinToTop && !b.flags.pinToTop) return -1;
      if (!a.flags.pinToTop && b.flags.pinToTop) return 1;
      switch (sortKey) {
        case "title": return displayTitle(a, lang).localeCompare(displayTitle(b, lang));
        case "created": return b.createdAt.localeCompare(a.createdAt);
        case "credits": return b.credits - a.credits;
        case "views": return b.stats.views - a.stats.views;
        case "uses": return b.stats.uses - a.stats.uses;
        case "favorites": return b.stats.favorites - a.stats.favorites;
        case "most_viewed": return b.stats.views - a.stats.views;
        case "least_viewed": return a.stats.views - b.stats.views;
        case "most_purchased": return (b.stats.purchases ?? b.stats.uses) - (a.stats.purchases ?? a.stats.uses);
        case "least_purchased": return (a.stats.purchases ?? a.stats.uses) - (b.stats.purchases ?? b.stats.uses);
        default: return 0;
      }
    });
    return list;
  }, [items, query, categoryFilter, langFilter, statusFilter, typeFilter, flagFeatured, flagRecommended, flagPremium, transFilter, activeFilter, periodFilter, creditsMin, creditsMax, authorFilter, perfFilter, mediaFilter, sortKey, tick, L, lang]);

  const upsert = (it: CatalogItem) =>
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === it.id);
      if (idx === -1) return [it, ...prev];
      const next = [...prev];
      next[idx] = it;
      return next;
    });

  const attemptSave = (next: CatalogItem) => {
    // Enforce single-pinned per category
    if (next.flags.pinToTop) {
      const existing = items.find((x) => x.id !== next.id && x.category === next.category && x.flags.pinToTop);
      if (existing) {
        setPinConfirm({ next, existing });
        return;
      }
    }
    upsert(next);
    setEditing(null);
  };

  const confirmPinReplace = () => {
    if (!pinConfirm) return;
    const { next, existing } = pinConfirm;
    setItems((prev) => prev.map((x) => {
      if (x.id === existing.id) return { ...x, flags: { ...x.flags, pinToTop: false } };
      if (x.id === next.id) return next;
      return x;
    }).concat(items.some((x) => x.id === next.id) ? [] : [next]));
    setPinConfirm(null);
    setEditing(null);
  };

  const doDuplicate = (it: CatalogItem) => setItems((prev) => [duplicateCatalogItem(it), ...prev]);
  const doArchive = (it: CatalogItem) =>
    setItems((prev) => prev.map((x) => (x.id === it.id ? appendVersion({ ...x, status: "archived" }, ["status:archived"]) : x)));
  const doRestore = (it: CatalogItem) =>
    setItems((prev) => prev.map((x) => (x.id === it.id ? appendVersion({ ...x, status: "draft" }, ["status:restored"]) : x)));
  const doDelete = (it: CatalogItem) => {
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    setConfirmDelete(null);
  };

  // Bulk actions
  const selectedItems = items.filter((x) => selected.has(x.id));
  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const toggleSelectAll = () => {
    if (filtered.every((x) => selected.has(x.id)) && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((x) => x.id)));
    }
  };
  const bulk = (fn: (it: CatalogItem) => CatalogItem, destructive = false) => {
    const apply = () => {
      setItems((prev) => prev.map((x) => (selected.has(x.id) ? fn(x) : x)));
      setSelected(new Set());
      setBulkConfirm(null);
    };
    if (destructive) setBulkConfirm(() => apply); else apply();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl">{L("title")}</h1>
          <p className="text-sm text-muted-foreground">{L("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnBase} onClick={() => setTick((n) => n + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> {L("refresh")}
          </button>
          <button className={btnPrimary} onClick={() => setEditing(makeBlankCatalogItem())}>
            <Plus className="h-3.5 w-3.5" /> {L("add_content")}
          </button>
        </div>
      </header>

      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-100">
        {L("demo_notice")}
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input type="search" className={`${inputCls} pl-8`} placeholder={L("search_placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={inputCls} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as "all" | CatalogCategory)}>
          <option value="all">{L("filter_category")}: {L("filter_all")}</option>
          {CATALOG_CATEGORIES.map((c) => <option key={c} value={c}>{L("cat_" + c)}</option>)}
        </select>
        <select className={inputCls} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | CatalogType)}>
          <option value="all">{L("filter_type")}: {L("filter_all")}</option>
          {CATALOG_TYPES.map((t) => <option key={t} value={t}>{L("type_" + t)}</option>)}
        </select>
        <select className={inputCls} value={langFilter} onChange={(e) => setLangFilter(e.target.value as "all" | Lang)}>
          <option value="all">{L("filter_language")}: {L("filter_all")}</option>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | DisplayStatus)}>
          <option value="all">{L("filter_status")}: {L("filter_all")}</option>
          {(["draft","published","scheduled","expired","hidden","archived"] as DisplayStatus[]).map((s) => (
            <option key={s} value={s}>{L("status_" + s)}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <button className={btnBase} onClick={() => setShowAdvancedFilters((v) => !v)}>
          <Filter className="h-3.5 w-3.5" /> <ChevronDown className={`h-3 w-3 transition ${showAdvancedFilters ? "rotate-180" : ""}`} />
        </button>
        <span>{L("sort_by")}:</span>
        <select className={`${inputCls} max-w-[220px]`} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="created">{L("sort_created")}</option>
          <option value="title">{L("sort_title")}</option>
          <option value="credits">{L("sort_credits")}</option>
          <option value="most_viewed">{L("sort_most_viewed")}</option>
          <option value="least_viewed">{L("sort_least_viewed")}</option>
          <option value="most_purchased">{L("sort_most_purchased")}</option>
          <option value="least_purchased">{L("sort_least_purchased")}</option>
          <option value="favorites">{L("sort_favorites")}</option>
        </select>
        <button className={btnBase} onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" />{L("filter_reset")}</button>
        <span className="ml-auto">{filtered.length}</span>
      </div>

      {showAdvancedFilters && (
        <div className="grid gap-2 rounded-lg border border-border/60 bg-card/50 p-3 md:grid-cols-3 lg:grid-cols-6">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={flagFeatured} onChange={(e) => setFlagFeatured(e.target.checked)} /> {L("filter_featured")}
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={flagRecommended} onChange={(e) => setFlagRecommended(e.target.checked)} /> {L("filter_recommended")}
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={flagPremium} onChange={(e) => setFlagPremium(e.target.checked)} /> {L("filter_premium")}
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">{L("filter_translation")}</span>
            <select className={inputCls} value={transFilter} onChange={(e) => setTransFilter(e.target.value as TransFilter)}>
              <option value="any">{L("filter_all")}</option>
              <option value="complete">{L("tr_status_complete")}</option>
              <option value="incomplete">{L("tr_status_incomplete")}</option>
              <option value="missing_primary">{L("tr_status_missing")}</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">{L("filter_publication_period")}</span>
            <select className={inputCls} value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}>
              <option value="any">{L("filter_all")}</option>
              <option value="upcoming">{L("filter_period_upcoming")}</option>
              <option value="live">{L("filter_period_live")}</option>
              <option value="past">{L("filter_period_past")}</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">{L("filter_active")}</span>
            <select className={inputCls} value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}>
              <option value="any">{L("filter_all")}</option>
              <option value="active">{L("filter_active")}</option>
              <option value="archived">{L("filter_archived_only")}</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">{L("filter_credits_min")}</span>
            <input type="number" min={0} className={inputCls} value={creditsMin} onChange={(e) => setCreditsMin(e.target.value)} />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">{L("filter_credits_max")}</span>
            <input type="number" min={0} className={inputCls} value={creditsMax} onChange={(e) => setCreditsMax(e.target.value)} />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">{L("filter_author_type")}</span>
            <select className={inputCls} value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value as "all" | AuthorType)}>
              <option value="all">{L("filter_all")}</option>
              {AUTHOR_TYPES.map((a) => <option key={a} value={a}>{L("author_" + a)}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">{L("filter_performance")}</span>
            <select className={inputCls} value={perfFilter} onChange={(e) => setPerfFilter(e.target.value as "all" | PerformanceStatus)}>
              <option value="all">{L("filter_all")}</option>
              {PERFORMANCE_STATUSES.map((p) => <option key={p} value={p}>{L("perf_" + p)}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">{L("col_performance")} / {L("col_preview")}</span>
            <select className={inputCls} value={mediaFilter} onChange={(e) => setMediaFilter(e.target.value as MediaFilter)}>
              <option value="any">{L("filter_all")}</option>
              <option value="has_thumb">{L("filter_has_thumbnail")}</option>
              <option value="missing_thumb">{L("filter_missing_thumbnail")}</option>
              <option value="has_views">{L("filter_has_views")}</option>
              <option value="never_viewed">{L("filter_never_viewed")}</option>
              <option value="has_purchases">{L("filter_has_purchases")}</option>
              <option value="never_purchased">{L("filter_never_purchased")}</option>
              <option value="published_missing_media">{L("filter_published_missing_media")}</option>
            </select>
          </label>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
          <span className="font-medium">{L("bulk_selected")}: {selected.size}</span>
          <div className="mx-2 hidden h-4 border-l border-border/60 sm:block" />
          <button className={btnBase} onClick={() => bulk((x) => ({ ...x, status: "published" }))}>
            {L("bulk_publish")}
          </button>
          <button className={btnBase} onClick={() => bulk((x) => ({ ...x, status: "hidden" }))}>
            {L("bulk_hide")}
          </button>
          <button className={btnBase} onClick={() => bulk((x) => ({ ...x, status: "archived" }), true)}>
            <Archive className="h-3.5 w-3.5" />{L("bulk_archive")}
          </button>
          <button className={btnBase} onClick={() => bulk((x) => (x.status === "archived" ? { ...x, status: "draft" } : x))}>
            <RotateCcw className="h-3.5 w-3.5" />{L("bulk_restore")}
          </button>
          <BulkCategoryPicker L={L} onPick={(cat) => bulk((x) => ({ ...x, category: cat }))} />
          <BulkStatusPicker L={L} onPick={(s) => bulk((x) => ({ ...x, status: s }), s === "archived")} />
          <BulkTagInput L={L} label={L("bulk_add_tag")} onApply={(tag) => bulk((x) => addTagToItem(x, tag))} />
          <BulkTagInput L={L} label={L("bulk_remove_tag")} onApply={(tag) => bulk((x) => removeTagFromItem(x, tag))} />
          <button className={btnBase + " ml-auto"} onClick={() => setSelected(new Set())}>
            <X className="h-3.5 w-3.5" />{L("bulk_clear")}
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-border/60 lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-8 px-3 py-2">
                <input type="checkbox" checked={filtered.length > 0 && filtered.every((x) => selected.has(x.id))} onChange={toggleSelectAll} />
              </th>
              <th className="px-3 py-2 text-left">{L("col_id")}</th>
              <th className="px-3 py-2 text-left">{L("col_preview")}</th>
              <th className="px-3 py-2 text-left">{L("col_title")}</th>
              <th className="px-3 py-2 text-left">{L("col_category")}</th>
              <th className="px-3 py-2 text-left">{L("col_type")}</th>
              <th className="px-3 py-2 text-left">{L("col_status")}</th>
              <th className="px-3 py-2 text-right">{L("col_credits")}</th>
              <th className="px-3 py-2 text-left">{L("col_created")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">{L("empty_list")}</td></tr>
            ) : filtered.map((it) => (
              <tr key={it.id} className={`hover:bg-muted/30 ${selected.has(it.id) ? "bg-primary/5" : ""}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{it.id}</td>
                <td className="px-3 py-2"><TypedPreview it={it} L={L} /></td>
                <td className="px-3 py-2">
                  <div className="font-medium">{displayTitle(it, lang) || <span className="text-muted-foreground italic">—</span>}</div>
                  <div className="mt-0.5"><FlagBadges flags={it.flags} L={L} /></div>
                </td>
                <td className="px-3 py-2">{L("cat_" + it.category)}</td>
                <td className="px-3 py-2"><span className="inline-flex items-center gap-1">{typeIcon(it.type)}{L("type_" + it.type)}</span></td>
                <td className="px-3 py-2"><StatusPill status={deriveDisplayStatus(it)} L={L} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{it.credits}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(it.createdAt, lang)}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button className={btnBase} title={L("act_view")} onClick={() => setViewing(it)}><Eye className="h-3.5 w-3.5" /></button>
                    <button className={btnBase} title={L("act_preview_customer")} onClick={() => setPreviewing(it)}><Sparkles className="h-3.5 w-3.5" /></button>
                    <button className={btnBase} title={L("act_edit")} onClick={() => setEditing(it)}><Pencil className="h-3.5 w-3.5" /></button>
                    <button className={btnBase} title={L("act_duplicate")} onClick={() => doDuplicate(it)}><Copy className="h-3.5 w-3.5" /></button>
                    {it.status === "archived" ? (
                      <button className={btnBase} title={L("act_restore")} onClick={() => doRestore(it)}><RotateCcw className="h-3.5 w-3.5" /></button>
                    ) : (
                      <button className={btnBase} title={L("act_archive")} onClick={() => doArchive(it)}><Archive className="h-3.5 w-3.5" /></button>
                    )}
                    <button className={btnDanger} title={L("act_delete")} onClick={() => setConfirmDelete(it)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <div className="grid gap-3 lg:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-6 text-center text-sm text-muted-foreground">{L("empty_list")}</div>
        ) : filtered.map((it) => (
          <article key={it.id} className={`rounded-lg border p-3 ${selected.has(it.id) ? "border-primary/60 bg-primary/5" : "border-border/60 bg-card/60"}`}>
            <div className="flex gap-3">
              <label className="flex items-start">
                <input type="checkbox" className="mt-1" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} />
              </label>
              <TypedPreview it={it} L={L} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium">{displayTitle(it, lang) || "—"}</div>
                  <StatusPill status={deriveDisplayStatus(it)} L={L} />
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{it.id}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {L("cat_" + it.category)} · {L("type_" + it.type)}
                </div>
                <div className="mt-1 text-xs">{L("col_credits")}: <b>{it.credits}</b> · {formatDate(it.createdAt, lang)}</div>
                <div className="mt-1"><FlagBadges flags={it.flags} L={L} /></div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-1">
              <button className={btnBase} onClick={() => setViewing(it)}><Eye className="h-3.5 w-3.5" />{L("act_view")}</button>
              <button className={btnBase} onClick={() => setPreviewing(it)}><Sparkles className="h-3.5 w-3.5" />{L("act_preview_customer")}</button>
              <button className={btnBase} onClick={() => setEditing(it)}><Pencil className="h-3.5 w-3.5" />{L("act_edit")}</button>
              <button className={btnBase} onClick={() => doDuplicate(it)}><Copy className="h-3.5 w-3.5" />{L("act_duplicate")}</button>
              {it.status === "archived" ? (
                <button className={btnBase} onClick={() => doRestore(it)}><RotateCcw className="h-3.5 w-3.5" />{L("act_restore")}</button>
              ) : (
                <button className={btnBase} onClick={() => doArchive(it)}><Archive className="h-3.5 w-3.5" />{L("act_archive")}</button>
              )}
              <button className={btnDanger} onClick={() => setConfirmDelete(it)}><Trash2 className="h-3.5 w-3.5" />{L("act_delete")}</button>
            </div>
          </article>
        ))}
      </div>

      {viewing && (
        <ViewModal item={viewing} L={L} lang={lang} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} onPreview={() => { setPreviewing(viewing); setViewing(null); }} />
      )}
      {editing && (
        <EditModal
          item={editing}
          isNew={!items.some((x) => x.id === editing.id)}
          L={L}
          lang={lang}
          onClose={() => setEditing(null)}
          onSave={attemptSave}
        />
      )}
      {previewing && (
        <CustomerPreviewModal item={previewing} L={L} initialLang={lang} onClose={() => setPreviewing(null)} />
      )}
      {confirmDelete && (
        <ConfirmDelete item={confirmDelete} L={L} lang={lang} onCancel={() => setConfirmDelete(null)} onConfirm={() => doDelete(confirmDelete)} />
      )}
      {pinConfirm && (
        <Modal title={L("pin_replace_title")} onClose={() => setPinConfirm(null)}>
          <p className="text-sm">{L("pin_replace_body")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-mono">{pinConfirm.existing.id}</span> · {displayTitle(pinConfirm.existing, lang)}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnBase} onClick={() => setPinConfirm(null)}>{L("act_cancel")}</button>
            <button className={btnPrimary} onClick={confirmPinReplace}>{L("act_save")}</button>
          </div>
        </Modal>
      )}
      {bulkConfirm && (
        <Modal title={L("bulk_confirm_title")} onClose={() => setBulkConfirm(null)}>
          <p className="text-sm">{L("bulk_confirm_body")}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnBase} onClick={() => setBulkConfirm(null)}>{L("act_cancel")}</button>
            <button className={btnPrimary} onClick={() => bulkConfirm()}>{L("act_save")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helper tag operations
// -----------------------------------------------------------------------------
function addTagToItem(x: CatalogItem, tag: string): CatalogItem {
  const translations = { ...x.translations };
  for (const l of Object.keys(translations) as Lang[]) {
    const t = translations[l]!;
    if (!t.tags.includes(tag)) translations[l] = { ...t, tags: [...t.tags, tag] };
  }
  return { ...x, translations };
}
function removeTagFromItem(x: CatalogItem, tag: string): CatalogItem {
  const translations = { ...x.translations };
  for (const l of Object.keys(translations) as Lang[]) {
    const t = translations[l]!;
    translations[l] = { ...t, tags: t.tags.filter((y) => y !== tag) };
  }
  return { ...x, translations };
}

// -----------------------------------------------------------------------------
// Bulk widgets
// -----------------------------------------------------------------------------
function BulkCategoryPicker({ L, onPick }: { L: LocalCatalog; onPick: (c: CatalogCategory) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className={btnBase} onClick={() => setOpen((v) => !v)}>{L("bulk_change_category")}<ChevronDown className="h-3 w-3" /></button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-56 overflow-auto rounded-md border border-border/60 bg-popover p-1 shadow-lg">
          {CATALOG_CATEGORIES.map((c) => (
            <button key={c} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted/60" onClick={() => { onPick(c); setOpen(false); }}>
              {L("cat_" + c)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function BulkStatusPicker({ L, onPick }: { L: LocalCatalog; onPick: (s: CatalogStatus) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className={btnBase} onClick={() => setOpen((v) => !v)}>{L("bulk_change_status")}<ChevronDown className="h-3 w-3" /></button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-md border border-border/60 bg-popover p-1 shadow-lg">
          {CATALOG_STATUSES.map((s) => (
            <button key={s} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted/60" onClick={() => { onPick(s); setOpen(false); }}>
              {L("status_" + s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function BulkTagInput({ L, label, onApply }: { L: LocalCatalog; label: string; onApply: (tag: string) => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  return (
    <div className="relative">
      <button className={btnBase} onClick={() => setOpen((v) => !v)}>{label}<ChevronDown className="h-3 w-3" /></button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border border-border/60 bg-popover p-2 shadow-lg">
          <input className={inputCls} placeholder="tag" value={val} onChange={(e) => setVal(e.target.value)} />
          <div className="mt-2 flex justify-end gap-1">
            <button className={btnBase} onClick={() => setOpen(false)}>{L("act_cancel")}</button>
            <button className={btnPrimary} disabled={!val.trim()} onClick={() => { onApply(val.trim()); setOpen(false); setVal(""); }}>{L("act_save")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared UI
// -----------------------------------------------------------------------------
function Modal({ children, onClose, title, wide }: { children: ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} rounded-xl border border-border/60 bg-card p-5 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">{title}</h2>
          <button className={btnBase} onClick={onClose}><X className="h-3.5 w-3.5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] break-words text-right">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// View modal (details)
// -----------------------------------------------------------------------------
function ViewModal({ item, L, lang, onClose, onEdit, onPreview }: {
  item: CatalogItem; L: LocalCatalog; lang: Lang; onClose: () => void; onEdit: () => void; onPreview: () => void;
}) {
  const ds = deriveDisplayStatus(item);
  return (
    <Modal title={L("view_title")} onClose={onClose} wide>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <TypedPreview it={item} L={L} size="lg" />
          <FlagBadges flags={item.flags} L={L} max={6} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Section title={L("sec_basic")}>
            <Field label={L("col_id")} value={item.id} />
            <Field label={L("f_title")} value={displayTitle(item, lang)} />
            <Field label={L("f_internal_name")} value={item.internalName} />
            <Field label={L("f_category")} value={L("cat_" + item.category)} />
            <Field label={L("f_type")} value={L("type_" + item.type)} />
            <Field label={L("f_language")} value={item.primaryLanguage.toUpperCase()} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{L("f_status")}</span>
              <StatusPill status={ds} L={L} />
            </div>
            <Field label={L("f_credits")} value={String(item.credits)} />
            <Field label={L("col_created")} value={formatDate(item.createdAt, lang)} />
          </Section>
          <Section title={L("f_description")}>
            <p className="text-sm">{displayShort(item, lang) || "—"}</p>
            <div className="pt-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{L("f_tags")}</div>
              <div className="flex flex-wrap gap-1">
                {(item.translations[lang]?.tags ?? item.translations[item.primaryLanguage]?.tags ?? []).map((t) =>
                  <span key={t} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px]">{t}</span>
                )}
              </div>
            </div>
            <div className="pt-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{L("f_internal_notes")}</div>
              <p className="text-xs text-muted-foreground">{item.internalNotes || "—"}</p>
            </div>
          </Section>
          <Section title={L("sec_translations")}>
            <div className="grid gap-1">
              {LANGS.map((l) => {
                const s = translationStatus(item.translations[l.code]);
                return (
                  <div key={l.code} className="flex items-center justify-between text-xs">
                    <span>{l.label} {l.code === item.primaryLanguage && <span className="ml-1 text-[9px] uppercase text-muted-foreground">({L("tr_primary")})</span>}</span>
                    <TranslationBadge status={s} L={L} />
                  </div>
                );
              })}
            </div>
          </Section>
          <Section title={L("sec_stats")}>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <StatRow label={L("st_views")} value={item.stats.views} />
              <StatRow label={L("st_opens")} value={item.stats.opens} />
              <StatRow label={L("st_uses")} value={item.stats.uses} />
              <StatRow label={L("st_favorites")} value={item.stats.favorites} />
              <StatRow label={L("st_shares")} value={item.stats.shares} />
              <StatRow label={L("st_conversion")} value={`${item.stats.conversion}%`} />
            </div>
            <div className="pt-1 text-[10px] text-muted-foreground">{L("st_last_used")}: {formatDate(item.stats.lastUsed, lang)}</div>
            <div className="pt-1 text-[10px] italic text-muted-foreground">{L("st_demo_note")}</div>
          </Section>
          <Section title={L("sec_versions")}>
            {item.versions.length === 0 ? (
              <div className="text-xs text-muted-foreground">{L("ver_none")}</div>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-auto text-xs">
                {item.versions.map((v) => (
                  <li key={v.version} className="rounded border border-border/60 bg-muted/30 px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{v.version} · {L("status_" + v.status)}</span>
                      <span className="text-muted-foreground">{formatDateTime(v.date, lang)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{v.admin}</div>
                    <div className="text-[10px] text-muted-foreground">{v.changedFields.join(", ")}</div>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-1 text-[10px] italic text-muted-foreground">{L("ver_demo_note")}</div>
          </Section>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnBase} onClick={onClose}>{L("act_close")}</button>
        <button type="button" className={btnBase} onClick={onPreview}><Sparkles className="h-3.5 w-3.5" />{L("act_preview_customer")}</button>
        <button type="button" className={btnPrimary} onClick={onEdit}><Pencil className="h-3.5 w-3.5" />{L("act_edit")}</button>
      </div>
    </Modal>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded border border-border/60 bg-muted/30 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function TranslationBadge({ status, L }: { status: TranslationStatus; L: LocalCatalog }) {
  const tone: Record<TranslationStatus, string> = {
    complete: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30",
    incomplete: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30",
    missing: "bg-rose-500/15 text-rose-700 dark:text-rose-200 border-rose-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${tone[status]}`}>
      {L("tr_status_" + status)}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Edit modal — tabbed
// -----------------------------------------------------------------------------
type EditTab = "basic" | "media" | "presentation" | "publication" | "translations" | "versions" | "statistics";

function EditModal({ item, isNew, L, lang, onClose, onSave }: {
  item: CatalogItem; isNew: boolean; L: LocalCatalog; lang: Lang; onClose: () => void; onSave: (next: CatalogItem) => void;
}) {
  const [draft, setDraft] = useState<CatalogItem>(() => JSON.parse(JSON.stringify(item)) as CatalogItem);
  const [errors, setErrors] = useState<CatalogValidation>({});
  const [tab, setTab] = useState<EditTab>("basic");
  const [activeLang, setActiveLang] = useState<Lang>(item.primaryLanguage);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const initialJson = useMemo(() => JSON.stringify(item), [item]);
  const dirty = JSON.stringify(draft) !== initialJson;

  // Warn on browser tab close.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const update = <K extends keyof CatalogItem>(k: K, v: CatalogItem[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const updateFlag = (k: keyof CatalogFlags, v: boolean) => setDraft((d) => ({ ...d, flags: { ...d.flags, [k]: v } }));
  const updateTranslation = (l: Lang, patch: Partial<CatalogTranslation>) => {
    setDraft((d) => {
      const cur = d.translations[l] ?? emptyTranslation();
      return { ...d, translations: { ...d.translations, [l]: { ...cur, ...patch } } };
    });
  };
  const removeTranslation = (l: Lang) => {
    if (l === draft.primaryLanguage) return;
    setDraft((d) => {
      const next = { ...d.translations };
      delete next[l];
      return { ...d, translations: next };
    });
  };

  const handleClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const submit = () => {
    // Trim inputs
    const clean: CatalogItem = { ...draft };
    // Compute changed fields (shallow diff)
    const changed: string[] = [];
    for (const k of Object.keys(item) as (keyof CatalogItem)[]) {
      const a = JSON.stringify(item[k]);
      const b = JSON.stringify(clean[k]);
      if (a !== b) changed.push(String(k));
    }
    const withVersion = isNew ? clean : appendVersion(clean, changed.length ? changed : ["edited"]);
    const e = validateCatalog(withVersion, L);
    setErrors(e);
    if (Object.keys(e).length === 0) onSave(withVersion);
  };

  const t = draft.translations[activeLang] ?? emptyTranslation();

  const tabs: { key: EditTab; label: string; icon: ReactNode }[] = [
    { key: "basic", label: L("sec_basic"), icon: <FileText className="h-3.5 w-3.5" /> },
    { key: "media", label: L("sec_media"), icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { key: "presentation", label: L("sec_presentation"), icon: <Sparkles className="h-3.5 w-3.5" /> },
    { key: "publication", label: L("sec_publication"), icon: <Layers className="h-3.5 w-3.5" /> },
    { key: "translations", label: L("sec_translations"), icon: <Filter className="h-3.5 w-3.5" /> },
    { key: "versions", label: L("sec_versions"), icon: <History className="h-3.5 w-3.5" /> },
    { key: "statistics", label: L("sec_stats"), icon: <BarChart3 className="h-3.5 w-3.5" /> },
  ];

  return (
    <Modal title={isNew ? L("new_title") : L("edit_title")} onClose={handleClose} wide>
      {dirty && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-800 dark:text-amber-100">
          <AlertTriangle className="h-3.5 w-3.5" /> {L("unsaved")}
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border/60">
        {tabs.map((tabDef) => (
          <button key={tabDef.key}
            onClick={() => setTab(tabDef.key)}
            className={`inline-flex items-center gap-1 rounded-t-md border border-b-0 px-2.5 py-1.5 text-xs ${tab === tabDef.key ? "border-border/60 bg-background font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tabDef.icon}{tabDef.label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{L("f_internal_name")}</span>
            <input className={inputCls} value={draft.internalName} onChange={(e) => update("internalName", e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{L("f_credits")}</span>
            <input type="number" min={0} className={inputCls} value={draft.credits}
              onChange={(e) => update("credits", Math.max(0, Number(e.target.value) || 0))} />
            {errors.credits && <span className="mt-1 block text-xs text-rose-600">{errors.credits}</span>}
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{L("f_category")}</span>
            <select className={inputCls} value={draft.category} onChange={(e) => update("category", e.target.value as CatalogCategory)}>
              {CATALOG_CATEGORIES.map((c) => <option key={c} value={c}>{L("cat_" + c)}</option>)}
            </select>
            {errors.category && <span className="mt-1 block text-xs text-rose-600">{errors.category}</span>}
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{L("f_type")}</span>
            <select className={inputCls} value={draft.type} onChange={(e) => update("type", e.target.value as CatalogType)}>
              {CATALOG_TYPES.map((tt) => <option key={tt} value={tt}>{L("type_" + tt)}</option>)}
            </select>
            {errors.type && <span className="mt-1 block text-xs text-rose-600">{errors.type}</span>}
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{L("f_language")} ({L("tr_primary")})</span>
            <select className={inputCls} value={draft.primaryLanguage} onChange={(e) => {
              const nextLang = e.target.value as Lang;
              setDraft((d) => ({
                ...d,
                primaryLanguage: nextLang,
                translations: d.translations[nextLang] ? d.translations : { ...d.translations, [nextLang]: emptyTranslation() },
              }));
            }}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{L("f_status")}</span>
            <select className={inputCls} value={draft.status} onChange={(e) => update("status", e.target.value as CatalogStatus)}>
              {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{L("status_" + s)}</option>)}
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">{L("f_internal_notes")}</span>
            <textarea rows={2} className={inputCls} value={draft.internalNotes} onChange={(e) => update("internalNotes", e.target.value)} />
          </label>
          {errors.title && <span className="mt-1 block text-xs text-rose-600 md:col-span-2">{errors.title}</span>}
          {errors.translations && <span className="mt-1 block text-xs text-rose-600 md:col-span-2">{errors.translations}</span>}
          {errors.pin && <span className="mt-1 block text-xs text-rose-600 md:col-span-2">{errors.pin}</span>}
        </div>
      )}

      {tab === "media" && (
        <div className="space-y-3">
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-100">
            {L("m_placeholder_note")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {([
              ["mainPreview", "m_main_preview"],
              ["thumbnail", "m_thumbnail"],
              ["cover", "m_cover"],
              ["audio", "m_audio"],
              ["video", "m_video"],
            ] as const).map(([k, tKey]) => (
              <MediaField key={k} L={L} label={L(tKey)}
                value={draft.media[k]}
                onChange={(v) => setDraft((d) => ({ ...d, media: { ...d.media, [k]: v } }))}
              />
            ))}
            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-muted-foreground">{L("m_additional")}</div>
              <MultiFileInput L={L} values={draft.media.additional}
                onChange={(next) => setDraft((d) => ({ ...d, media: { ...d.media, additional: next } }))} />
            </div>
          </div>
          <div className="pt-2">
            <div className="mb-1 text-xs text-muted-foreground">{L("f_preview")}</div>
            <TypedPreview it={draft} L={L} size="lg" />
          </div>
        </div>
      )}

      {tab === "presentation" && (
        <div className="space-y-4">
          <LanguageTabsBar L={L} draft={draft} active={activeLang} onSelect={setActiveLang} onAdd={(l) => updateTranslation(l, {})} onRemove={removeTranslation} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">{L("p_customer_title")}</span>
              <input className={inputCls} value={t.title} onChange={(e) => updateTranslation(activeLang, { title: e.target.value })} />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">{L("p_short_desc")}</span>
              <textarea rows={2} className={inputCls} value={t.shortDescription} onChange={(e) => updateTranslation(activeLang, { shortDescription: e.target.value })} />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">{L("p_long_desc")}</span>
              <textarea rows={4} className={inputCls} value={t.longDescription} onChange={(e) => updateTranslation(activeLang, { longDescription: e.target.value })} />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">{L("f_tags")}</span>
              <input className={inputCls} placeholder={L("f_tags_ph")} value={t.tags.join(", ")}
                onChange={(e) => updateTranslation(activeLang, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">{L("p_search_keywords")}</span>
              <input className={inputCls} placeholder={L("p_keywords_ph")} value={t.searchKeywords.join(", ")}
                onChange={(e) => updateTranslation(activeLang, { searchKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </label>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FLAG_META.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={draft.flags[f.key]} onChange={(e) => updateFlag(f.key, e.target.checked)} />
                  <span className="inline-flex items-center gap-1">{f.icon}{L(f.tKey)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "publication" && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={draft.status === "published" && !draft.publishAt}
              onChange={(e) => {
                if (e.target.checked) setDraft((d) => ({ ...d, status: "published", publishAt: undefined }));
              }} />
            {L("pub_publish_now")}
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={!!draft.publishAt}
              onChange={(e) => setDraft((d) => ({
                ...d,
                publishAt: e.target.checked ? new Date(Date.now() + 3600000).toISOString() : undefined,
                status: e.target.checked ? "published" : d.status,
              }))} />
            {L("pub_schedule")}
          </label>
          <DateTimeField L={L} label={L("pub_date")} timeLabel={L("pub_time")}
            value={draft.publishAt} onChange={(v) => update("publishAt", v)} error={errors.publishAt} />
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.noEndDate}
                onChange={(e) => setDraft((d) => ({ ...d, noEndDate: e.target.checked, hideAfter: e.target.checked ? undefined : d.hideAfter }))} />
              {L("pub_no_end")}
            </label>
            {!draft.noEndDate && (
              <div className="mt-2">
                <DateTimeField L={L} label={L("pub_hide_after")} value={draft.hideAfter} onChange={(v) => update("hideAfter", v)} error={errors.hideAfter} />
              </div>
            )}
          </div>
          <div className="md:col-span-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs">
            {L("f_status")}: <StatusPill status={deriveDisplayStatus(draft)} L={L} />
          </div>
        </div>
      )}

      {tab === "translations" && (
        <TranslationsTab draft={draft} L={L} lang={lang} onSetPrimary={(l) => update("primaryLanguage", l)}
          onEdit={(l) => { setActiveLang(l); setTab("presentation"); }}
          onAdd={(l) => updateTranslation(l, {})}
          onRemove={removeTranslation}
        />
      )}

      {tab === "versions" && (
        <div className="space-y-2">
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-100">
            {L("ver_demo_note")}
          </div>
          {draft.versions.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-6 text-center text-sm text-muted-foreground">{L("ver_none")}</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {draft.versions.map((v) => (
                <li key={v.version} className="rounded border border-border/60 bg-muted/30 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{L("ver_version")} {v.version} · {L("status_" + v.status)}</span>
                    <span className="text-muted-foreground">{formatDateTime(v.date, lang)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{L("ver_admin")}: {v.admin}</div>
                  <div className="text-[11px] text-muted-foreground">{L("ver_changed")}: {v.changedFields.join(", ") || "—"}</div>
                  <div className="mt-1 flex gap-1">
                    <button className={btnBase} type="button">{L("ver_preview")}</button>
                    <button className={btnBase} type="button">{L("ver_restore")}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "statistics" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatRow label={L("st_views")} value={draft.stats.views} />
            <StatRow label={L("st_opens")} value={draft.stats.opens} />
            <StatRow label={L("st_uses")} value={draft.stats.uses} />
            <StatRow label={L("st_favorites")} value={draft.stats.favorites} />
            <StatRow label={L("st_shares")} value={draft.stats.shares} />
            <StatRow label={L("st_conversion")} value={`${draft.stats.conversion}%`} />
          </div>
          <div className="text-[10px] text-muted-foreground">{L("st_last_used")}: {formatDate(draft.stats.lastUsed, lang)}</div>
          <div className="text-[10px] italic text-muted-foreground">{L("st_demo_note")}</div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnBase} onClick={handleClose}>{L("act_cancel")}</button>
        <button type="button" className={btnPrimary} onClick={submit}>{L("act_save")}</button>
      </div>

      {confirmDiscard && (
        <Modal title={L("unsaved_confirm_title")} onClose={() => setConfirmDiscard(false)}>
          <p className="text-sm">{L("unsaved_confirm_body")}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnBase} onClick={() => setConfirmDiscard(false)}>{L("act_keep_editing")}</button>
            <button className={btnDanger} onClick={() => { setConfirmDiscard(false); onClose(); }}>{L("act_discard")}</button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function MediaField({ L, label, value, onChange }: { L: LocalCatalog; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        <input className={inputCls} placeholder={L("m_filename_ph")} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className={btnBase} title={L("m_upload")}><Upload className="h-3.5 w-3.5" /></button>
      </div>
    </label>
  );
}

function MultiFileInput({ L, values, onChange }: { L: LocalCatalog; values: string[]; onChange: (v: string[]) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <input className={inputCls} placeholder={L("m_filename_ph")} value={val} onChange={(e) => setVal(e.target.value)} />
        <button type="button" className={btnBase} onClick={() => { if (val.trim()) { onChange([...values, val.trim()]); setVal(""); } }}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px]">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

function DateTimeField({ L, label, timeLabel, value, onChange, error }: {
  L: LocalCatalog; label: string; timeLabel?: string; value?: string; onChange: (v: string | undefined) => void; error?: string;
}) {
  const date = value ? new Date(value) : undefined;
  const dstr = date ? date.toISOString().slice(0, 10) : "";
  const tstr = date ? date.toISOString().slice(11, 16) : "";
  const set = (d: string, t: string) => {
    if (!d) { onChange(undefined); return; }
    const iso = new Date(`${d}T${t || "00:00"}:00`).toISOString();
    onChange(iso);
  };
  return (
    <div>
      <div className="grid gap-1 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
          <input type="date" className={inputCls} value={dstr} onChange={(e) => set(e.target.value, tstr)} />
        </label>
        {timeLabel && (
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{timeLabel}</span>
            <input type="time" className={inputCls} value={tstr} onChange={(e) => set(dstr, e.target.value)} disabled={!dstr} />
          </label>
        )}
      </div>
      {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
      {L("act_close") /* noop use */}
    </div>
  );
}

function LanguageTabsBar({ L, draft, active, onSelect, onAdd, onRemove }: {
  L: LocalCatalog; draft: CatalogItem; active: Lang; onSelect: (l: Lang) => void;
  onAdd: (l: Lang) => void; onRemove: (l: Lang) => void;
}) {
  const present = new Set(Object.keys(draft.translations) as Lang[]);
  const missing = LANGS.filter((l) => !present.has(l.code));
  return (
    <div className="flex flex-wrap items-center gap-1">
      {LANGS.filter((l) => present.has(l.code)).map((l) => {
        const s = translationStatus(draft.translations[l.code]);
        const isPrimary = l.code === draft.primaryLanguage;
        return (
          <button key={l.code} onClick={() => onSelect(l.code)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${active === l.code ? "border-primary/60 bg-primary/10" : "border-border/60"}`}>
            {l.flag}
            <TranslationBadge status={s} L={L} />
            {isPrimary && <span className="text-[9px] uppercase text-muted-foreground">{L("tr_primary")}</span>}
            {!isPrimary && (
              <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onRemove(l.code); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onRemove(l.code); } }}
                className="ml-1 cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
      {missing.length > 0 && (
        <div className="ml-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          {L("tr_add")}:
          {missing.map((l) => (
            <button key={l.code} className={btnBase} onClick={() => { onAdd(l.code); onSelect(l.code); }}>+{l.flag}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function TranslationsTab({ draft, L, lang, onSetPrimary, onEdit, onAdd, onRemove }: {
  draft: CatalogItem; L: LocalCatalog; lang: Lang;
  onSetPrimary: (l: Lang) => void; onEdit: (l: Lang) => void; onAdd: (l: Lang) => void; onRemove: (l: Lang) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {LANGS.map((l) => {
          const has = !!draft.translations[l.code];
          const s = translationStatus(draft.translations[l.code]);
          const isPrimary = l.code === draft.primaryLanguage;
          return (
            <div key={l.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{l.label}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{l.code}</span>
                {isPrimary && <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">{L("tr_primary")}</span>}
                <TranslationBadge status={s} L={L} />
              </div>
              <div className="flex flex-wrap gap-1">
                {has ? (
                  <>
                    <button className={btnBase} type="button" onClick={() => onEdit(l.code)}><Pencil className="h-3.5 w-3.5" />{L("act_edit")}</button>
                    {!isPrimary && <button className={btnBase} type="button" onClick={() => onSetPrimary(l.code)}><Check className="h-3.5 w-3.5" />{L("tr_make_primary")}</button>}
                    {!isPrimary && <button className={btnBase} type="button" onClick={() => onRemove(l.code)}><X className="h-3.5 w-3.5" /></button>}
                  </>
                ) : (
                  <button className={btnPrimary} type="button" onClick={() => { onAdd(l.code); onEdit(l.code); }}><Plus className="h-3.5 w-3.5" />{L("tr_add")}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-muted-foreground">{lang.toUpperCase()}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Customer preview modal
// -----------------------------------------------------------------------------
function CustomerPreviewModal({ item, L, initialLang, onClose }: {
  item: CatalogItem; L: LocalCatalog; initialLang: Lang; onClose: () => void;
}) {
  const [pv, setPv] = useState<Lang>(() => (item.translations[initialLang] ? initialLang : item.primaryLanguage));
  const ds = deriveDisplayStatus(item);
  const draftHidden = item.status === "draft";
  const title = displayTitle(item, pv);
  const short = displayShort(item, pv);
  const long = displayLong(item, pv);
  const available = LANGS.filter((l) => item.translations[l.code]);

  return (
    <Modal title={L("preview_customer")} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{L("preview_language")}:</span>
        {available.map((l) => (
          <button key={l.code} onClick={() => setPv(l.code)}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${pv === l.code ? "border-primary/60 bg-primary/10" : "border-border/60"}`}>
            {l.flag}
          </button>
        ))}
      </div>

      {draftHidden ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-4 text-sm text-amber-800 dark:text-amber-100">
          {L("preview_draft_hidden")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center gap-2">
            <TypedPreview it={item} L={L} size="lg" />
            <FlagBadges flags={item.flags} L={L} max={6} />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{L("cat_" + item.category)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">{typeIcon(item.type)}{L("type_" + item.type)}</span>
              <span>·</span>
              <span className="uppercase">{pv}</span>
              <span>·</span>
              <StatusPill status={ds} L={L} />
            </div>
            <h3 className="font-display text-2xl">{title || "—"}</h3>
            <p className="text-sm text-muted-foreground">{short || "—"}</p>
            {long && <p className="text-sm">{long}</p>}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">{L("f_credits")}</span>
              <span className="text-base font-semibold tabular-nums">{item.credits}</span>
            </div>
            <button type="button" className={btnPrimary + " px-4 py-2 text-sm"} onClick={onClose}>
              {L("preview_cta")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" className={btnBase} onClick={onClose}>{L("act_close")}</button>
      </div>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// Delete confirmation
// -----------------------------------------------------------------------------
function ConfirmDelete({ item, L, lang, onCancel, onConfirm }: {
  item: CatalogItem; L: LocalCatalog; lang: Lang; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Modal title={L("delete_title")} onClose={onCancel}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
        <div className="text-sm">
          <p>{L("delete_body")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-mono">{item.id}</span> · {displayTitle(item, lang)}
          </p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnBase} onClick={onCancel}>{L("act_cancel")}</button>
        <button type="button" className={btnDanger} onClick={onConfirm}><Trash2 className="h-3.5 w-3.5" />{L("act_delete")}</button>
      </div>
    </Modal>
  );
}
import { useMemo, useState, useEffect } from "react";
import {
  Plus, RefreshCw, Upload, Download, Eye, Pencil, Trash2, X,
  Languages as LangIcon, Search, Star, StarOff, RotateCcw,
  Check, AlertTriangle, FileText, History as HistoryIcon, Settings as SettingsIcon,
  BookOpen, Bell, LayoutGrid, MessageSquare, ChevronDown,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n/types";
import {
  ALL_LANGS, DEMO_LANGUAGES, DEMO_INTERFACE_TRANSLATIONS, DEMO_CATALOG_TRANSLATIONS,
  DEMO_NOTIF_TEMPLATE_I18N, DEMO_TERMS, DEMO_HISTORY,
  SECTIONS, coverageFor, extractPlaceholders, placeholderDiff,
  STATUS_TONE, LANG_STATUS_TONE,
  type LangCode, type LanguageRecord, type LanguageStatus,
  type InterfaceTranslation, type TranslationSection, type TranslationStatus,
  type CatalogTranslationItem, type NotificationTemplateI18n, type TermRecord,
} from "@/lib/admin/languages";
import { useLocalLangs, type LocalLangs } from "./i18n";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/20";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

type MainTab = "languages" | "interface" | "catalog" | "notifications" | "terminology" | "settings" | "history";

const TAB_META: { id: MainTab; icon: typeof LangIcon; labelKey: string }[] = [
  { id: "languages", icon: LangIcon, labelKey: "tab_languages" },
  { id: "interface", icon: FileText, labelKey: "tab_interface" },
  { id: "catalog", icon: LayoutGrid, labelKey: "tab_catalog" },
  { id: "notifications", icon: Bell, labelKey: "tab_notifications" },
  { id: "terminology", icon: BookOpen, labelKey: "tab_terminology" },
  { id: "settings", icon: SettingsIcon, labelKey: "tab_settings" },
  { id: "history", icon: HistoryIcon, labelKey: "tab_history" },
];

export function LanguagesPage() {
  const { lang } = useI18n();
  const L = useLocalLangs(lang);

  const [tab, setTab] = useState<MainTab>("languages");
  const [languages, setLanguages] = useState<LanguageRecord[]>(() => [...DEMO_LANGUAGES]);
  const [translations, setTranslations] = useState<InterfaceTranslation[]>(() => [...DEMO_INTERFACE_TRANSLATIONS]);
  const [catalog] = useState<CatalogTranslationItem[]>(() => [...DEMO_CATALOG_TRANSLATIONS]);
  const [notifTpl] = useState<NotificationTemplateI18n[]>(() => [...DEMO_NOTIF_TEMPLATE_I18N]);
  const [terms, setTerms] = useState<TermRecord[]>(() => [...DEMO_TERMS]);
  const [history] = useState(() => [...DEMO_HISTORY]);

  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLang, setPreviewLang] = useState<LangCode>(lang);
  const [editLang, setEditLang] = useState<LanguageRecord | null>(null);
  const [editTr, setEditTr] = useState<InterfaceTranslation | null>(null);
  const [targetLang, setTargetLang] = useState<LangCode>("de");

  const [catalogItem, setCatalogItem] = useState<CatalogTranslationItem | null>(null);
  const [notifItem, setNotifItem] = useState<NotificationTemplateI18n | null>(null);

  const defaultLang = languages.find((l) => l.isDefault)?.code ?? "en";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary/80">
            <LangIcon className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">{L("demo_only")}</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl">{L("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{L("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => alert(L("demo_only"))}>
            <Plus className="h-3.5 w-3.5" /> {L("btn_add")}
          </button>
          <button className={btnBase} onClick={() => setLanguages([...DEMO_LANGUAGES])}>
            <RefreshCw className="h-3.5 w-3.5" /> {L("btn_refresh")}
          </button>
          <button className={btnBase} onClick={() => setShowImport(true)}>
            <Upload className="h-3.5 w-3.5" /> {L("btn_import")}
          </button>
          <button className={btnBase} onClick={() => setShowExport(true)}>
            <Download className="h-3.5 w-3.5" /> {L("btn_export")}
          </button>
          <button className={btnBase} onClick={() => setShowPreview(true)}>
            <Eye className="h-3.5 w-3.5" /> {L("btn_preview")}
          </button>
        </div>
      </header>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        {L("demo_notice")}
      </div>

      <nav className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background/50 p-1">
        {TAB_META.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition " +
                (active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted/50")
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {L(t.labelKey)}
            </button>
          );
        })}
      </nav>

      {tab === "languages" && (
        <LanguagesTab
          L={L}
          languages={languages}
          setLanguages={setLanguages}
          translations={translations}
          onEdit={setEditLang}
        />
      )}
      {tab === "interface" && (
        <InterfaceTab
          L={L}
          translations={translations}
          setTranslations={setTranslations}
          targetLang={targetLang}
          setTargetLang={setTargetLang}
          onEdit={setEditTr}
        />
      )}
      {tab === "catalog" && (
        <CatalogTab L={L} items={catalog} onOpen={setCatalogItem} />
      )}
      {tab === "notifications" && (
        <NotifTab L={L} items={notifTpl} onOpen={setNotifItem} />
      )}
      {tab === "terminology" && <TerminologyTab L={L} terms={terms} setTerms={setTerms} />}
      {tab === "settings" && (
        <SettingsTab L={L} languages={languages} setLanguages={setLanguages} defaultLang={defaultLang} />
      )}
      {tab === "history" && <HistoryTab L={L} history={history} />}

      {editLang && (
        <LanguageEditModal
          L={L} record={editLang} onClose={() => setEditLang(null)}
          onSave={(rec) => {
            setLanguages((all) => all.map((x) => (x.code === rec.code ? rec : x)));
            setEditLang(null);
          }}
        />
      )}
      {editTr && (
        <TranslationEditor
          L={L} record={editTr} targetLang={targetLang}
          onClose={() => setEditTr(null)}
          onSave={(rec) => {
            setTranslations((all) => all.map((x) => (x.id === rec.id ? rec : x)));
            setEditTr(null);
          }}
        />
      )}
      {catalogItem && <CatalogEditor L={L} item={catalogItem} onClose={() => setCatalogItem(null)} />}
      {notifItem && <NotifEditor L={L} item={notifItem} onClose={() => setNotifItem(null)} />}
      {showImport && <ImportModal L={L} onClose={() => setShowImport(false)} />}
      {showExport && <ExportModal L={L} onClose={() => setShowExport(false)} />}
      {showPreview && (
        <PreviewModal
          L={L} previewLang={previewLang} setPreviewLang={setPreviewLang}
          translations={translations} onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ---------------- Languages Tab ----------------
function LanguagesTab({
  L, languages, setLanguages, translations, onEdit,
}: {
  L: LocalLangs; languages: LanguageRecord[];
  setLanguages: (fn: (l: LanguageRecord[]) => LanguageRecord[]) => void;
  translations: InterfaceTranslation[]; onEdit: (r: LanguageRecord) => void;
}) {
  const totalKeys = translations.length;
  const summary = useMemo(() => {
    const active = languages.filter((l) => l.status === "active").length;
    let allDone = 0, allMissing = 0, allOutdated = 0;
    for (const l of languages) {
      const c = coverageFor(translations, l.code);
      allDone += c.done; allMissing += c.missing; allOutdated += c.outdated;
    }
    const cov = languages.length ? Math.round(languages.reduce((s, l) => s + l.coveragePercent, 0) / languages.length) : 0;
    return { total: languages.length, active, allDone, allMissing, allOutdated, coverage: cov };
  }, [languages, translations]);

  const cards = [
    { label: L("card_total_langs"), value: summary.total },
    { label: L("card_active_langs"), value: summary.active },
    { label: L("card_total_keys"), value: totalKeys },
    { label: L("card_full_keys"), value: summary.allDone },
    { label: L("card_missing"), value: summary.allMissing },
    { label: L("card_outdated"), value: summary.allOutdated },
    { label: L("card_coverage"), value: summary.coverage + "%" },
  ];

  const toggleStatus = (code: LangCode) => {
    setLanguages((all) => all.map((l) => {
      if (l.code !== code) return l;
      if (l.isDefault && l.status === "active") { alert(L("default_cannot_inactive")); return l; }
      if (l.status === "active" && !confirm(L("confirm_disable_language"))) return l;
      return { ...l, status: l.status === "active" ? "inactive" : "active" };
    }));
  };
  const setDefault = (code: LangCode) => {
    const target = languages.find((l) => l.code === code);
    if (!target || target.status !== "active") { alert(L("default_cannot_inactive")); return; }
    if (!confirm(L("confirm_change_default"))) return;
    setLanguages((all) => all.map((l) => ({ ...l, isDefault: l.code === code })));
  };
  const del = (rec: LanguageRecord) => {
    if (rec.protected || rec.isDefault) { alert(L("confirm_delete_language_protected")); return; }
    setLanguages((all) => all.filter((l) => l.code !== rec.code));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
            <div className="mt-0.5 font-serif text-xl">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/60 bg-background/70">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">{L("col_language")}</th>
                <th className="px-3 py-2 text-left">{L("col_native")}</th>
                <th className="px-3 py-2 text-left">{L("col_code")}</th>
                <th className="px-3 py-2 text-left">{L("col_locale")}</th>
                <th className="px-3 py-2 text-left">{L("col_status")}</th>
                <th className="px-3 py-2 text-left">{L("col_coverage")}</th>
                <th className="px-3 py-2 text-left">{L("col_missing")}</th>
                <th className="px-3 py-2 text-left">{L("col_default")}</th>
                <th className="px-3 py-2 text-left">{L("col_fallback")}</th>
                <th className="px-3 py-2 text-left">{L("col_updated")}</th>
                <th className="px-3 py-2 text-right">{L("col_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {languages.map((l) => {
                const cov = coverageFor(translations, l.code);
                return (
                  <tr key={l.code} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">
                      <span className="mr-1.5">{l.flag}</span>{l.name}
                    </td>
                    <td className="px-3 py-2">{l.nativeName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.shortCode}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.locale}</td>
                    <td className="px-3 py-2">
                      <span className={"inline-flex rounded border px-1.5 py-0.5 text-[10px] " + LANG_STATUS_TONE[l.status]}>
                        {L("status_" + l.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: l.coveragePercent + "%" }} />
                        </div>
                        <span className="text-xs">{l.coveragePercent}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {cov.missing > 0 ? (
                        <span className="text-rose-700">{cov.missing}</span>
                      ) : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-3 py-2">
                      {l.isDefault ? <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
                    </td>
                    <td className="px-3 py-2 text-xs">{l.fallback.toUpperCase()}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(l.lastUpdated)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button className={btnBase} onClick={() => onEdit(l)} title={L("act_edit")}><Pencil className="h-3.5 w-3.5" /></button>
                        <button className={btnBase} onClick={() => toggleStatus(l.code)} title={l.status === "active" ? L("act_disable") : L("act_enable")}>
                          {l.status === "active" ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button className={btnBase} onClick={() => setDefault(l.code)} title={L("act_default")}><Star className="h-3.5 w-3.5" /></button>
                        <button className={btnBase} onClick={() => alert(L("demo_only"))} title={L("act_export")}><Download className="h-3.5 w-3.5" /></button>
                        <button className={btnDanger} onClick={() => del(l)} title={L("act_delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y divide-border/40">
          {languages.map((l) => (
            <div key={l.code} className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{l.flag} {l.name} <span className="text-xs text-muted-foreground">— {l.nativeName}</span></div>
                <span className={"inline-flex rounded border px-1.5 py-0.5 text-[10px] " + LANG_STATUS_TONE[l.status]}>{L("status_" + l.status)}</span>
              </div>
              <div className="text-xs text-muted-foreground">{l.locale} · {L("col_fallback")}: {l.fallback.toUpperCase()}</div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: l.coveragePercent + "%" }} />
                </div>
                <span className="text-xs">{l.coveragePercent}%</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                <button className={btnBase} onClick={() => onEdit(l)}>{L("act_edit")}</button>
                <button className={btnBase} onClick={() => toggleStatus(l.code)}>{l.status === "active" ? L("act_disable") : L("act_enable")}</button>
                <button className={btnBase} onClick={() => setDefault(l.code)}>{L("act_default")}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Interface Translations ----------------
function InterfaceTab({
  L, translations, setTranslations, targetLang, setTargetLang, onEdit,
}: {
  L: LocalLangs; translations: InterfaceTranslation[];
  setTranslations: (fn: (l: InterfaceTranslation[]) => InterfaceTranslation[]) => void;
  targetLang: LangCode; setTargetLang: (l: LangCode) => void;
  onEdit: (r: InterfaceTranslation) => void;
}) {
  const [query, setQuery] = useState("");
  const [sectionF, setSectionF] = useState<"all" | TranslationSection>("all");
  const [statusF, setStatusF] = useState<"all" | TranslationStatus | "missing_only" | "outdated_only" | "review_only">("all");
  const [sort, setSort] = useState<"key" | "section" | "updated" | "missing" | "outdated">("key");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = translations.filter((t) => {
      if (sectionF !== "all" && t.section !== sectionF) return false;
      const s = t.statuses[targetLang];
      if (statusF === "missing_only" && s && s !== "missing") return false;
      if (statusF === "outdated_only" && s !== "outdated") return false;
      if (statusF === "review_only" && s !== "needs_review") return false;
      if (["complete", "missing", "outdated", "needs_review", "approved"].includes(statusF)) {
        if (s !== statusF) return false;
      }
      if (q) {
        const val = t.values[targetLang] ?? "";
        if (!(t.key.toLowerCase().includes(q) || t.source.toLowerCase().includes(q) || val.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    arr = [...arr].sort((a, b) => {
      if (sort === "key") return a.key.localeCompare(b.key);
      if (sort === "section") return a.section.localeCompare(b.section);
      if (sort === "updated") return b.lastUpdated.localeCompare(a.lastUpdated);
      if (sort === "missing") {
        const am = (a.statuses[targetLang] ?? "missing") === "missing" ? 0 : 1;
        const bm = (b.statuses[targetLang] ?? "missing") === "missing" ? 0 : 1;
        return am - bm;
      }
      if (sort === "outdated") {
        const am = a.statuses[targetLang] === "outdated" ? 0 : 1;
        const bm = b.statuses[targetLang] === "outdated" ? 0 : 1;
        return am - bm;
      }
      return 0;
    });
    return arr;
  }, [translations, query, sectionF, statusF, sort, targetLang]);

  const resetFilters = () => {
    setQuery(""); setSectionF("all"); setStatusF("all"); setSort("key");
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const bulkUpdate = (fn: (t: InterfaceTranslation) => InterfaceTranslation) => {
    setTranslations((all) => all.map((t) => (selected.has(t.id) ? fn(t) : t)));
    setSelected(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className={inputCls + " pl-8"} placeholder={L("search_ph")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={inputCls} value={targetLang} onChange={(e) => setTargetLang(e.target.value as LangCode)}>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{L("filter_language")}: {l.label}</option>)}
        </select>
        <select className={inputCls} value={sectionF} onChange={(e) => setSectionF(e.target.value as any)}>
          <option value="all">{L("filter_section")}: {L("filter_all")}</option>
          {SECTIONS.map((s) => <option key={s} value={s}>{L("section_" + s)}</option>)}
        </select>
        <select className={inputCls} value={statusF} onChange={(e) => setStatusF(e.target.value as any)}>
          <option value="all">{L("filter_status")}: {L("filter_all")}</option>
          <option value="complete">{L("trans_status_complete")}</option>
          <option value="approved">{L("trans_status_approved")}</option>
          <option value="missing_only">{L("filter_missing_only")}</option>
          <option value="outdated_only">{L("filter_outdated_only")}</option>
          <option value="review_only">{L("filter_review_only")}</option>
        </select>
        <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="key">{L("sort_by")}: {L("sort_key")}</option>
          <option value="section">{L("sort_section")}</option>
          <option value="updated">{L("sort_updated")}</option>
          <option value="missing">{L("sort_missing_first")}</option>
          <option value="outdated">{L("sort_outdated_first")}</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={btnBase} onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" />{L("filter_reset")}</button>
        {selected.size > 0 && (
          <>
            <span className="text-xs text-muted-foreground">{selected.size} {L("bulk_selected")}</span>
            <button className={btnBase} onClick={() => bulkUpdate((t) => ({ ...t, statuses: { ...t.statuses, [targetLang]: "complete" } }))}>{L("bulk_mark_reviewed")}</button>
            <button className={btnBase} onClick={() => bulkUpdate((t) => ({ ...t, statuses: { ...t.statuses, [targetLang]: "needs_review" } }))}>{L("bulk_needs_review")}</button>
            <button className={btnBase} onClick={() => { if (!confirm(L("bulk_approve") + "?")) return; bulkUpdate((t) => ({ ...t, statuses: { ...t.statuses, [targetLang]: "approved" } })); }}>{L("bulk_approve")}</button>
            <button className={btnBase} onClick={() => alert(L("demo_only"))}>{L("bulk_export_selected")}</button>
          </>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-background/70 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th className="px-3 py-2 text-left">{L("col_key")}</th>
              <th className="px-3 py-2 text-left">{L("col_section")}</th>
              <th className="px-3 py-2 text-left">{L("col_source")}</th>
              <th className="px-3 py-2 text-left">{L("col_translation")} ({targetLang.toUpperCase()})</th>
              <th className="px-3 py-2 text-left">{L("col_status")}</th>
              <th className="px-3 py-2 text-left">{L("col_updated")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.map((t) => {
              const status = t.statuses[targetLang] ?? "missing";
              return (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-2 py-2"><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleOne(t.id)} /></td>
                  <td className="px-3 py-2 font-mono text-xs">{t.key}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{L("section_" + t.section)}</td>
                  <td className="px-3 py-2 max-w-[240px] truncate" title={t.source}>{t.source}</td>
                  <td className="px-3 py-2 max-w-[240px] truncate" title={t.values[targetLang] ?? ""}>
                    {t.values[targetLang] || <span className="italic text-rose-700">— {L("trans_status_missing")} —</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={"inline-flex rounded border px-1.5 py-0.5 text-[10px] " + STATUS_TONE[status]}>{L("trans_status_" + status)}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(t.lastUpdated)}</td>
                  <td className="px-3 py-2 text-right"><button className={btnBase} onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" />{L("editor_target_lang")}</button></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">{L("no_results")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Translation Editor Modal ----------------
function TranslationEditor({
  L, record, targetLang, onClose, onSave,
}: {
  L: LocalLangs; record: InterfaceTranslation; targetLang: LangCode;
  onClose: () => void; onSave: (r: InterfaceTranslation) => void;
}) {
  const [tl, setTl] = useState<LangCode>(targetLang);
  const [text, setText] = useState(record.values[tl] ?? "");
  const [notes, setNotes] = useState(record.notes ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setText(record.values[tl] ?? ""); setDirty(false); }, [tl, record]);

  const required = extractPlaceholders(record.source);
  const diff = placeholderDiff(record.source, text);
  const canApprove = diff.missing.length === 0 && diff.unknown.length === 0 && text.trim().length > 0;

  const save = (nextStatus?: TranslationStatus) => {
    const updated: InterfaceTranslation = {
      ...record,
      values: { ...record.values, [tl]: text },
      statuses: { ...record.statuses, [tl]: nextStatus ?? "complete" },
      lastUpdated: new Date().toISOString(),
      notes,
    };
    onSave(updated);
  };

  const attemptClose = () => {
    if (dirty && !confirm(L("editor_unsaved") + " — " + L("editor_discard") + "?")) return;
    onClose();
  };

  return (
    <Modal onClose={attemptClose} title={L("editor_title") + " — " + record.key}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <FieldRow label={L("col_section")} value={L("section_" + record.section)} />
          <FieldRow label={L("editor_context")} value={record.context ?? "—"} />
          <FieldRow label={L("editor_source_lang")} value="EN" />
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{L("col_source")}</div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-2 text-sm whitespace-pre-wrap">{record.source}</div>
            {record.previousSource && (
              <div className="mt-1 text-[10px] text-amber-700">
                {L("trans_status_outdated")}: <span className="line-through">{record.previousSource}</span>
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{L("editor_required_placeholders")}</div>
            <div className="flex flex-wrap gap-1">
              {required.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              {required.map((p) => (
                <span key={p} className={"rounded border px-1.5 py-0.5 font-mono text-[10px] " + (diff.missing.includes(p) ? "border-rose-500/40 bg-rose-500/10 text-rose-700" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700")}>
                  {"{{" + p + "}}"}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{L("editor_target_lang")}</div>
            <select className={inputCls} value={tl} onChange={(e) => setTl(e.target.value as LangCode)}>
              {LANGS.filter((l) => l.code !== "en").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>{L("col_translation")}</span>
              <span className="normal-case">{L("editor_chars")}: {text.length}</span>
            </div>
            <textarea rows={5} className={inputCls} value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }} />
            {diff.missing.length > 0 && <div className="mt-1 flex items-center gap-1 text-xs text-rose-700"><AlertTriangle className="h-3 w-3" /> {L("editor_placeholder_missing")}: {diff.missing.map((p) => "{{" + p + "}}").join(", ")}</div>}
            {diff.unknown.length > 0 && <div className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" /> {L("editor_placeholder_unknown")}: {diff.unknown.map((p) => "{{" + p + "}}").join(", ")}</div>}
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{L("editor_notes")}</div>
            <textarea rows={2} className={inputCls} value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} />
          </div>
          <div className="rounded-md border border-border/60 bg-background/70 p-2">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{L("live_preview")}</div>
            <LivePreviewStrip L={L} text={text} />
            <div className="mt-1 text-[10px] text-muted-foreground">{L("internal_only")}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/40 pt-3">
        <button className={btnBase} onClick={attemptClose}>{L("editor_cancel")}</button>
        <button className={btnBase} onClick={() => save("needs_review")}>{L("editor_mark_reviewed")}</button>
        <button className={btnPrimary} onClick={() => save()}>{L("editor_save")}</button>
        <button className={btnPrimary} disabled={!canApprove} onClick={() => save("approved")}>{L("editor_approve")}</button>
      </div>
    </Modal>
  );
}

function LivePreviewStrip({ L, text }: { L: LocalLangs; text: string }) {
  const t = text || "…";
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      <div className="rounded border border-border/50 bg-muted/20 p-1.5">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{L("live_button")}</div>
        <button className={btnPrimary + " mt-1"}>{t}</button>
      </div>
      <div className="rounded border border-border/50 bg-muted/20 p-1.5">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{L("live_nav")}</div>
        <div className="mt-1 text-sm text-primary underline">{t}</div>
      </div>
      <div className="rounded border border-border/50 bg-muted/20 p-1.5">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{L("live_notif")}</div>
        <div className="mt-1 rounded bg-background p-1.5 text-xs shadow">{t}</div>
      </div>
      <div className="rounded border border-border/50 bg-muted/20 p-1.5">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{L("live_label")}</div>
        <label className="mt-1 block text-xs font-medium">{t}</label>
      </div>
    </div>
  );
}

// ---------------- Language Edit Modal ----------------
function LanguageEditModal({
  L, record, onClose, onSave,
}: { L: LocalLangs; record: LanguageRecord; onClose: () => void; onSave: (r: LanguageRecord) => void }) {
  const [r, setR] = useState<LanguageRecord>(record);
  const err = r.fallback === r.code ? L("fallback_cannot_self") : null;

  return (
    <Modal onClose={onClose} title={L("act_edit") + " — " + record.name}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={L("settings_name")}><input className={inputCls} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
        <Field label={L("settings_native")}><input className={inputCls} value={r.nativeName} onChange={(e) => setR({ ...r, nativeName: e.target.value })} /></Field>
        <Field label={L("settings_short")}><input className={inputCls} value={r.shortCode} onChange={(e) => setR({ ...r, shortCode: e.target.value })} /></Field>
        <Field label={L("settings_locale")}><input className={inputCls} value={r.locale} onChange={(e) => setR({ ...r, locale: e.target.value })} /></Field>
        <Field label={L("settings_direction")}>
          <select className={inputCls} value={r.direction} onChange={(e) => setR({ ...r, direction: e.target.value as any })}>
            <option value="ltr">{L("settings_ltr")}</option>
            <option value="rtl">{L("settings_rtl")}</option>
          </select>
        </Field>
        <Field label={L("settings_fallback")}>
          <select className={inputCls} value={r.fallback} onChange={(e) => setR({ ...r, fallback: e.target.value as LangCode })}>
            {ALL_LANGS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </Field>
        <Field label={L("settings_date")}><input className={inputCls} value={r.dateFormat} onChange={(e) => setR({ ...r, dateFormat: e.target.value })} /></Field>
        <Field label={L("settings_time")}><input className={inputCls} value={r.timeFormat} onChange={(e) => setR({ ...r, timeFormat: e.target.value })} /></Field>
        <Field label={L("settings_number")}><input className={inputCls} value={r.numberFormat} onChange={(e) => setR({ ...r, numberFormat: e.target.value })} /></Field>
        <Field label={L("settings_currency")}><input className={inputCls} value={r.currencyFormat} onChange={(e) => setR({ ...r, currencyFormat: e.target.value })} /></Field>
        <Field label={L("settings_decimal")}><input className={inputCls} value={r.decimalSeparator} onChange={(e) => setR({ ...r, decimalSeparator: e.target.value })} /></Field>
        <Field label={L("settings_thousands")}><input className={inputCls} value={r.thousandsSeparator} onChange={(e) => setR({ ...r, thousandsSeparator: e.target.value })} /></Field>
        <Field label={L("settings_first_day")}>
          <select className={inputCls} value={r.firstDayOfWeek} onChange={(e) => setR({ ...r, firstDayOfWeek: Number(e.target.value) as 0 | 1 })}>
            <option value={0}>{L("day_sun")}</option>
            <option value={1}>{L("day_mon")}</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <ToggleField label={L("settings_avail_website")} value={r.availableWebsite} onChange={(v) => setR({ ...r, availableWebsite: v })} />
          <ToggleField label={L("settings_avail_studio")} value={r.availableStudio} onChange={(v) => setR({ ...r, availableStudio: v })} />
          <ToggleField label={L("settings_avail_notif")} value={r.availableNotifications} onChange={(v) => setR({ ...r, availableNotifications: v })} />
          <ToggleField label={L("settings_avail_admin")} value={r.availableAdmin} onChange={(v) => setR({ ...r, availableAdmin: v })} />
        </div>
      </div>
      {err && <div className="mt-3 flex items-center gap-1 text-xs text-rose-700"><AlertTriangle className="h-3 w-3" />{err}</div>}
      <div className="mt-4 flex justify-end gap-2 border-t border-border/40 pt-3">
        <button className={btnBase} onClick={onClose}>{L("cancel")}</button>
        <button className={btnPrimary} disabled={!!err} onClick={() => onSave({ ...r, lastUpdated: new Date().toISOString() })}>{L("save")}</button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

// ---------------- Catalog Tab ----------------
function CatalogTab({ L, items, onOpen }: { L: LocalLangs; items: CatalogTranslationItem[]; onOpen: (i: CatalogTranslationItem) => void }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">{L("cat_col_id")}</th>
            <th className="px-3 py-2 text-left">{L("cat_col_title")}</th>
            <th className="px-3 py-2 text-left">{L("cat_col_primary")}</th>
            {ALL_LANGS.map((c) => <th key={c} className="px-2 py-2 text-center text-[10px]">{c.toUpperCase()}</th>)}
            <th className="px-3 py-2 text-left">{L("cat_col_overall")}</th>
            <th className="px-3 py-2 text-right">{L("col_actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((it) => {
            const done = ALL_LANGS.filter((c) => it.translations[c]).length;
            const pct = Math.round((done / ALL_LANGS.length) * 100);
            return (
              <tr key={it.contentId} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{it.contentId}</td>
                <td className="px-3 py-2">{it.title}</td>
                <td className="px-3 py-2 text-xs">{it.primaryLanguage.toUpperCase()}</td>
                {ALL_LANGS.map((c) => {
                  const s = it.translations[c]?.status;
                  return <td key={c} className="px-2 py-2 text-center">
                    {s ? <span className={"inline-block rounded px-1 py-0.5 text-[9px] border " + STATUS_TONE[s]}>{L("trans_status_" + s)}</span> : <span className="text-xs text-rose-700">—</span>}
                  </td>;
                })}
                <td className="px-3 py-2 text-xs">{pct}%</td>
                <td className="px-3 py-2 text-right"><button className={btnBase} onClick={() => onOpen(it)}><Pencil className="h-3.5 w-3.5" />{L("act_open")}</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function CatalogEditor({ L, item, onClose }: { L: LocalLangs; item: CatalogTranslationItem; onClose: () => void }) {
  const [tab, setTab] = useState<LangCode>(item.primaryLanguage);
  const entry = item.translations[tab];
  return (
    <Modal onClose={onClose} title={item.title + " — " + item.contentId}>
      <div className="mb-3 flex flex-wrap gap-1 border-b border-border/40 pb-2">
        {ALL_LANGS.map((c) => (
          <button key={c} onClick={() => setTab(c)} className={"rounded px-2 py-1 text-xs " + (tab === c ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted/70")}>
            {c.toUpperCase()}{!item.translations[c] && " —"}
          </button>
        ))}
      </div>
      {entry ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={L("cat_field_title")}><input className={inputCls} defaultValue={entry.title} /></Field>
          <Field label={L("cat_field_tags")}><input className={inputCls} defaultValue={entry.tags.join(", ")} /></Field>
          <Field label={L("cat_field_short")}><textarea rows={2} className={inputCls} defaultValue={entry.shortDescription} /></Field>
          <Field label={L("cat_field_keywords")}><input className={inputCls} defaultValue={entry.keywords.join(", ")} /></Field>
          <div className="md:col-span-2"><Field label={L("cat_field_long")}><textarea rows={4} className={inputCls} defaultValue={entry.longDescription} /></Field></div>
        </div>
      ) : (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-800">{L("trans_status_missing")}</div>
      )}
      <div className="mt-4 flex justify-end gap-2 border-t border-border/40 pt-3">
        <button className={btnBase} onClick={onClose}>{L("close")}</button>
        <button className={btnPrimary} onClick={onClose}>{L("save")}</button>
      </div>
    </Modal>
  );
}

// ---------------- Notification Templates Tab ----------------
function NotifTab({ L, items, onOpen }: { L: LocalLangs; items: NotificationTemplateI18n[]; onOpen: (i: NotificationTemplateI18n) => void }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">{L("notif_col_id")}</th>
            <th className="px-3 py-2 text-left">{L("notif_col_type")}</th>
            <th className="px-3 py-2 text-left">{L("notif_col_channel")}</th>
            <th className="px-3 py-2 text-left">{L("notif_col_source_lang")}</th>
            <th className="px-3 py-2 text-left">{L("card_coverage")}</th>
            <th className="px-3 py-2 text-left">{L("notif_col_missing_langs")}</th>
            <th className="px-3 py-2 text-right">{L("col_actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((it) => {
            const done = ALL_LANGS.filter((c) => it.translations[c]).length;
            const missing = ALL_LANGS.filter((c) => !it.translations[c]);
            const pct = Math.round((done / ALL_LANGS.length) * 100);
            return (
              <tr key={it.templateId} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{it.templateId}</td>
                <td className="px-3 py-2">{it.templateType}</td>
                <td className="px-3 py-2 text-xs">{it.channel}</td>
                <td className="px-3 py-2 text-xs">{it.sourceLanguage.toUpperCase()}</td>
                <td className="px-3 py-2 text-xs">{pct}%</td>
                <td className="px-3 py-2 text-xs">{missing.map((c) => c.toUpperCase()).join(", ") || "—"}</td>
                <td className="px-3 py-2 text-right"><button className={btnBase} onClick={() => onOpen(it)}><Pencil className="h-3.5 w-3.5" />{L("act_open")}</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function NotifEditor({ L, item, onClose }: { L: LocalLangs; item: NotificationTemplateI18n; onClose: () => void }) {
  const [tab, setTab] = useState<LangCode>(item.sourceLanguage);
  const entry = item.translations[tab];
  return (
    <Modal onClose={onClose} title={item.templateType + " — " + item.templateId}>
      <div className="mb-3 flex flex-wrap gap-1 border-b border-border/40 pb-2">
        {ALL_LANGS.map((c) => (
          <button key={c} onClick={() => setTab(c)} className={"rounded px-2 py-1 text-xs " + (tab === c ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted/70")}>
            {c.toUpperCase()}{!item.translations[c] && " —"}
          </button>
        ))}
      </div>
      {entry ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={L("notif_field_subject")}><input className={inputCls} defaultValue={entry.subject} /></Field>
          <Field label={L("notif_field_preview")}><input className={inputCls} defaultValue={entry.preview} /></Field>
          <div className="md:col-span-2"><Field label={L("notif_field_body")}><textarea rows={4} className={inputCls} defaultValue={entry.body} /></Field></div>
          <Field label={L("notif_field_button")}><input className={inputCls} defaultValue={entry.button} /></Field>
          <Field label={L("notif_field_footer")}><input className={inputCls} defaultValue={entry.footer} /></Field>
          <Field label={L("notif_field_sms")}><input className={inputCls} defaultValue={entry.smsShort} /></Field>
          <Field label={L("notif_field_push_title")}><input className={inputCls} defaultValue={entry.pushTitle} /></Field>
          <div className="md:col-span-2"><Field label={L("notif_field_push_message")}><input className={inputCls} defaultValue={entry.pushMessage} /></Field></div>
        </div>
      ) : (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-800">{L("trans_status_missing")}</div>
      )}
      <div className="mt-4 flex justify-end gap-2 border-t border-border/40 pt-3">
        <button className={btnBase} onClick={onClose}>{L("close")}</button>
        <button className={btnPrimary} onClick={onClose}>{L("save")}</button>
      </div>
    </Modal>
  );
}

// ---------------- Terminology Tab ----------------
function TerminologyTab({ L, terms, setTerms }: { L: LocalLangs; terms: TermRecord[]; setTerms: (fn: (t: TermRecord[]) => TermRecord[]) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={btnPrimary} onClick={() => alert(L("demo_only"))}><Plus className="h-3.5 w-3.5" />{L("term_add")}</button></div>
      <div className="rounded-lg border border-border/60 bg-background/70 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{L("term_col_source")}</th>
              <th className="px-3 py-2 text-left">{L("term_col_context")}</th>
              {ALL_LANGS.map((c) => <th key={c} className="px-2 py-2 text-left text-[10px]">{c.toUpperCase()}</th>)}
              <th className="px-3 py-2 text-left">{L("col_status")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {terms.map((t) => (
              <tr key={t.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{t.source}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{t.context}</td>
                {ALL_LANGS.map((c) => <td key={c} className="px-2 py-2 text-xs">{t.values[c] ?? "—"}</td>)}
                <td className="px-3 py-2 text-xs">{L("term_status_" + t.status)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <button className={btnBase} onClick={() => setTerms((all) => all.map((x) => x.id === t.id ? { ...x, status: "approved" } : x))}>{L("term_approve")}</button>
                    <button className={btnBase} onClick={() => setTerms((all) => all.map((x) => x.id === t.id ? { ...x, status: "archived" } : x))}>{L("term_archive")}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Settings Tab ----------------
function SettingsTab({ L, languages, setLanguages, defaultLang }: { L: LocalLangs; languages: LanguageRecord[]; setLanguages: (fn: (l: LanguageRecord[]) => LanguageRecord[]) => void; defaultLang: LangCode }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {languages.map((l) => (
        <div key={l.code} className="rounded-lg border border-border/60 bg-background/70 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="font-medium">{l.flag} {l.name}</div>
            {l.isDefault && <span className="inline-flex items-center gap-1 text-[10px] text-amber-700"><Star className="h-3 w-3 fill-amber-500" />{L("col_default")}</span>}
          </div>
          <div className="text-xs text-muted-foreground">{l.nativeName} · {l.locale}</div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <div>{L("settings_date")}: <span className="font-mono">{l.dateFormat}</span></div>
            <div>{L("settings_time")}: <span className="font-mono">{l.timeFormat}</span></div>
            <div>{L("settings_number")}: <span className="font-mono">{l.numberFormat}</span></div>
            <div>{L("settings_currency")}: <span className="font-mono">{l.currencyFormat}</span></div>
            <div>{L("settings_fallback")}: <span className="font-mono">{l.fallback.toUpperCase()}</span></div>
            <div>{L("settings_first_day")}: {l.firstDayOfWeek === 0 ? L("day_sun") : L("day_mon")}</div>
          </div>
          <div className="flex flex-wrap gap-1 pt-1 text-[10px] text-muted-foreground">
            <Pill on={l.availableWebsite}>{L("settings_avail_website")}</Pill>
            <Pill on={l.availableStudio}>{L("settings_avail_studio")}</Pill>
            <Pill on={l.availableNotifications}>{L("settings_avail_notif")}</Pill>
            <Pill on={l.availableAdmin}>{L("settings_avail_admin")}</Pill>
          </div>
        </div>
      ))}
    </div>
  );
}
function Pill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={"rounded border px-1.5 py-0.5 " + (on ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" : "border-border/40 bg-muted/30 text-muted-foreground")}>{children}</span>;
}

// ---------------- History Tab ----------------
function HistoryTab({ L, history }: { L: LocalLangs; history: typeof DEMO_HISTORY }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">{L("history_col_version")}</th>
            <th className="px-3 py-2 text-left">{L("col_key")}</th>
            <th className="px-3 py-2 text-left">{L("filter_language")}</th>
            <th className="px-3 py-2 text-left">{L("history_col_prev")}</th>
            <th className="px-3 py-2 text-left">{L("history_col_new")}</th>
            <th className="px-3 py-2 text-left">{L("history_col_date")}</th>
            <th className="px-3 py-2 text-left">{L("history_col_admin")}</th>
            <th className="px-3 py-2 text-left">{L("history_col_action")}</th>
            <th className="px-3 py-2 text-right">{L("col_actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {history.map((h) => (
            <tr key={h.id} className="hover:bg-muted/20">
              <td className="px-3 py-2 font-mono text-xs">{h.id}</td>
              <td className="px-3 py-2 font-mono text-xs">{h.translationKey}</td>
              <td className="px-3 py-2 text-xs">{h.language.toUpperCase()}</td>
              <td className="px-3 py-2 max-w-[200px] truncate" title={h.previousText}>{h.previousText || "—"}</td>
              <td className="px-3 py-2 max-w-[200px] truncate" title={h.newText}>{h.newText}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(h.date)}</td>
              <td className="px-3 py-2 text-xs">{h.admin}</td>
              <td className="px-3 py-2 text-xs">{h.action}</td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-1">
                  <button className={btnBase} onClick={() => alert(h.newText)}>{L("history_preview")}</button>
                  <button className={btnBase} onClick={() => alert(L("demo_only"))}>{L("history_restore")}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Import / Export / Preview ----------------
function ImportModal({ L, onClose }: { L: LocalLangs; onClose: () => void }) {
  return (
    <Modal onClose={onClose} title={L("import_title")}>
      <p className="text-sm text-muted-foreground">{L("import_desc")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat label={L("import_new")} value="12" tone="emerald" />
        <Stat label={L("import_updated")} value="34" tone="sky" />
        <Stat label={L("import_unchanged")} value="480" tone="muted" />
        <Stat label={L("import_conflicts")} value="3" tone="amber" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={btnBase}>JSON</button>
        <button className={btnBase}>CSV</button>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border/40 pt-3">
        <button className={btnBase} onClick={onClose}>{L("close")}</button>
      </div>
    </Modal>
  );
}
function ExportModal({ L, onClose }: { L: LocalLangs; onClose: () => void }) {
  return (
    <Modal onClose={onClose} title={L("export_title")}>
      <p className="text-sm text-muted-foreground">{L("demo_only")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={btnBase}><Download className="h-3.5 w-3.5" />JSON</button>
        <button className={btnBase}><Download className="h-3.5 w-3.5" />CSV</button>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border/40 pt-3">
        <button className={btnBase} onClick={onClose}>{L("close")}</button>
      </div>
    </Modal>
  );
}
function Stat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "sky" | "amber" | "muted" }) {
  const cls = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-700",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    muted: "border-border/60 bg-muted/30 text-muted-foreground",
  }[tone];
  return <div className={"rounded border px-2 py-1.5 " + cls}><div className="text-[10px] uppercase tracking-widest">{label}</div><div className="font-serif text-lg">{value}</div></div>;
}

function PreviewModal({
  L, previewLang, setPreviewLang, translations, onClose,
}: {
  L: LocalLangs; previewLang: LangCode; setPreviewLang: (c: LangCode) => void;
  translations: InterfaceTranslation[]; onClose: () => void;
}) {
  const pick = (key: string) => translations.find((t) => t.key === key)?.values[previewLang] ?? "";
  return (
    <Modal onClose={onClose} title={L("btn_preview")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{L("filter_language")}:</span>
        <select className={inputCls + " max-w-xs"} value={previewLang} onChange={(e) => setPreviewLang(e.target.value as LangCode)}>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <div className="text-[10px] text-muted-foreground mb-3">{L("internal_only")}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <PreviewCard title={L("live_nav")}>
          <div className="flex flex-wrap gap-3 text-sm">
            {["nav.home", "nav.catalog", "nav.studio"].map((k) => <span key={k} className="text-primary underline">{pick(k) || k}</span>)}
          </div>
        </PreviewCard>
        <PreviewCard title={L("live_button")}>
          <button className={btnPrimary}>{pick("home.cta.create") || "Create Greeting"}</button>
        </PreviewCard>
        <PreviewCard title={L("live_card")}>
          <div className="rounded-md border border-border/60 bg-background p-3">
            <div className="font-serif text-lg">{pick("home.hero.title")}</div>
            <div className="mt-1 text-xs text-muted-foreground">{pick("home.gift.title")}</div>
          </div>
        </PreviewCard>
        <PreviewCard title={L("live_validation")}>
          <div className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700">{pick("validation.required")}</div>
        </PreviewCard>
        <PreviewCard title={L("live_notif")}>
          <div className="rounded border border-border/60 bg-background p-2 text-sm shadow">{pick("orders.status.ready")}</div>
        </PreviewCard>
        <PreviewCard title={L("live_mobile")}>
          <div className="mx-auto w-40 rounded-xl border border-border/60 bg-background p-2 text-center text-xs">
            <div className="font-serif text-sm">{pick("home.hero.title")}</div>
            <button className={btnPrimary + " mt-1"}>{pick("home.cta.create")}</button>
          </div>
        </PreviewCard>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border/40 pt-3">
        <button className={btnBase} onClick={onClose}>{L("close")}</button>
      </div>
    </Modal>
  );
}
function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
      <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

// ---------------- Shared Modal ----------------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
      <div className="my-4 w-full max-w-5xl rounded-xl border border-border/60 bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border/40 bg-card px-4 py-3 rounded-t-xl">
          <h2 className="font-serif text-lg">{title}</h2>
          <button className={btnBase} onClick={onClose}><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

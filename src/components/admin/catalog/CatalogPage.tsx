import { useMemo, useState } from "react";
import {
  Plus, RefreshCw, Search, Eye, Pencil, Copy, Archive, Trash2, X, AlertTriangle,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import {
  DEMO_CATALOG, CATALOG_TYPES, CATALOG_CATEGORIES, CATALOG_STATUSES,
  CATALOG_STATUS_TONE, CATALOG_GRADIENTS,
  duplicateCatalogItem, makeBlankCatalogItem, validateCatalog,
  type CatalogItem, type CatalogCategory, type CatalogType, type CatalogStatus,
  type CatalogValidation,
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

type SortKey = "title" | "created" | "credits";

function formatDate(iso: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function CatalogPage() {
  const { lang } = useI18n();
  const L = useLocalCatalog(lang);

  const [items, setItems] = useState<CatalogItem[]>(() => [...DEMO_CATALOG]);
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CatalogCategory>("all");
  const [langFilter, setLangFilter] = useState<"all" | Lang>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CatalogStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CatalogType>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");

  const [viewing, setViewing] = useState<CatalogItem | null>(null);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatalogItem | null>(null);

  const filtered = useMemo(() => {
    void tick;
    const q = query.trim().toLowerCase();
    let list = items.filter((it) => {
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (langFilter !== "all" && it.language !== langFilter) return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (typeFilter !== "all" && it.type !== typeFilter) return false;
      if (q) {
        const hay = `${it.id} ${it.title} ${it.internalName} ${L("cat_" + it.category)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "title": return a.title.localeCompare(b.title);
        case "created": return b.createdAt.localeCompare(a.createdAt);
        case "credits": return b.credits - a.credits;
      }
    });
    return list;
  }, [items, query, categoryFilter, langFilter, statusFilter, typeFilter, sortKey, tick, L]);

  const upsert = (it: CatalogItem) =>
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === it.id);
      if (idx === -1) return [it, ...prev];
      const next = [...prev];
      next[idx] = it;
      return next;
    });

  const doDuplicate = (it: CatalogItem) => setItems((prev) => [duplicateCatalogItem(it), ...prev]);
  const doArchive = (it: CatalogItem) => setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "archived" } : x)));
  const doDelete = (it: CatalogItem) => {
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    setConfirmDelete(null);
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
          <input
            type="search"
            className={`${inputCls} pl-8`}
            placeholder={L("search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className={inputCls} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as "all" | CatalogCategory)}>
          <option value="all">{L("filter_category")}: {L("filter_all")}</option>
          {CATALOG_CATEGORIES.map((c) => (
            <option key={c} value={c}>{L("cat_" + c)}</option>
          ))}
        </select>
        <select className={inputCls} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | CatalogType)}>
          <option value="all">{L("filter_type")}: {L("filter_all")}</option>
          {CATALOG_TYPES.map((t) => (
            <option key={t} value={t}>{L("type_" + t)}</option>
          ))}
        </select>
        <select className={inputCls} value={langFilter} onChange={(e) => setLangFilter(e.target.value as "all" | Lang)}>
          <option value="all">{L("filter_language")}: {L("filter_all")}</option>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | CatalogStatus)}>
          <option value="all">{L("filter_status")}: {L("filter_all")}</option>
          {CATALOG_STATUSES.map((s) => (
            <option key={s} value={s}>{L("status_" + s)}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{L("sort_by")}:</span>
        <select className={`${inputCls} max-w-[220px]`} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="created">{L("sort_created")}</option>
          <option value="title">{L("sort_title")}</option>
          <option value="credits">{L("sort_credits")}</option>
        </select>
        <span className="ml-auto">{filtered.length}</span>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-border/60 lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{L("col_id")}</th>
              <th className="px-3 py-2 text-left">{L("col_preview")}</th>
              <th className="px-3 py-2 text-left">{L("col_title")}</th>
              <th className="px-3 py-2 text-left">{L("col_category")}</th>
              <th className="px-3 py-2 text-left">{L("col_type")}</th>
              <th className="px-3 py-2 text-left">{L("col_language")}</th>
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
              <tr key={it.id} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{it.id}</td>
                <td className="px-3 py-2"><PreviewSquare it={it} /></td>
                <td className="px-3 py-2 font-medium">{it.title}</td>
                <td className="px-3 py-2">{L("cat_" + it.category)}</td>
                <td className="px-3 py-2">{L("type_" + it.type)}</td>
                <td className="px-3 py-2 uppercase">{it.language}</td>
                <td className="px-3 py-2"><StatusPill status={it.status} L={L} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{it.credits}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(it.createdAt, lang)}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button className={btnBase} title={L("act_view")} onClick={() => setViewing(it)}><Eye className="h-3.5 w-3.5" /></button>
                    <button className={btnBase} title={L("act_edit")} onClick={() => setEditing(it)}><Pencil className="h-3.5 w-3.5" /></button>
                    <button className={btnBase} title={L("act_duplicate")} onClick={() => doDuplicate(it)}><Copy className="h-3.5 w-3.5" /></button>
                    <button className={btnBase} title={L("act_archive")} onClick={() => doArchive(it)} disabled={it.status === "archived"}><Archive className="h-3.5 w-3.5" /></button>
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
          <article key={it.id} className="rounded-lg border border-border/60 bg-card/60 p-3">
            <div className="flex gap-3">
              <PreviewSquare it={it} large />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium">{it.title}</div>
                  <StatusPill status={it.status} L={L} />
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{it.id}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {L("cat_" + it.category)} · {L("type_" + it.type)} · {it.language.toUpperCase()}
                </div>
                <div className="mt-1 text-xs">{L("col_credits")}: <b>{it.credits}</b> · {formatDate(it.createdAt, lang)}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-1">
              <button className={btnBase} onClick={() => setViewing(it)}><Eye className="h-3.5 w-3.5" />{L("act_view")}</button>
              <button className={btnBase} onClick={() => setEditing(it)}><Pencil className="h-3.5 w-3.5" />{L("act_edit")}</button>
              <button className={btnBase} onClick={() => doDuplicate(it)}><Copy className="h-3.5 w-3.5" />{L("act_duplicate")}</button>
              <button className={btnBase} onClick={() => doArchive(it)} disabled={it.status === "archived"}><Archive className="h-3.5 w-3.5" />{L("act_archive")}</button>
              <button className={btnDanger} onClick={() => setConfirmDelete(it)}><Trash2 className="h-3.5 w-3.5" />{L("act_delete")}</button>
            </div>
          </article>
        ))}
      </div>

      {viewing && (
        <ViewModal item={viewing} L={L} lang={lang} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} />
      )}
      {editing && (
        <EditModal
          item={editing}
          isNew={!items.some((x) => x.id === editing.id)}
          L={L}
          onClose={() => setEditing(null)}
          onSave={(next) => { upsert(next); setEditing(null); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDelete item={confirmDelete} L={L} onCancel={() => setConfirmDelete(null)} onConfirm={() => doDelete(confirmDelete)} />
      )}
    </div>
  );
}

function PreviewSquare({ it, large }: { it: CatalogItem; large?: boolean }) {
  const size = large ? "h-20 w-20" : "h-10 w-10";
  return (
    <div
      className={`${size} shrink-0 rounded-md border border-border/60`}
      style={{ backgroundImage: CATALOG_GRADIENTS[it.gradientIndex % CATALOG_GRADIENTS.length] }}
      aria-hidden
    />
  );
}

function StatusPill({ status, L }: { status: CatalogStatus; L: LocalCatalog }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${CATALOG_STATUS_TONE[status]}`}>
      {L("status_" + status)}
    </span>
  );
}

function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-2xl"} rounded-xl border border-border/60 bg-card p-5 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ViewModal({ item, L, lang, onClose, onEdit }: { item: CatalogItem; L: LocalCatalog; lang: Lang; onClose: () => void; onEdit: () => void }) {
  return (
    <Modal title={L("view_title")} onClose={onClose} wide>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div
          className="aspect-square rounded-lg border border-border/60"
          style={{ backgroundImage: CATALOG_GRADIENTS[item.gradientIndex % CATALOG_GRADIENTS.length] }}
          aria-hidden
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Section title={L("view_title")}>
            <Field label={L("col_id")} value={item.id} />
            <Field label={L("f_title")} value={item.title} />
            <Field label={L("f_internal_name")} value={item.internalName} />
            <Field label={L("f_category")} value={L("cat_" + item.category)} />
            <Field label={L("f_type")} value={L("type_" + item.type)} />
            <Field label={L("f_language")} value={item.language.toUpperCase()} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{L("f_status")}</span>
              <StatusPill status={item.status} L={L} />
            </div>
            <Field label={L("f_credits")} value={String(item.credits)} />
            <Field label={L("col_created")} value={formatDate(item.createdAt, lang)} />
          </Section>
          <Section title={L("f_description")}>
            <p className="text-sm">{item.description || "—"}</p>
            <div className="pt-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{L("f_tags")}</div>
              <div className="flex flex-wrap gap-1">
                {item.tags.length === 0 ? <span className="text-xs text-muted-foreground">—</span> :
                  item.tags.map((t) => <span key={t} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px]">{t}</span>)}
              </div>
            </div>
            <div className="pt-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{L("f_internal_notes")}</div>
              <p className="text-xs text-muted-foreground">{item.internalNotes || "—"}</p>
            </div>
          </Section>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnBase} onClick={onClose}>{L("act_close")}</button>
        <button type="button" className={btnPrimary} onClick={onEdit}><Pencil className="h-3.5 w-3.5" />{L("act_edit")}</button>
      </div>
    </Modal>
  );
}

function EditModal({ item, isNew, L, onClose, onSave }: {
  item: CatalogItem; isNew: boolean; L: LocalCatalog; onClose: () => void; onSave: (next: CatalogItem) => void;
}) {
  const [draft, setDraft] = useState<CatalogItem>(item);
  const [errors, setErrors] = useState<CatalogValidation>({});
  const [tagsInput, setTagsInput] = useState<string>(item.tags.join(", "));

  const update = <K extends keyof CatalogItem>(k: K, v: CatalogItem[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    const tags = tagsInput.split(",").map((s) => s.trim()).filter(Boolean);
    const next: CatalogItem = { ...draft, tags };
    const e = validateCatalog(next, L);
    setErrors(e);
    if (Object.keys(e).length === 0) onSave(next);
  };

  return (
    <Modal title={isNew ? L("new_title") : L("edit_title")} onClose={onClose} wide>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">{L("f_title")}</span>
          <input className={inputCls} value={draft.title} onChange={(e) => update("title", e.target.value)} />
          {errors.title && <span className="mt-1 block text-xs text-rose-600">{errors.title}</span>}
        </label>
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
            {CATALOG_TYPES.map((t) => <option key={t} value={t}>{L("type_" + t)}</option>)}
          </select>
          {errors.type && <span className="mt-1 block text-xs text-rose-600">{errors.type}</span>}
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{L("f_language")}</span>
          <select className={inputCls} value={draft.language} onChange={(e) => update("language", e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {errors.language && <span className="mt-1 block text-xs text-rose-600">{errors.language}</span>}
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{L("f_status")}</span>
          <select className={inputCls} value={draft.status} onChange={(e) => update("status", e.target.value as CatalogStatus)}>
            {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{L("status_" + s)}</option>)}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">{L("f_description")}</span>
          <textarea rows={3} className={inputCls} value={draft.description} onChange={(e) => update("description", e.target.value)} />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">{L("f_tags")}</span>
          <input className={inputCls} placeholder={L("f_tags_ph")} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">{L("f_internal_notes")}</span>
          <textarea rows={2} className={inputCls} value={draft.internalNotes} onChange={(e) => update("internalNotes", e.target.value)} />
        </label>
        <div className="md:col-span-2">
          <div className="mb-1 text-xs text-muted-foreground">{L("f_preview")}</div>
          <div
            className="h-32 w-full rounded-lg border border-border/60"
            style={{ backgroundImage: CATALOG_GRADIENTS[draft.gradientIndex % CATALOG_GRADIENTS.length] }}
            aria-hidden
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnBase} onClick={onClose}>{L("act_cancel")}</button>
        <button type="button" className={btnPrimary} onClick={submit}>{L("act_save")}</button>
      </div>
    </Modal>
  );
}

function ConfirmDelete({ item, L, onCancel, onConfirm }: { item: CatalogItem; L: LocalCatalog; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal title={L("delete_title")} onClose={onCancel}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
        <div className="text-sm">
          <p>{L("delete_body")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-mono">{item.id}</span> · {item.title}
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
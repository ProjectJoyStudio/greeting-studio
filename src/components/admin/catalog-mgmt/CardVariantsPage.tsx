import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search, Star, Sparkles, TrendingUp } from "lucide-react";

import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";
import { LANGS, useI18n } from "@/lib/i18n";
import type { CardVariant, VariantStatus, Orientation } from "@/lib/admin/catalog-mgmt/types";
import { translationCompleteness } from "@/lib/admin/catalog-mgmt/types";
import {
  CardPreview,
  EmptyState,
  LanguageCompletenessDots,
  Section,
  TaxonomyLabels,
  VariantStatusBadge,
  taxonomyLabel,
  useConfirm,
} from "./shared";

interface Props {
  statusFilter?: VariantStatus | VariantStatus[];
  title?: string;
  subtitle?: string;
}

export function CardVariantsPage({ statusFilter, title, subtitle }: Props) {
  const {
    variants,
    getBackground,
    updateVariant,
    deleteVariant,
    duplicateVariant,
    bulkUpdateVariants,
    taxonomy,
    t,
  } = useCatalogMgmt();
  const { lang } = useI18n();
  const [q, setQ] = useState("");
  const [occasion, setOccasion] = useState("");
  const [recipient, setRecipient] = useState("");
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  const [orientation, setOrientation] = useState<Orientation | "">("");
  const [langFilter, setLangFilter] = useState<"" | "incomplete">("");
  const [status, setStatus] = useState<VariantStatus | "">("");
  const [flagNew, setFlagNew] = useState(false);
  const [flagPop, setFlagPop] = useState(false);
  const [flagRec, setFlagRec] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { ask, dialog } = useConfirm();

  const filtered = useMemo(() => {
    return variants.filter((v) => {
      if (statusFilter) {
        const list = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
        if (!list.includes(v.status)) return false;
      } else if (status && v.status !== status) return false;
      if (q) {
        const s = q.toLowerCase();
        const hit =
          v.internalName.toLowerCase().includes(s) ||
          Object.values(v.translations).some((tr) =>
            (tr?.catalogTitle + " " + tr?.textOnCard + " " + tr?.searchKeywords?.join(" ")).toLowerCase().includes(s),
          );
        if (!hit) return false;
      }
      if (occasion && v.primaryOccasion !== occasion && !v.additionalOccasions.includes(occasion)) return false;
      if (recipient && !v.recipients.includes(recipient)) return false;
      if (style && !v.styles.includes(style)) return false;
      if (mood && !v.mood.includes(mood)) return false;
      if (orientation && v.orientation !== orientation) return false;
      if (langFilter === "incomplete") {
        const anyIncomplete = LANGS.some((l) => translationCompleteness(v.translations[l.code]) !== "complete");
        if (!anyIncomplete) return false;
      }
      if (flagNew && !v.isNew) return false;
      if (flagPop && !v.isPopular) return false;
      if (flagRec && !v.isRecommended) return false;
      return true;
    });
  }, [variants, statusFilter, status, q, occasion, recipient, style, mood, orientation, langFilter, flagNew, flagPop, flagRec]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function bulk(patch: Partial<CardVariant>, msg: string) {
    if (selected.size === 0) return;
    bulkUpdateVariants([...selected], patch);
    setSelected(new Set());
    toast.success(msg);
  }

  return (
    <div className="space-y-4">
      {dialog}
      <Section
        title={title ?? t("cm_cv_title")}
        description={subtitle ?? t("cm_cv_subtitle")}
        actions={
          <Link
            to="/admin/catalog/variants/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("cm_cv_new")}
          </Link>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("cm_search")}
              className="w-full rounded-md border border-border/60 bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_cv_primary_occasion")}</option>
            {taxonomy.occasion.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
          </select>
          <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_cv_recipients")}</option>
            {taxonomy.recipient.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
          </select>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_bg_styles")}</option>
            {taxonomy.style.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
          </select>
          <select value={mood} onChange={(e) => setMood(e.target.value)} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_bg_mood")}</option>
            {taxonomy.mood.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
          </select>
          <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation | "")} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_bg_orientation")}</option>
            {taxonomy.orientation.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
          </select>
          <select value={langFilter} onChange={(e) => setLangFilter(e.target.value as "" | "incomplete")} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_cv_languages")}</option>
            <option value="incomplete">{t("cm_tr_incomplete")}</option>
          </select>
          {!statusFilter && (
            <select value={status} onChange={(e) => setStatus(e.target.value as VariantStatus | "")} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
              <option value="">{t("cm_status")}</option>
              {(["draft", "review", "published", "hidden", "archived"] as VariantStatus[]).map((s) => (
                <option key={s} value={s}>{t(`cm_status_${s}`)}</option>
              ))}
            </select>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={flagNew} onChange={(e) => setFlagNew(e.target.checked)} /> {t("cm_cv_new_badge")}</label>
            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={flagPop} onChange={(e) => setFlagPop(e.target.checked)} /> {t("cm_cv_popular")}</label>
            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={flagRec} onChange={(e) => setFlagRec(e.target.checked)} /> {t("cm_cv_recommended")}</label>
          </div>
        </div>
      </Section>

      {selected.size > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs">
          <span className="font-medium">{selected.size} {t("cm_cv_selected")}</span>
          <button type="button" onClick={() => bulk({ status: "published" }, t("cm_published_toast"))} className="rounded border border-border/60 bg-background px-2 py-1">{t("cm_cv_bulk_publish")}</button>
          <button type="button" onClick={() => bulk({ status: "hidden" }, t("cm_hidden_toast"))} className="rounded border border-border/60 bg-background px-2 py-1">{t("cm_cv_bulk_hide")}</button>
          <button type="button" onClick={() => bulk({ status: "archived" }, t("cm_archived_toast"))} className="rounded border border-border/60 bg-background px-2 py-1">{t("cm_cv_bulk_archive")}</button>
          <button type="button" onClick={() => bulk({ isRecommended: true }, t("cm_saved"))} className="rounded border border-border/60 bg-background px-2 py-1">{t("cm_cv_bulk_mark_recommended")}</button>
          <button type="button" onClick={() => bulk({ isRecommended: false }, t("cm_saved"))} className="rounded border border-border/60 bg-background px-2 py-1">{t("cm_cv_bulk_unmark_recommended")}</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground hover:text-foreground">{t("cm_cancel")}</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={t("cm_cv_empty")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => {
            const bg = getBackground(v.backgroundId);
            const isSel = selected.has(v.id);
            return (
              <div key={v.id} className={`flex flex-col overflow-hidden rounded-xl border bg-card/85 shadow-sm ${isSel ? "border-primary ring-1 ring-primary/40" : "border-border/60"}`}>
                <div className="relative">
                  <CardPreview background={bg} variant={v} lang={lang} />
                  <label className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded border border-white/50 bg-black/40 backdrop-blur">
                    <input type="checkbox" checked={isSel} onChange={() => toggle(v.id)} className="h-3 w-3" />
                  </label>
                  <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                    {v.isNew && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"><Sparkles className="mr-0.5 inline h-3 w-3" />{t("cm_cv_new_badge")}</span>}
                    {v.isPopular && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white"><TrendingUp className="mr-0.5 inline h-3 w-3" />{t("cm_cv_popular")}</span>}
                    {v.isRecommended && <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white"><Star className="mr-0.5 inline h-3 w-3" />{t("cm_cv_recommended")}</span>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{v.internalName}</p>
                    <VariantStatusBadge status={v.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {taxonomyLabel(taxonomy.occasion, v.primaryOccasion, lang)}
                  </p>
                  <TaxonomyLabels items={taxonomy.recipient} keys={v.recipients} lang={lang} />
                  <div className="flex items-center justify-between text-xs">
                    <LanguageCompletenessDots variant={v} />
                    <span className="text-muted-foreground">#{v.displayOrder}</span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2 text-xs">
                    <Link to="/admin/catalog/variants/$id" params={{ id: v.id }} className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50">{t("cm_edit")}</Link>
                    <button
                      type="button"
                      onClick={async () => {
                        const c = await duplicateVariant(v.id);
                        if (c) toast.success(t("cm_duplicated"));
                      }}
                      className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50"
                    >
                      {t("cm_duplicate")}
                    </button>
                    {v.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => {
                          updateVariant(v.id, { status: "published" });
                          toast.success(t("cm_published_toast"));
                        }}
                        className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                      >
                        {t("cm_publish")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        updateVariant(v.id, { status: v.status === "hidden" ? "published" : "hidden" });
                        toast.success(v.status === "hidden" ? t("cm_saved") : t("cm_hidden_toast"));
                      }}
                      className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50"
                    >
                      {v.status === "hidden" ? t("cm_show") : t("cm_hide")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateVariant(v.id, { status: "archived" });
                        toast.success(t("cm_archived_toast"));
                      }}
                      className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50"
                    >
                      {t("cm_archive")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        ask(t("cm_confirm_delete"), () => {
                          deleteVariant(v.id);
                          toast.success(t("cm_deleted"));
                        })
                      }
                      className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive hover:bg-destructive/20"
                    >
                      {t("cm_delete")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
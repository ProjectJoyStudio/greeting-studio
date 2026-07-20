import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { translationCompleteness } from "@/lib/admin/catalog-mgmt/types";
import { CardPreview, EmptyState, Section, VariantStatusBadge, taxonomyLabel } from "./shared";

type FieldKey = "catalogTitle" | "textOnCard" | "shortDescription" | "searchKeywords";
const FIELDS: FieldKey[] = ["catalogTitle", "textOnCard", "shortDescription", "searchKeywords"];

export function MissingTranslationsPage() {
  const { variants, getBackground, updateVariant, taxonomy, t } = useCatalogMgmt();
  const { lang } = useI18n();
  const [langFilter, setLangFilter] = useState<Lang | "">("");
  const [fieldFilter, setFieldFilter] = useState<FieldKey | "">("");

  const rows = useMemo(() => {
    const out: {
      variantId: string;
      missingLangs: Lang[];
      missingFields: { locale: Lang; field: FieldKey }[];
    }[] = [];
    for (const v of variants) {
      const missingLangs: Lang[] = [];
      const missingFields: { locale: Lang; field: FieldKey }[] = [];
      for (const l of LANGS) {
        const tr = v.translations[l.code];
        const c = translationCompleteness(tr);
        if (c !== "complete") missingLangs.push(l.code);
        for (const f of FIELDS) {
          const val = f === "searchKeywords" ? (tr?.searchKeywords?.length ?? 0) : (tr?.[f]?.trim().length ?? 0);
          if (!val) missingFields.push({ locale: l.code, field: f });
        }
      }
      if (missingLangs.length === 0 && missingFields.length === 0) continue;
      if (langFilter && !missingLangs.includes(langFilter)) continue;
      if (fieldFilter && !missingFields.some((m) => m.field === fieldFilter)) continue;
      out.push({ variantId: v.id, missingLangs, missingFields });
    }
    return out;
  }, [variants, langFilter, fieldFilter]);

  return (
    <div className="space-y-4">
      <Section title={t("cm_mt_title")} description={t("cm_mt_subtitle")}>
        <div className="flex flex-wrap gap-2">
          <select value={langFilter} onChange={(e) => setLangFilter(e.target.value as Lang | "")} className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
            <option value="">{t("cm_all")} — {t("cm_mt_missing_langs")}</option>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value as FieldKey | "")} className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
            <option value="">{t("cm_all")} — {t("cm_mt_missing_fields")}</option>
            {FIELDS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </Section>

      {rows.length === 0 ? (
        <EmptyState title={t("cm_no_results")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((r) => {
            const v = variants.find((x) => x.id === r.variantId)!;
            const bg = getBackground(v.backgroundId);
            return (
              <div key={v.id} className="flex gap-3 rounded-xl border border-border/60 bg-card/85 p-3">
                <div className="w-24 shrink-0">
                  <CardPreview background={bg} variant={v} lang={lang} aspect="4 / 5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{v.internalName}</p>
                    <VariantStatusBadge status={v.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{taxonomyLabel(taxonomy.occasion, v.primaryOccasion, lang)}</p>
                  <div className="text-xs">
                    <span className="text-muted-foreground">{t("cm_mt_missing_langs")}: </span>
                    {r.missingLangs.length === 0 ? "—" : r.missingLangs.map((l) => LANGS.find((x) => x.code === l)?.flag).join(", ")}
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">{t("cm_mt_missing_fields")}: </span>
                    {r.missingFields.length === 0 ? "—" : `${r.missingFields.length}`}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                    <Link to="/admin/catalog/variants/$id" params={{ id: v.id }} className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50">
                      {t("cm_mt_open_editor")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        updateVariant(v.id, { internalNotes: (v.internalNotes ?? "") + "\n[reviewed]" });
                        toast.success(t("cm_saved"));
                      }}
                      className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50"
                    >
                      {t("cm_mt_mark_reviewed")}
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
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Layers, Images, Eye, EyeOff, FileText, Languages as LanguagesIcon, Tag, AlertTriangle } from "lucide-react";

import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";
import { LANGS, useI18n } from "@/lib/i18n";
import { translationCompleteness } from "@/lib/admin/catalog-mgmt/types";
import { Section, taxonomyLabel } from "./shared";
import { CardPreview } from "./shared";

export function OverviewPage() {
  const { backgrounds, variants, taxonomy, getBackground, variantsUsingBackground, t } = useCatalogMgmt();
  const { lang } = useI18n();

  const stats = useMemo(() => {
    const publishedN = variants.filter((v) => v.status === "published").length;
    const draftsN = variants.filter((v) => v.status === "draft").length;
    const hiddenN = variants.filter((v) => v.status === "hidden").length;
    let missingTr = 0;
    let noKeywords = 0;
    for (const v of variants) {
      const anyIncomplete = LANGS.some((l) => translationCompleteness(v.translations[l.code]) !== "complete");
      if (anyIncomplete) missingTr += 1;
      const anyKw = Object.values(v.translations).some((tr) => (tr?.searchKeywords?.length ?? 0) > 0);
      if (!anyKw) noKeywords += 1;
    }
    const bgNoVariant = backgrounds.filter((b) => variantsUsingBackground(b.id).length === 0).length;
    return { publishedN, draftsN, hiddenN, missingTr, noKeywords, bgNoVariant };
  }, [variants, backgrounds, variantsUsingBackground]);

  const byOccasion = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of variants) map.set(v.primaryOccasion, (map.get(v.primaryOccasion) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [variants]);

  const byRecipient = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of variants) for (const r of v.recipients) map.set(r, (map.get(r) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [variants]);

  const byLangComplete = useMemo(() => {
    return LANGS.map((l) => {
      const complete = variants.filter((v) => translationCompleteness(v.translations[l.code]) === "complete").length;
      const partial = variants.filter((v) => translationCompleteness(v.translations[l.code]) === "incomplete").length;
      return { lang: l, complete, partial, missing: variants.length - complete - partial };
    });
  }, [variants]);

  const recent = useMemo(
    () => [...variants].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [variants],
  );

  const mostReused = useMemo(
    () =>
      backgrounds
        .map((b) => ({ b, n: variantsUsingBackground(b.id).length }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 4),
    [backgrounds, variantsUsingBackground],
  );

  const cards: { key: string; icon: typeof Layers; value: number; to: string }[] = [
    { key: "cm_ov_total_backgrounds", icon: Images, value: backgrounds.length, to: "/admin/catalog/backgrounds" },
    { key: "cm_ov_total_variants", icon: Layers, value: variants.length, to: "/admin/catalog/variants" },
    { key: "cm_ov_published", icon: Eye, value: stats.publishedN, to: "/admin/catalog/published" },
    { key: "cm_ov_drafts", icon: FileText, value: stats.draftsN, to: "/admin/catalog/drafts" },
    { key: "cm_ov_hidden", icon: EyeOff, value: stats.hiddenN, to: "/admin/catalog/hidden" },
    { key: "cm_ov_missing_translations", icon: LanguagesIcon, value: stats.missingTr, to: "/admin/catalog/translations" },
    { key: "cm_ov_no_keywords", icon: Tag, value: stats.noKeywords, to: "/admin/catalog/translations" },
    { key: "cm_ov_bg_no_variant", icon: AlertTriangle, value: stats.bgNoVariant, to: "/admin/catalog/backgrounds" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.key}
            to={c.to}
            className="rounded-xl border border-border/60 bg-card/85 p-4 transition hover:border-primary/40 hover:bg-card"
          >
            <div className="flex items-center justify-between">
              <c.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-semibold text-foreground">{c.value}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t(c.key)}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("cm_ov_by_occasion")}>
          <BarList items={byOccasion.map(([k, n]) => ({ label: taxonomyLabel(taxonomy.occasion, k, lang), n }))} />
        </Section>
        <Section title={t("cm_ov_by_recipient")}>
          <BarList items={byRecipient.map(([k, n]) => ({ label: taxonomyLabel(taxonomy.recipient, k, lang), n }))} />
        </Section>
      </div>

      <Section title={t("cm_ov_by_language")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byLangComplete.map(({ lang: l, complete, partial, missing }) => {
            const total = complete + partial + missing || 1;
            return (
              <div key={l.code} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{l.label}</span>
                  <span className="text-xs text-muted-foreground">{complete}/{total}</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
                  <div className="bg-emerald-500" style={{ width: `${(complete / total) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(partial / total) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("cm_ov_recent")}>
          <ul className="space-y-2">
            {recent.map((v) => {
              const bg = getBackground(v.backgroundId);
              return (
                <li key={v.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0">
                    <CardPreview background={bg} variant={v} lang={lang} aspect="1 / 1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.internalName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {taxonomyLabel(taxonomy.occasion, v.primaryOccasion, lang)}
                    </p>
                  </div>
                  <Link to="/admin/catalog/variants/$id" params={{ id: v.id }} className="text-xs text-primary hover:underline">
                    {t("cm_edit")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
        <Section title={t("cm_ov_most_reused")}>
          <ul className="space-y-2">
            {mostReused.map(({ b, n }) => (
              <li key={b.id} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0">
                  <CardPreview background={b} lang={lang} aspect="1 / 1" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.internalName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {n} {t("cm_ov_uses")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function BarList({ items }: { items: { label: string; n: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-0.5 flex items-center justify-between text-xs">
            <span className="truncate">{i.label}</span>
            <span className="text-muted-foreground">{i.n}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
            <div className="h-full bg-primary/70" style={{ width: `${(i.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
      {items.length === 0 && <li className="text-xs text-muted-foreground">—</li>}
    </ul>
  );
}
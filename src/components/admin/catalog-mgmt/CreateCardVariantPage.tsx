import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Info } from "lucide-react";

import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import type { Background, CardVariant, Orientation, TextDesign, Translation, VariantStatus } from "@/lib/admin/catalog-mgmt/types";
import { defaultTextDesign, emptyTranslation, translationCompleteness } from "@/lib/admin/catalog-mgmt/types";
import {
  CardPreview,
  Section,
  TaxonomyMultiSelect,
  TagInput,
  VariantStatusBadge,
  taxonomyLabel,
} from "./shared";

const PERSONAL_NAME_HINT = /\b(anna|maria|john|nikolai|valentina|olga|ivan|peter|sarah|david)\b/i;

export function CreateCardVariantPage({ editId, initialBackgroundId }: { editId?: string; initialBackgroundId?: string }) {
  const { getVariant, getBackground, backgrounds, taxonomy, addVariant, updateVariant, duplicateVariant, t } = useCatalogMgmt();
  const { lang } = useI18n();
  const nav = useNavigate();
  const existing = editId ? getVariant(editId) : undefined;

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(existing ? 2 : 1);
  const [previewLang, setPreviewLang] = useState<Lang>(lang);
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop" | "original">("desktop");

  const [form, setForm] = useState<Omit<CardVariant, "id" | "createdAt" | "updatedAt">>(() => ({
    backgroundId: existing?.backgroundId ?? initialBackgroundId ?? "",
    internalName: existing?.internalName ?? "",
    primaryOccasion: existing?.primaryOccasion ?? "",
    additionalOccasions: existing?.additionalOccasions ?? [],
    recipients: existing?.recipients ?? [],
    styles: existing?.styles ?? [],
    visualObjects: existing?.visualObjects ?? [],
    mood: existing?.mood ?? [],
    ageGroup: existing?.ageGroup ?? "all_ages",
    orientation: existing?.orientation ?? "vertical",
    translations: existing?.translations ?? { en: emptyTranslation("en") },
    textDesign: existing?.textDesign ?? defaultTextDesign(),
    displayOrder: existing?.displayOrder ?? 999,
    isNew: existing?.isNew ?? true,
    isPopular: existing?.isPopular ?? false,
    isRecommended: existing?.isRecommended ?? false,
    allowSharing: existing?.allowSharing ?? true,
    allowDownloading: existing?.allowDownloading ?? true,
    status: existing?.status ?? "draft",
    publishAt: existing?.publishAt,
    internalNotes: existing?.internalNotes ?? "",
  }));

  const bg = useMemo(() => (form.backgroundId ? getBackground(form.backgroundId) : undefined), [form.backgroundId, getBackground]);

  const [bgSearch, setBgSearch] = useState("");
  const bgList = useMemo(() => {
    const s = bgSearch.toLowerCase();
    return backgrounds.filter(
      (b) =>
        b.status !== "archived" &&
        (!s || b.internalName.toLowerCase().includes(s) || b.visualStyles.some((k) => k.includes(s)) || b.visualObjects.some((k) => k.includes(s))),
    );
  }, [backgrounds, bgSearch]);

  function setTr(l: Lang, patch: Partial<Translation>) {
    setForm((f) => {
      const prev = f.translations[l] ?? emptyTranslation(l);
      return { ...f, translations: { ...f.translations, [l]: { ...prev, ...patch } } };
    });
  }
  function setTextDesign(patch: Partial<TextDesign>) {
    setForm((f) => ({ ...f, textDesign: { ...f.textDesign, ...patch } }));
  }

  function copyLayoutToAll() {
    // No per-language override implemented in UI beyond textDesign — just toast.
    toast.success(t("cm_tr_copied"));
  }

  function validate(publishing = false): string[] {
    const errs: string[] = [];
    if (!form.backgroundId) errs.push(t("cm_v_bg_required"));
    if (!form.internalName.trim()) errs.push(t("cm_v_internal_required"));
    if (!form.primaryOccasion) errs.push(t("cm_v_occasion_required"));
    if (publishing) {
      const anyComplete = LANGS.some((l) => translationCompleteness(form.translations[l.code]) === "complete");
      if (!anyComplete) errs.push(t("cm_v_at_least_one_language"));
    }
    return errs;
  }

  function save(nextStatus?: VariantStatus) {
    const errs = validate(nextStatus === "published");
    if (errs.length) {
      errs.forEach((e) => toast.error(e));
      return;
    }
    const payload = nextStatus ? { ...form, status: nextStatus } : form;
    if (existing) {
      updateVariant(existing.id, payload);
      toast.success(nextStatus === "published" ? t("cm_published_toast") : t("cm_saved"));
    } else {
      const created = addVariant(payload);
      toast.success(t("cm_saved"));
      nav({ to: "/admin/catalog/variants/$id", params: { id: created.id } });
      return;
    }
    if (!nextStatus) nav({ to: "/admin/catalog/variants" });
  }

  const tr = form.translations[previewLang];
  const hasPersonalName = LANGS.some((l) => {
    const t2 = form.translations[l.code];
    return t2 && PERSONAL_NAME_HINT.test(t2.textOnCard);
  });

  const deviceW = { mobile: 180, tablet: 320, desktop: 480, original: 640 }[device];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 text-xs">
          {(
            [
              [1, "cm_cv_step_bg"],
              [2, "cm_cv_step_class"],
              [3, "cm_cv_step_lang"],
              [4, "cm_cv_step_design"],
              [5, "cm_cv_step_display"],
            ] as const
          ).map(([n, k]) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n)}
              className={`rounded-full border px-3 py-1.5 transition ${
                step === n ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(k)}
            </button>
          ))}
        </div>

        {step === 1 && (
          <Section title={t("cm_cv_step_bg")} description={t("cm_cv_pick_bg")}>
            <div className="mb-3">
              <input
                value={bgSearch}
                onChange={(e) => setBgSearch(e.target.value)}
                placeholder={t("cm_search")}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {bgList.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, backgroundId: b.id, orientation: b.orientation }))}
                  className={`overflow-hidden rounded-lg border text-left transition ${
                    form.backgroundId === b.id ? "border-primary ring-1 ring-primary/40" : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <CardPreview background={b} lang={lang} aspect={b.aspectRatio.replace(":", " / ")} />
                  <div className="p-2">
                    <p className="truncate text-xs font-medium">{b.internalName}</p>
                    <p className="text-[10px] text-muted-foreground">{b.orientation} · {b.aspectRatio}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => nav({ to: "/admin/catalog/backgrounds/new" })}
                className="text-xs text-primary hover:underline"
              >
                {t("cm_bg_new")}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.backgroundId}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {t("cm_next")}
              </button>
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title={t("cm_cv_step_class")}>
            <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("cm_cv_no_personal_names")}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("cm_bg_internal_name") + " *"}>
                <input value={form.internalName} onChange={(e) => setForm({ ...form, internalName: e.target.value })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
              </Field>
              <Field label={t("cm_cv_primary_occasion") + " *"}>
                <select value={form.primaryOccasion} onChange={(e) => setForm({ ...form, primaryOccasion: e.target.value })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                  <option value="">—</option>
                  {taxonomy.occasion.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
                </select>
              </Field>
              <Field label={t("cm_cv_additional_occasions")}>
                <TaxonomyMultiSelect items={taxonomy.occasion} value={form.additionalOccasions} onChange={(v) => setForm({ ...form, additionalOccasions: v })} lang={lang} />
              </Field>
              <Field label={t("cm_cv_recipients")}>
                <TaxonomyMultiSelect items={taxonomy.recipient} value={form.recipients} onChange={(v) => setForm({ ...form, recipients: v })} lang={lang} />
              </Field>
              <Field label={t("cm_cv_style")}>
                <TaxonomyMultiSelect items={taxonomy.style} value={form.styles} onChange={(v) => setForm({ ...form, styles: v })} lang={lang} />
              </Field>
              <Field label={t("cm_cv_mood")}>
                <TaxonomyMultiSelect items={taxonomy.mood} value={form.mood} onChange={(v) => setForm({ ...form, mood: v })} lang={lang} />
              </Field>
              <Field label={t("cm_cv_visual_objects")}>
                <TaxonomyMultiSelect items={taxonomy.visualObject} value={form.visualObjects} onChange={(v) => setForm({ ...form, visualObjects: v })} lang={lang} />
              </Field>
              <Field label={t("cm_cv_age_group")}>
                <select value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                  {taxonomy.ageGroup.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
                </select>
              </Field>
              <Field label={t("cm_cv_orientation")}>
                <select value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value as Orientation })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                  {taxonomy.orientation.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
                </select>
              </Field>
              <Field label={t("cm_cv_internal_notes")}>
                <textarea value={form.internalNotes ?? ""} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} rows={2} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
              </Field>
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section
            title={t("cm_cv_step_lang")}
            actions={
              <button type="button" onClick={copyLayoutToAll} className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs hover:bg-muted/50">
                {t("cm_tr_copy_layout")}
              </button>
            }
          >
            <div className="mb-2 flex items-start gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-2.5 text-xs text-sky-900 dark:text-sky-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("cm_tr_no_auto")}</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {LANGS.map((l) => {
                const c = translationCompleteness(form.translations[l.code]);
                const dot = c === "complete" ? "bg-emerald-500" : c === "incomplete" ? "bg-amber-500" : "bg-slate-300";
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setPreviewLang(l.code)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                      previewLang === l.code ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-background text-muted-foreground"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    {l.label}
                  </button>
                );
              })}
            </div>
            {(() => {
              const trE = form.translations[previewLang] ?? emptyTranslation(previewLang);
              return (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("cm_tr_title")}>
                    <input value={trE.catalogTitle} onChange={(e) => setTr(previewLang, { catalogTitle: e.target.value })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
                  </Field>
                  <Field label={t("cm_tr_short")}>
                    <input value={trE.shortDescription} onChange={(e) => setTr(previewLang, { shortDescription: e.target.value })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
                  </Field>
                  <Field label={t("cm_tr_text_on_card")}>
                    <textarea rows={3} value={trE.textOnCard} onChange={(e) => setTr(previewLang, { textOnCard: e.target.value })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
                  </Field>
                  <Field label={t("cm_tr_keywords")}>
                    <TagInput value={trE.searchKeywords} onChange={(v) => setTr(previewLang, { searchKeywords: v })} />
                  </Field>
                </div>
              );
            })()}
            {hasPersonalName && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{t("cm_cv_no_personal_names")}</span>
              </div>
            )}
          </Section>
        )}

        {step === 4 && (
          <Section title={t("cm_cv_step_design")}>
            <TextDesignControls td={form.textDesign} onChange={setTextDesign} t={t} />
          </Section>
        )}

        {step === 5 && (
          <Section title={t("cm_cv_step_display")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("cm_dp_display_order")}>
                <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
              </Field>
              <Field label={t("cm_status")}>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VariantStatus })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                  {(["draft", "review", "published", "hidden", "archived"] as VariantStatus[]).map((s) => (
                    <option key={s} value={s}>{t(`cm_status_${s}`)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("cm_dp_schedule")}>
                <input type="datetime-local" value={form.publishAt?.slice(0, 16) ?? ""} onChange={(e) => setForm({ ...form, publishAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
              </Field>
              <div className="flex flex-col gap-2 pt-2 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isNew} onChange={(e) => setForm({ ...form, isNew: e.target.checked })} /> {t("cm_dp_mark_new")}</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} /> {t("cm_dp_mark_popular")}</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isRecommended} onChange={(e) => setForm({ ...form, isRecommended: e.target.checked })} /> {t("cm_dp_mark_recommended")}</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.allowSharing} onChange={(e) => setForm({ ...form, allowSharing: e.target.checked })} /> {t("cm_dp_allow_share")}</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.allowDownloading} onChange={(e) => setForm({ ...form, allowDownloading: e.target.checked })} /> {t("cm_dp_allow_download")}</label>
              </div>
            </div>
          </Section>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => save("draft")} className="rounded-md border border-border/60 bg-background px-4 py-2 text-sm hover:bg-muted/50">
            {t("cm_save_draft")}
          </button>
          <button type="button" onClick={() => save()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            {t("cm_save")}
          </button>
          <button type="button" onClick={() => save("published")} className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
            {t("cm_publish")}
          </button>
          {existing && (
            <button
              type="button"
              onClick={() => {
                const c = duplicateVariant(existing.id);
                if (c) {
                  toast.success(t("cm_duplicated"));
                  nav({ to: "/admin/catalog/variants/$id", params: { id: c.id } });
                }
              }}
              className="rounded-md border border-border/60 bg-background px-4 py-2 text-sm hover:bg-muted/50"
            >
              {t("cm_duplicate")}
            </button>
          )}
          <button type="button" onClick={() => nav({ to: "/admin/catalog/variants" })} className="rounded-md border border-border/60 bg-background px-4 py-2 text-sm hover:bg-muted/50">
            {t("cm_cancel")}
          </button>
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-6 lg:h-fit">
        <Section
          title={t("cm_view")}
          actions={<VariantStatusBadge status={form.status} />}
        >
          <div className="mb-2 flex flex-wrap gap-1 text-xs">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setPreviewLang(l.code)}
                className={`rounded border px-2 py-0.5 ${previewLang === l.code ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60"}`}
              >
                {l.flag}
              </button>
            ))}
          </div>
          <div className="mb-2 flex gap-1 text-xs">
            {(["mobile", "tablet", "desktop", "original"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={`rounded border px-2 py-0.5 ${device === d ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60"}`}
              >
                {t(`cm_td_${d}`)}
              </button>
            ))}
          </div>
          <div className="mx-auto" style={{ maxWidth: deviceW }}>
            <CardPreview background={bg} variant={{ ...form } as CardVariant} lang={previewLang} aspect={bg?.aspectRatio?.replace(":", " / ")} textOverride={tr?.textOnCard} />
          </div>
          {bg && (
            <p className="mt-2 truncate text-[10px] text-muted-foreground">
              {taxonomyLabel(taxonomy.occasion, form.primaryOccasion || "—", lang)} · {bg.internalName}
            </p>
          )}
        </Section>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function TextDesignControls({ td, onChange, t }: { td: TextDesign; onChange: (p: Partial<TextDesign>) => void; t: (k: string) => string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NumField label={t("cm_td_position_x") + " %"} value={td.x} onChange={(x) => onChange({ x })} min={0} max={100} />
      <NumField label={t("cm_td_position_y") + " %"} value={td.y} onChange={(y) => onChange({ y })} min={0} max={100} />
      <NumField label={t("cm_td_width") + " %"} value={td.width} onChange={(w) => onChange({ width: w })} min={10} max={100} />
      <label className="block text-xs">
        <span className="mb-1 block text-muted-foreground">{t("cm_td_alignment")}</span>
        <select value={td.alignment} onChange={(e) => onChange({ alignment: e.target.value as TextDesign["alignment"] })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </label>
      <label className="block text-xs">
        <span className="mb-1 block text-muted-foreground">{t("cm_td_font")}</span>
        <select value={td.fontFamily} onChange={(e) => onChange({ fontFamily: e.target.value })} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
          {["Fraunces", "Inter", "Playfair Display", "Cormorant", "Georgia", "system-ui"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
      <NumField label={t("cm_td_size")} value={td.fontSize} onChange={(fontSize) => onChange({ fontSize })} min={12} max={128} />
      <NumField label={t("cm_td_weight")} value={td.fontWeight} onChange={(fontWeight) => onChange({ fontWeight })} min={100} max={900} step={100} />
      <NumField label={t("cm_td_line_height")} value={td.lineHeight} onChange={(lineHeight) => onChange({ lineHeight })} min={0.8} max={2.5} step={0.1} />
      <label className="block text-xs">
        <span className="mb-1 block text-muted-foreground">{t("cm_td_color")}</span>
        <input type="color" value={td.textColor} onChange={(e) => onChange({ textColor: e.target.value })} className="h-9 w-full rounded-md border border-border/60 bg-background px-1" />
      </label>
      <label className="inline-flex items-center gap-2 text-xs">
        <input type="checkbox" checked={td.textShadow} onChange={(e) => onChange({ textShadow: e.target.checked })} />
        {t("cm_td_shadow")}
      </label>
      <NumField label={t("cm_td_overlay") + " %"} value={td.backgroundOverlay} onChange={(backgroundOverlay) => onChange({ backgroundOverlay })} min={0} max={100} />
      <NumField label={t("cm_td_rotation") + "°"} value={td.rotation} onChange={(rotation) => onChange({ rotation })} min={-45} max={45} />
      <NumField label={t("cm_td_max_lines")} value={td.maxLines} onChange={(maxLines) => onChange({ maxLines })} min={1} max={10} />
    </div>
  );
}

function NumField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 flex items-center justify-between text-muted-foreground"><span>{label}</span><span className="tabular-nums text-foreground/70">{value}</span></span>
      <input type="range" min={min} max={max} step={step ?? 1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}
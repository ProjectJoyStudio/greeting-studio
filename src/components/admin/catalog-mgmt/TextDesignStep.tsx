import { useMemo } from "react";
import { AlertTriangle, Check, RotateCcw, Wand2 } from "lucide-react";

import { LANGS, type Lang } from "@/lib/i18n";
import type { TextDesign, Translation } from "@/lib/admin/catalog-mgmt/types";
import { resolveTextDesign, textFitMode } from "@/lib/admin/catalog-mgmt/types";
import { REQUIRED_LOCALES } from "@/lib/translation/types";
import { fitText, fitToDesign, refHeightFor } from "@/lib/text-fit/engine";
import { reportForLang } from "@/lib/text-fit/validate";

const LANG_LABEL: Record<string, string> = { uk: "UA" };
function flagOf(code: Lang) {
  return LANG_LABEL[code] ?? LANGS.find((l) => l.code === code)?.flag ?? code.toUpperCase();
}

export interface TextDesignStepProps {
  base: TextDesign;
  translations: Partial<Record<Lang, Translation>>;
  activeLang: Lang;
  aspectRatio: string | undefined;
  showSafeArea: boolean;
  onShowSafeArea: (v: boolean) => void;
  onActiveLang: (l: Lang) => void;
  onBaseChange: (patch: Partial<TextDesign>) => void;
  onTranslationPatch: (l: Lang, patch: Partial<Translation>) => void;
  t: (k: string) => string;
}

export function TextDesignStep({
  base,
  translations,
  activeLang,
  aspectRatio,
  showSafeArea,
  onShowSafeArea,
  onActiveLang,
  onBaseChange,
  onTranslationPatch,
  t,
}: TextDesignStepProps) {
  const tr = translations[activeLang];
  const mode = textFitMode(tr);
  const effective = resolveTextDesign(base, tr);
  const refHeight = refHeightFor(aspectRatio);

  const reports = useMemo(
    () => REQUIRED_LOCALES.map((l) => reportForLang(l, translations[l], base, aspectRatio)),
    [translations, base, aspectRatio],
  );
  const active = reports.find((r) => r.locale === activeLang);

  /** Compute an automatic layout for one language and store it as its design. */
  function autoFitLang(l: Lang, keepManual = false) {
    const trl = translations[l];
    const text = trl?.textOnCard ?? "";
    if (!text.trim()) {
      onTranslationPatch(l, keepManual ? {} : { autoFit: true, textDesignOverride: undefined });
      return;
    }
    const start = keepManual ? resolveTextDesign(base, trl) : base;
    const fit = fitText({ text, design: start, refHeight });
    if (keepManual) {
      onTranslationPatch(l, { autoFit: false, textDesignOverride: fitToDesign(start, fit, refHeight) });
    } else {
      onTranslationPatch(l, { autoFit: true, textDesignOverride: undefined });
    }
  }

  function resetToAuto(l: Lang) {
    onTranslationPatch(l, { autoFit: true, textDesignOverride: undefined });
  }

  /** Manual edit for the active language — switches it to manual, others untouched. */
  function patchActiveDesign(patch: Partial<TextDesign>) {
    const current = resolveTextDesign(base, tr);
    onTranslationPatch(activeLang, {
      autoFit: false,
      textDesignOverride: { ...current, ...patch },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-900 dark:text-sky-200">
        <span>{t("cm_fit_hint")}</span>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={showSafeArea} onChange={(e) => onShowSafeArea(e.target.checked)} />
          {t("cm_fit_safe_area")}
        </label>
      </div>

      <div className="flex flex-wrap gap-1">
        {REQUIRED_LOCALES.map((code) => {
          const r = reports.find((x) => x.locale === code);
          const manual = textFitMode(translations[code]) === "manual";
          const bad = (r?.issues.length ?? 0) > 0;
          return (
            <button
              key={code}
              type="button"
              onClick={() => onActiveLang(code)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                activeLang === code
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${bad ? "bg-destructive" : manual ? "bg-amber-500" : "bg-emerald-500"}`} />
              {flagOf(code)}
              {bad && <AlertTriangle className="h-3 w-3 text-destructive" />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1">
          {mode === "auto" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Wand2 className="h-3.5 w-3.5 text-amber-500" />}
          {t(mode === "auto" ? "cm_fit_status_auto" : "cm_fit_status_manual")}
        </span>
        {active && active.fit.lines.length > 0 && (
          <span className="text-muted-foreground">
            {t("cm_td_size")}: {Math.round(active.fit.fontSize)} · {t("cm_fit_lines")}: {active.fit.lines.length}
          </span>
        )}
      </div>

      {active && active.issues.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{active.issues.map((i) => t(`cm_fit_issue_${i}`)).join(" · ")}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => autoFitLang(activeLang)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {t("cm_fit_auto_current")}
        </button>
        <button
          type="button"
          onClick={() => REQUIRED_LOCALES.forEach((l) => autoFitLang(l))}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 hover:bg-muted/50"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {t("cm_fit_auto_all")}
        </button>
        <button
          type="button"
          onClick={() => resetToAuto(activeLang)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 hover:bg-muted/50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("cm_fit_reset_current")}
        </button>
      </div>

      <TextDesignControls
        td={effective}
        onChange={(patch) => {
          // The base design keeps the shared styling; the active language stores its own copy.
          onBaseChange(patch);
          if (mode === "manual") patchActiveDesign(patch);
        }}
        onManualChange={patchActiveDesign}
        mode={mode}
        t={t}
      />
    </div>
  );
}

export function TextDesignControls({
  td,
  onChange,
  onManualChange,
  mode,
  t,
}: {
  td: TextDesign;
  onChange: (p: Partial<TextDesign>) => void;
  onManualChange?: (p: Partial<TextDesign>) => void;
  mode?: "auto" | "manual";
  t: (k: string) => string;
}) {
  // Geometry/typography edits pin the language to manual; pure styling stays shared.
  const geo = (p: Partial<TextDesign>) => (onManualChange ? onManualChange(p) : onChange(p));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NumField label={t("cm_td_position_x") + " %"} value={td.x} onChange={(x) => geo({ x })} min={0} max={100} />
      <NumField label={t("cm_td_position_y") + " %"} value={td.y} onChange={(y) => geo({ y })} min={0} max={100} />
      <NumField label={t("cm_td_width") + " %"} value={td.width} onChange={(w) => geo({ width: w })} min={10} max={100} />
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
      <NumField label={t("cm_td_size")} value={td.fontSize} onChange={(fontSize) => geo({ fontSize })} min={12} max={120} />
      <NumField label={t("cm_td_weight")} value={td.fontWeight} onChange={(fontWeight) => onChange({ fontWeight })} min={300} max={900} step={100} />
      <NumField label={t("cm_td_line_height")} value={td.lineHeight} onChange={(lineHeight) => geo({ lineHeight })} min={0.8} max={2.5} step={0.1} />
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
      <NumField label={t("cm_td_max_lines")} value={td.maxLines} onChange={(maxLines) => geo({ maxLines })} min={1} max={10} />
      {mode === "auto" && <p className="col-span-full text-[11px] text-muted-foreground">{t("cm_fit_manual_note")}</p>}
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
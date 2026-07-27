import { useState } from "react";
import { AlertTriangle, Check, Languages, Loader2, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { LANGS, type Lang } from "@/lib/i18n";
import type { Translation } from "@/lib/admin/catalog-mgmt/types";
import { emptyTranslation, translationCompleteness } from "@/lib/admin/catalog-mgmt/types";
import { REQUIRED_LOCALES, SOURCE_LOCALE, type TranslationState } from "@/lib/translation/types";
import { translateFields } from "@/lib/translation/translate.functions";
import { TagInput } from "./shared";

const LANG_LABEL: Record<string, string> = { uk: "UA" };

function flagOf(code: Lang) {
  return LANG_LABEL[code] ?? LANGS.find((l) => l.code === code)?.flag ?? code.toUpperCase();
}

export function TranslationsStep({
  translations,
  activeLang,
  onActiveLang,
  onPatch,
  t,
}: {
  translations: Partial<Record<Lang, Translation>>;
  activeLang: Lang;
  onActiveLang: (l: Lang) => void;
  onPatch: (l: Lang, patch: Partial<Translation>) => void;
  t: (k: string) => string;
}) {
  const runTranslate = useServerFn(translateFields);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Lang, string>>>({});

  const source = translations[SOURCE_LOCALE] ?? emptyTranslation(SOURCE_LOCALE);
  const sourceReady = source.textOnCard.trim().length > 0 || source.catalogTitle.trim().length > 0;

  async function translate(targets: Lang[]) {
    if (busy || !sourceReady) return;
    setBusy(true);
    try {
      const res = await runTranslate({
        data: {
          sourceLocale: SOURCE_LOCALE,
          targetLocales: targets,
          fields: [
            { key: "catalogTitle", text: source.catalogTitle },
            { key: "shortDescription", text: source.shortDescription },
            { key: "textOnCard", text: source.textOnCard },
          ],
        },
      });
      const nextErrors: Partial<Record<Lang, string>> = { ...errors };
      for (const r of res.results) {
        if (!r.ok) {
          nextErrors[r.locale] = t(`cm_tr_err_${r.errorCode ?? "unknown"}`);
          continue;
        }
        delete nextErrors[r.locale];
        const patch: Partial<Translation> = { state: "auto" };
        for (const f of r.fields) {
          if (f.key === "catalogTitle") patch.catalogTitle = f.text;
          if (f.key === "shortDescription") patch.shortDescription = f.text;
          if (f.key === "textOnCard") patch.textOnCard = f.text;
        }
        onPatch(r.locale, patch);
      }
      setErrors(nextErrors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("cm_tr_err_unknown");
      const nextErrors: Partial<Record<Lang, string>> = { ...errors };
      targets.forEach((l) => (nextErrors[l] = msg));
      setErrors(nextErrors);
    } finally {
      setBusy(false);
    }
  }

  const targets = REQUIRED_LOCALES.filter((l) => l !== SOURCE_LOCALE);
  const current = translations[activeLang] ?? emptyTranslation(activeLang);
  const currentState: TranslationState = current.state ?? "empty";
  const isSource = activeLang === SOURCE_LOCALE;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-900 dark:text-sky-200">
        <span>{t("cm_tr_source_hint")}</span>
        <button
          type="button"
          disabled={busy || !sourceReady}
          onClick={() => translate(targets)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
          {t("cm_tr_translate_all")}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {REQUIRED_LOCALES.map((code) => {
          const tr = translations[code];
          const state: TranslationState = tr?.state ?? "empty";
          const complete = translationCompleteness(tr) === "complete";
          const dot =
            state === "confirmed" && complete
              ? "bg-emerald-500"
              : state === "auto" || complete
                ? "bg-amber-500"
                : "bg-slate-300";
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
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {flagOf(code)}
              {errors[code] && <AlertTriangle className="h-3 w-3 text-destructive" />}
            </button>
          );
        })}
      </div>

      {errors[activeLang] && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
          <span>{errors[activeLang]}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => translate([activeLang])}
            className="inline-flex items-center gap-1.5 rounded border border-destructive/40 px-2 py-1 disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            {t("cm_tr_retry")}
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("cm_tr_title")}>
          <input
            value={current.catalogTitle}
            onChange={(e) => onPatch(activeLang, { catalogTitle: e.target.value, state: isSource ? "confirmed" : "auto" })}
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </Field>
        <Field label={t("cm_tr_short")}>
          <input
            value={current.shortDescription}
            onChange={(e) => onPatch(activeLang, { shortDescription: e.target.value, state: isSource ? "confirmed" : "auto" })}
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </Field>
        <Field label={t("cm_tr_text_on_card")}>
          <textarea
            rows={3}
            value={current.textOnCard}
            onChange={(e) => onPatch(activeLang, { textOnCard: e.target.value, state: isSource ? "confirmed" : "auto" })}
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </Field>
        <Field label={t("cm_tr_keywords")}>
          <TagInput value={current.searchKeywords} onChange={(v) => onPatch(activeLang, { searchKeywords: v })} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {t("cm_tr_state")}: {t(`cm_tr_state_${currentState}`)}
        </span>
        {currentState === "confirmed" ? (
          <button
            type="button"
            onClick={() => onPatch(activeLang, { state: "auto" })}
            className="rounded-md border border-border/60 bg-background px-3 py-1.5 hover:bg-muted/50"
          >
            {t("cm_tr_unconfirm")}
          </button>
        ) : (
          <button
            type="button"
            disabled={translationCompleteness(current) !== "complete"}
            onClick={() => onPatch(activeLang, { state: "confirmed" })}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-emerald-700 disabled:opacity-50 dark:text-emerald-300"
          >
            <Check className="h-3.5 w-3.5" />
            {t("cm_tr_confirm")}
          </button>
        )}
      </div>
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
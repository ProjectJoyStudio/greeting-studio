import { useMemo, useState, type ReactNode } from "react";
import { Check, X, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Lang } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n";
import type {
  Background,
  BackgroundStatus,
  CardVariant,
  TaxonomyItem,
  TextDesign,
  Translation,
  VariantStatus,
} from "@/lib/admin/catalog-mgmt/types";
import { backgroundBg, translationCompleteness } from "@/lib/admin/catalog-mgmt/types";
import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";

export const VARIANT_STATUS_TONE: Record<VariantStatus, string> = {
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30",
  review: "bg-sky-500/15 text-sky-700 dark:text-sky-200 border-sky-500/30",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30",
  hidden: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30",
  archived: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-200 border-zinc-500/30",
};
export const BG_STATUS_TONE: Record<BackgroundStatus, string> = {
  draft: VARIANT_STATUS_TONE.draft,
  active: VARIANT_STATUS_TONE.published,
  hidden: VARIANT_STATUS_TONE.hidden,
  archived: VARIANT_STATUS_TONE.archived,
};

export function VariantStatusBadge({ status }: { status: VariantStatus }) {
  const { t } = useCatalogMgmt();
  return (
    <Badge variant="outline" className={cn("border", VARIANT_STATUS_TONE[status])}>
      {t(`cm_status_${status}`)}
    </Badge>
  );
}
export function BgStatusBadge({ status }: { status: BackgroundStatus }) {
  const { t } = useCatalogMgmt();
  return (
    <Badge variant="outline" className={cn("border", BG_STATUS_TONE[status])}>
      {t(`cm_status_${status}`)}
    </Badge>
  );
}

export function taxonomyLabel(items: TaxonomyItem[], key: string, lang: Lang): string {
  const it = items.find((i) => i.key === key);
  if (!it) return key;
  return (it.names[lang] || it.names.en || it.key) as string;
}

export function TaxonomyLabels({
  items,
  keys,
  lang,
  max = 3,
}: {
  items: TaxonomyItem[];
  keys: string[];
  lang: Lang;
  max?: number;
}) {
  const shown = keys.slice(0, max);
  const extra = keys.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((k) => (
        <Badge key={k} variant="secondary" className="text-[10px] font-normal">
          {taxonomyLabel(items, k, lang)}
        </Badge>
      ))}
      {extra > 0 && (
        <Badge variant="outline" className="text-[10px] font-normal">
          +{extra}
        </Badge>
      )}
    </div>
  );
}

export function LanguageCompletenessDots({ variant }: { variant: CardVariant }) {
  return (
    <div className="flex items-center gap-1">
      {LANGS.map((l) => {
        const c = translationCompleteness(variant.translations[l.code]);
        const cls =
          c === "complete"
            ? "bg-emerald-500"
            : c === "incomplete"
              ? "bg-amber-500"
              : "bg-slate-300 dark:bg-slate-600";
        return (
          <span
            key={l.code}
            title={`${l.label} — ${c}`}
            className={cn("inline-block h-2 w-2 rounded-full", cls)}
          />
        );
      })}
    </div>
  );
}

/** Live-render a card preview (background + rendered greeting text overlay). */
export function CardPreview({
  background,
  variant,
  lang,
  className,
  aspect,
  design,
  textOverride,
}: {
  background: Background | undefined;
  variant?: Pick<CardVariant, "textDesign" | "translations" | "orientation"> & Partial<CardVariant>;
  lang: Lang;
  className?: string;
  aspect?: string; // css aspect-ratio, e.g. "4 / 5"
  design?: TextDesign;
  textOverride?: string;
}) {
  const td = design ?? variant?.textDesign;
  const tr: Translation | undefined = variant?.translations?.[lang];
  const fallback = variant?.translations
    ? Object.values(variant.translations).find((x) => x?.textOnCard?.trim())
    : undefined;
  const text = textOverride ?? tr?.textOnCard ?? fallback?.textOnCard ?? "";
  const ratio = aspect ?? (background?.aspectRatio ? background.aspectRatio.replace(":", " / ") : "4 / 5");
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-xl border border-border/60 bg-slate-100 dark:bg-slate-900", className)}
      style={{ aspectRatio: ratio, background: backgroundBg(background) }}
    >
      {td && text && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${td.x}%`,
            top: `${td.y}%`,
            width: `${td.width}%`,
            transform: `rotate(${td.rotation}deg)`,
          }}
        >
          {td.backgroundOverlay > 0 && (
            <div
              className="absolute inset-0 -m-2 rounded-md"
              style={{ background: `rgba(0,0,0,${td.backgroundOverlay / 100})` }}
            />
          )}
          <div
            className="relative"
            style={{
              color: td.textColor,
              fontFamily: td.fontFamily,
              fontSize: `clamp(12px, ${td.fontSize / 6}vw, ${td.fontSize}px)`,
              fontWeight: td.fontWeight,
              lineHeight: td.lineHeight,
              textAlign: td.alignment,
              textShadow: td.textShadow ? "0 2px 12px rgba(0,0,0,.55)" : "none",
              display: "-webkit-box",
              WebkitLineClamp: td.maxLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

/** Simple multi-select popover; keys are internal, labels are localized taxonomy names. */
export function TaxonomyMultiSelect({
  items,
  value,
  onChange,
  lang,
  placeholder,
}: {
  items: TaxonomyItem[];
  value: string[];
  onChange: (v: string[]) => void;
  lang: Lang;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = useMemo(() => {
    if (value.length === 0) return placeholder ?? "—";
    return value
      .slice(0, 3)
      .map((k) => taxonomyLabel(items, k, lang))
      .join(", ") + (value.length > 3 ? ` +${value.length - 3}` : "");
  }, [value, items, lang, placeholder]);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-left text-sm hover:border-primary/50"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border/60 bg-popover p-1 shadow-lg">
            {items.map((it) => {
              const checked = value.includes(it.key);
              return (
                <button
                  type="button"
                  key={it.key}
                  onClick={() =>
                    onChange(checked ? value.filter((v) => v !== it.key) : [...value, it.key])
                  }
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span>{taxonomyLabel(items, it.key, lang)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function TaxonomySelect({
  items,
  value,
  onChange,
  lang,
  placeholder,
  allowEmpty,
}: {
  items: TaxonomyItem[];
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
    >
      {allowEmpty && <option value="">{placeholder ?? "—"}</option>}
      {items.map((it) => (
        <option key={it.key} value={it.key}>
          {taxonomyLabel(items, it.key, lang)}
        </option>
      ))}
    </select>
  );
}

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const commit = () => {
    const s = input.trim();
    if (!s) return;
    if (!value.includes(s)) onChange([...value, s]);
    setInput("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1.5">
      {value.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded bg-muted/70 px-1.5 py-0.5 text-xs"
        >
          {v}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onChange(value.filter((x) => x !== v))}
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !input && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="min-w-[8ch] flex-1 border-0 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/85 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

/** Simple accessible confirm dialog. */
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    body?: string;
    onOk?: () => void;
  }>({ open: false, title: "" });
  const ask = (title: string, onOk: () => void, body?: string) =>
    setState({ open: true, title, body, onOk });
  const dialog = state.open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-5 shadow-xl">
        <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">{state.title}</h3>
        {state.body && <p className="mt-2 text-sm text-muted-foreground">{state.body}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setState({ ...state, open: false })}
            className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              state.onOk?.();
              setState({ ...state, open: false });
            }}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return { ask, dialog };
}
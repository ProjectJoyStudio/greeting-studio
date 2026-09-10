import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  MEMORY_BOOK_DECORATION_CATEGORIES,
  categoryLabelKey,
  type MemoryBookDecoration,
  type MemoryBookDecorationCategory,
} from "@/lib/memory-book/decorations";
import { listMemoryBookDecorations } from "@/lib/memory-book/decorations.functions";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

/**
 * Decorations offered for ONE internal page of ONE Memory Book. Stage 1 shows
 * the library only — nothing on the page is changed, saved or charged here.
 */
export function MemoryBookDecorations({
  bookId,
  pageIndex,
  onClose,
  onPick,
}: {
  bookId: string;
  pageIndex: number;
  onClose: () => void;
  /** Adds the chosen decoration to the page the customer is working on. */
  onPick?: (decoration: MemoryBookDecoration) => void;
}) {
  const { t } = useI18n();
  const load = useServerFn(listMemoryBookDecorations);

  const [decorations, setDecorations] = useState<MemoryBookDecoration[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<MemoryBookDecorationCategory | "all">("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load({ data: undefined })
      .then((res) => {
        if (alive) setDecorations(res.decorations);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // The library is the same for every page; the book and page stay untouched.
  }, [load, bookId]);

  const shown = useMemo(
    () => (category === "all" ? decorations : decorations.filter((d) => d.category === category)),
    [decorations, category],
  );

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4 text-left">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{t("mbdec_title")}</h3>
          <p className="text-sm text-muted-foreground">{t("mbdec_hint")}</p>
          <p className="text-xs text-muted-foreground">
            {fill(t("mbdec_page"), { n: pageIndex + 1 })}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t("mbdec_close")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category === "all" ? "secondary" : "outline"}
          onClick={() => setCategory("all")}
        >
          {t("mbdec_all")}
        </Button>
        {MEMORY_BOOK_DECORATION_CATEGORIES.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "secondary" : "outline"}
            onClick={() => setCategory(c)}
          >
            {t(categoryLabelKey(c))}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("mbdec_loading")}</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("mbdec_empty")}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
          {shown.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                disabled={!onPick}
                onClick={() => onPick?.(d)}
                title={d.name}
                aria-label={d.name}
                className="flex aspect-square w-full items-center justify-center rounded-xl border border-border/60 bg-background p-2 transition hover:border-primary disabled:cursor-default"
              >
                {d.url ? (
                  <img src={d.url} alt={d.name} className="max-h-full max-w-full object-contain" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

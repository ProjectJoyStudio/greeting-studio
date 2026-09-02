// Shared greeting-text mode chooser for the Greeting Card editor.
// Exactly the controls that already lived on Page 1, so Page 2 can offer the
// very same "create greeting from keywords" flow without a second AI system.

import { Loader2, Wand2 } from "lucide-react";
import type { GreetingMode } from "@/lib/greeting-card/types";
import { useI18n } from "@/lib/i18n";

export function GreetingKeywordsPanel({
  mode,
  onModeChange,
  keywords,
  onKeywordsChange,
  composing,
  onCompose,
}: {
  mode: GreetingMode;
  onModeChange: (mode: GreetingMode) => void;
  keywords: string;
  onKeywordsChange: (value: string) => void;
  composing: boolean;
  onCompose: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <div>
        <span className="mb-2 block text-sm font-medium text-foreground">{t("gc_mode_label")}</span>
        <div className="flex flex-wrap gap-2">
          {(["manual", "keywords"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                mode === m
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(m === "manual" ? "gc_mode_manual" : "gc_mode_keywords")}
            </button>
          ))}
        </div>
      </div>

      {mode === "keywords" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">{t("gc_keywords_label")}</label>
          <input
            value={keywords}
            onChange={(e) => onKeywordsChange(e.target.value)}
            placeholder={t("gc_keywords_ph")}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <button
            type="button"
            onClick={onCompose}
            disabled={composing}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
          >
            {composing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {t("gc_compose_btn")}
          </button>
        </div>
      )}
    </>
  );
}

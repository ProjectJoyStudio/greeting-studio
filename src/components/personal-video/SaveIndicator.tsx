import { Check, CloudOff, Loader2, RotateCcw } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { SaveState } from "@/lib/personal-video/order";

/** Quiet, never interrupting: the small saving state of the current order. */
export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  const { t } = useI18n();
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("pvo_saving")}
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-emerald-600" /> {t("pvo_saved")}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
    >
      <CloudOff className="h-3.5 w-3.5" /> {t("pvo_save_failed")}
      <RotateCcw className="h-3.5 w-3.5" />
    </button>
  );
}

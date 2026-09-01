import { Coins } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { creditLabel } from "@/lib/credits/i18n";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";

/**
 * Compact, mobile-friendly view of the two separate balances.
 * Display only — spending logic is unchanged and still uses Bonus Credits.
 */
export function CreditBalanceBreakdown({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const { balance, purchased, total } = useCreditBalance();

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-sm ${className}`}
    >
      <span className="inline-flex items-center gap-2 font-semibold">
        <Coins className="h-4 w-4 text-primary" />
        {creditLabel(lang, "total")}: {total}
      </span>
      <span className="text-xs text-muted-foreground">
        {creditLabel(lang, "yours")}: {purchased}
      </span>
      <span className="text-xs text-muted-foreground">
        {creditLabel(lang, "bonus")}: {balance}
      </span>
    </div>
  );
}

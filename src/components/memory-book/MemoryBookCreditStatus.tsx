import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";
import { getMemoryBookAccess } from "@/lib/memory-book/packages.functions";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

/**
 * A calm status line for the whole creation workflow of ONE book: the
 * customer's real balance, what this particular book has cost so far, and the
 * way to the existing credit purchase page.
 */
export function MemoryBookCreditStatus({
  bookId,
  creditsSpent,
}: {
  bookId: string;
  /** Known value from the page, used until the fresh one arrives. */
  creditsSpent?: number;
}) {
  const { t } = useI18n();
  const { total, loading } = useCreditBalance();
  const access = useServerFn(getMemoryBookAccess);

  const spendQuery = useQuery({
    queryKey: ["memory-book", "spend", bookId],
    queryFn: () => access({ data: { bookId } }),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
  const spent = spendQuery.data?.book?.creditsSpent ?? creditsSpent ?? 0;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1 text-sm">
        <span className="inline-flex items-center gap-2 font-medium">
          <Coins className="h-4 w-4 text-primary" aria-hidden />
          {fill(t("mbc_your_credits"), { n: loading ? "…" : total })}
        </span>
        <span className="text-muted-foreground">
          {fill(t("mbc_spent_on_book"), { n: spent })}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/memory-book-packages" search={{ book: bookId }}>
            {t("mbc_buy_credits")}
          </Link>
        </Button>
        {/* Same book, same identity: only the additional leaves section is the target. */}
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/memory-book-packages" search={{ book: bookId }} hash="extra-leaves">
            {t("mbl_add_leaves")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

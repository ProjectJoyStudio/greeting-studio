import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";
import { creditWord } from "@/lib/credits/i18n";
import { CreditBalanceBreakdown } from "@/components/credits/CreditBalanceBreakdown";

export const Route = createFileRoute("/dashboard/credits")({
  component: CreditsPage,
});

interface Txn {
  id: string;
  txn_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

async function fetchTransactions(): Promise<Txn[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from("credit_transactions")
    .select("id, txn_type, amount, balance_after, description, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as Txn[];
}

function CreditsPage() {
  const { t, lang } = useI18n();
  const { balance, isTest } = useCreditBalance();
  const txns = useQuery({ queryKey: ["credit-transactions"], queryFn: fetchTransactions });

  return (
    <div>
      <DashboardPageHeader titleKey="credits_title" subtitleKey="credits_sub" />

      <CreditBalanceBreakdown className="mt-6" />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/70 p-5">
        <table className="w-full text-left text-sm">
          <tbody>
            {(txns.data ?? []).map((tx) => (
              <tr key={tx.id} className="border-b border-border/40 last:border-0">
                <td className="py-2 pr-4 text-xs text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-xs">{tx.description ?? tx.txn_type}</td>
                <td
                  className={`py-2 pr-4 text-right font-medium ${
                    tx.amount < 0 ? "text-destructive" : "text-emerald-600"
                  }`}
                >
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                </td>
                <td className="py-2 text-right text-xs text-muted-foreground">{tx.balance_after}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(txns.data?.length ?? 0) === 0 && !txns.isLoading && (
          <p className="py-4 text-sm text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const CREDIT_BALANCE_KEY = ["credit-wallet"] as const;

export interface CreditWalletState {
  /** Bonus Credits — the balance every existing product already spends. */
  balance: number;
  /** Your Credits — customer-owned purchased credits (not spendable yet). */
  purchased: number;
  isTest: boolean;
}

async function fetchWallet(): Promise<CreditWalletState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { balance: 0, purchased: 0, isTest: false };
  const { data } = await supabase
    .from("credit_wallets")
    .select("balance, purchased_balance, is_test")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const row = data as { balance: number; purchased_balance: number | null; is_test: boolean } | null;
  return {
    balance: row?.balance ?? 0,
    purchased: row?.purchased_balance ?? 0,
    isTest: row?.is_test ?? false,
  };
}

/**
 * One shared wallet read for the whole site: every page shows the same
 * balance and reacts instantly whenever credits are taken or returned.
 */
export function useCreditBalance() {
  const query = useQuery({
    queryKey: CREDIT_BALANCE_KEY,
    queryFn: fetchWallet,
    staleTime: 5_000,
  });
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CREDIT_BALANCE_KEY }),
    [queryClient],
  );
  const balance = query.data?.balance ?? 0;
  const purchased = query.data?.purchased ?? 0;
  return {
    balance,
    purchased,
    total: balance + purchased,
    isTest: query.data?.isTest ?? false,
    loading: query.isLoading,
    refresh,
  };
}

/** Lets any flow push a fresh balance everywhere after a charge or refund. */
export function useRefreshCreditBalance() {
  const queryClient = useQueryClient();
  return useCallback(
    (balance?: number) => {
      if (typeof balance === "number") {
        queryClient.setQueryData(CREDIT_BALANCE_KEY, (prev: CreditWalletState | undefined) => ({
          balance,
          purchased: prev?.purchased ?? 0,
          isTest: prev?.isTest ?? false,
        }));
      }
      void queryClient.invalidateQueries({ queryKey: CREDIT_BALANCE_KEY });
    },
    [queryClient],
  );
}

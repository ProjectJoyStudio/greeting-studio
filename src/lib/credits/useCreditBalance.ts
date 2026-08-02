import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const CREDIT_BALANCE_KEY = ["credit-wallet"] as const;

export interface CreditWalletState {
  balance: number;
  isTest: boolean;
}

async function fetchWallet(): Promise<CreditWalletState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { balance: 0, isTest: false };
  const { data } = await supabase
    .from("credit_wallets")
    .select("balance, is_test")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const row = data as { balance: number; is_test: boolean } | null;
  return { balance: row?.balance ?? 0, isTest: row?.is_test ?? false };
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
  return {
    balance: query.data?.balance ?? 0,
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
          isTest: prev?.isTest ?? false,
        }));
      }
      void queryClient.invalidateQueries({ queryKey: CREDIT_BALANCE_KEY });
    },
    [queryClient],
  );
}

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** Reads the signed-in user's credit balance. Signed-out users see 0. */
export function useCreditBalance() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setBalance(0);
        return;
      }
      const { data } = await supabase
        .from("credit_wallets")
        .select("balance")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      setBalance(data?.balance ?? 0);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { balance, loading, refresh: load };
}
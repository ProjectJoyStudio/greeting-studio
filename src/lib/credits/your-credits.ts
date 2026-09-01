// Your Credits — admin-only read access over the existing wallet/ledger tables.
// Every function below is rejected by the database unless the caller is an
// administrator (SECURITY DEFINER functions check `is_admin`).
import { supabase } from "@/integrations/supabase/client";

export interface CreditAccountRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  purchased_balance: number;
  bonus_balance: number;
  total_balance: number;
}

export interface PurchasedTxnRow {
  id: string;
  user_id: string;
  email: string | null;
  txn_type: string;
  amount: number;
  balance_before: number | null;
  balance_after: number;
  source: string | null;
  status: string;
  reference_id: string | null;
  order_id: string | null;
  description: string | null;
  created_at: string;
}

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listCreditAccounts(): Promise<CreditAccountRow[]> {
  return unwrap<CreditAccountRow[]>(await rpc("admin_list_credit_accounts")) ?? [];
}

export async function listPurchasedHistory(userId?: string | null): Promise<PurchasedTxnRow[]> {
  return (
    unwrap<PurchasedTxnRow[]>(
      await rpc("admin_purchased_credit_history", { _user_id: userId ?? null, _limit: 200 }),
    ) ?? []
  );
}

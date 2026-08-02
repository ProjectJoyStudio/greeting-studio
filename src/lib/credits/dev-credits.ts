// Developer Test Credits — thin client over the admin-only database actions.
// Every function below is rejected by the database unless the caller is an
// administrator, so the panel can be used safely from the browser.
import { supabase } from "@/integrations/supabase/client";

export interface TestAccountRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_dev_test_account: boolean;
  balance: number;
  is_test: boolean;
}

export interface TestTxnRow {
  id: string;
  user_id: string;
  email: string | null;
  txn_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const rpc = supabase.rpc.bind(supabase) as (
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listTestAccounts(): Promise<TestAccountRow[]> {
  return unwrap<TestAccountRow[]>(await rpc("admin_list_test_accounts")) ?? [];
}

export async function listTestHistory(userId?: string | null): Promise<TestTxnRow[]> {
  return (
    unwrap<TestTxnRow[]>(
      await rpc("admin_test_credit_history", { _user_id: userId ?? null, _limit: 200 }),
    ) ?? []
  );
}

export async function adjustTestCredits(
  userId: string,
  amount: number,
  reason?: string,
): Promise<number> {
  return unwrap<number>(
    await rpc("admin_adjust_test_credits", { _user_id: userId, _amount: amount, _reason: reason ?? null }),
  );
}

export async function resetTestCredits(userId: string): Promise<number> {
  return unwrap<number>(await rpc("admin_reset_test_credits", { _user_id: userId }));
}

export async function setDevTestAccount(userId: string, enabled: boolean): Promise<void> {
  unwrap(await rpc("admin_set_dev_test_account", { _user_id: userId, _enabled: enabled }));
}

ALTER TABLE public.credit_wallets
  ADD COLUMN IF NOT EXISTS purchased_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_lifetime_purchased integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_lifetime_spent integer NOT NULL DEFAULT 0;

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS bucket text NOT NULL DEFAULT 'bonus',
  ADD COLUMN IF NOT EXISTS balance_before integer,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS reference_id text;

DO $$ BEGIN
  ALTER TABLE public.credit_transactions
    ADD CONSTRAINT credit_transactions_bucket_check CHECK (bucket IN ('bonus','purchased'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_ct_user_bucket_created
  ON public.credit_transactions (user_id, bucket, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_list_credit_accounts()
RETURNS TABLE(user_id uuid, email text, display_name text, purchased_balance integer, bonus_balance integer, total_balance integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT p.id, u.email::text, p.display_name,
         COALESCE(w.purchased_balance, 0),
         COALESCE(w.balance, 0),
         COALESCE(w.purchased_balance, 0) + COALESCE(w.balance, 0)
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.credit_wallets w ON w.user_id = p.id
   ORDER BY u.email;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_purchased_credit_history(_user_id uuid DEFAULT NULL, _limit integer DEFAULT 100)
RETURNS TABLE(id uuid, user_id uuid, email text, txn_type credit_txn_type, amount integer,
              balance_before integer, balance_after integer, source text, status text,
              reference_id text, order_id uuid, description text, created_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT t.id, t.user_id, u.email::text, t.txn_type, t.amount, t.balance_before, t.balance_after,
         t.source, t.status, t.reference_id, t.order_id, t.description, t.created_at
    FROM public.credit_transactions t
    JOIN auth.users u ON u.id = t.user_id
   WHERE t.bucket = 'purchased'
     AND (_user_id IS NULL OR t.user_id = _user_id)
   ORDER BY t.created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 500));
END; $$;

REVOKE ALL ON FUNCTION public.admin_list_credit_accounts() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_purchased_credit_history(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_credit_accounts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_purchased_credit_history(uuid, integer) TO authenticated, service_role;
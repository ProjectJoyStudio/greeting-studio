
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_dev_test_account boolean NOT NULL DEFAULT false;
ALTER TABLE public.credit_wallets ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_set_dev_test_account(_user_id uuid, _enabled boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles SET is_dev_test_account = _enabled WHERE id = _user_id;
  INSERT INTO public.credit_wallets (user_id, is_test) VALUES (_user_id, _enabled)
    ON CONFLICT (user_id) DO UPDATE SET is_test = _enabled;
  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, new_data)
  VALUES (auth.uid(), 'dev_test_account.set', 'profile', _user_id::text,
          jsonb_build_object('enabled', _enabled));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_test_credits(_user_id uuid, _amount integer, _reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wallet public.credit_wallets%ROWTYPE;
  v_new integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'amount_required'; END IF;

  INSERT INTO public.credit_wallets (user_id, is_test) VALUES (_user_id, true)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;

  v_new := GREATEST(0, v_wallet.balance + _amount);
  UPDATE public.credit_wallets
     SET balance = v_new,
         is_test = true,
         lifetime_purchased = lifetime_purchased + GREATEST(0, _amount)
   WHERE id = v_wallet.id;
  UPDATE public.profiles SET is_dev_test_account = true WHERE id = _user_id;

  INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata)
  VALUES (v_wallet.id, _user_id, 'manual_adjustment', v_new - v_wallet.balance, v_new,
          COALESCE(_reason, 'Developer test credits adjustment'),
          jsonb_build_object('test_credits', true, 'admin_id', auth.uid()));

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, previous_data, new_data)
  VALUES (auth.uid(), 'test_credits.adjusted', 'credit_wallet', v_wallet.id::text,
          jsonb_build_object('balance', v_wallet.balance),
          jsonb_build_object('balance', v_new, 'amount', _amount, 'reason', _reason));
  RETURN v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reset_test_credits(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wallet public.credit_wallets%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF NOT v_wallet.is_test THEN RAISE EXCEPTION 'not_a_test_wallet'; END IF;

  UPDATE public.credit_wallets SET balance = 0, reserved = 0 WHERE id = v_wallet.id;
  INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata)
  VALUES (v_wallet.id, _user_id, 'manual_adjustment', -v_wallet.balance, 0,
          'Developer test credits reset', jsonb_build_object('test_credits', true, 'admin_id', auth.uid()));
  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, previous_data, new_data)
  VALUES (auth.uid(), 'test_credits.reset', 'credit_wallet', v_wallet.id::text,
          jsonb_build_object('balance', v_wallet.balance), jsonb_build_object('balance', 0));
  RETURN 0;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_test_accounts()
RETURNS TABLE(user_id uuid, email text, display_name text, is_dev_test_account boolean, balance integer, is_test boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT p.id, u.email::text, p.display_name, p.is_dev_test_account,
         COALESCE(w.balance, 0), COALESCE(w.is_test, false)
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.credit_wallets w ON w.user_id = p.id
   ORDER BY p.is_dev_test_account DESC, u.email;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_test_credit_history(_user_id uuid DEFAULT NULL, _limit integer DEFAULT 100)
RETURNS TABLE(id uuid, user_id uuid, email text, txn_type credit_txn_type, amount integer, balance_after integer, description text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT t.id, t.user_id, u.email::text, t.txn_type, t.amount, t.balance_after, t.description, t.created_at
    FROM public.credit_transactions t
    JOIN public.credit_wallets w ON w.id = t.wallet_id
    JOIN auth.users u ON u.id = t.user_id
   WHERE w.is_test AND (_user_id IS NULL OR t.user_id = _user_id)
   ORDER BY t.created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 500));
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_set_dev_test_account(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_test_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_test_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_test_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_test_credit_history(uuid, integer) TO authenticated;

-- Seed: the existing super admin becomes a developer test account with 500 test credits.
INSERT INTO public.credit_wallets (user_id, balance, is_test, lifetime_purchased)
VALUES ('ddb9c1b8-8531-4371-a5f0-ef1f10089632', 500, true, 500)
ON CONFLICT (user_id) DO UPDATE SET balance = 500, is_test = true;

UPDATE public.profiles SET is_dev_test_account = true WHERE id = 'ddb9c1b8-8531-4371-a5f0-ef1f10089632';

INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata)
SELECT w.id, w.user_id, 'manual_adjustment', 500, 500, 'Initial developer test credits',
       jsonb_build_object('test_credits', true)
  FROM public.credit_wallets w
 WHERE w.user_id = 'ddb9c1b8-8531-4371-a5f0-ef1f10089632';

-- Memory Book — Stage 1: purchased book projects + prepared credit purchase orders

CREATE TABLE IF NOT EXISTS public.memory_book_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_code text NOT NULL,
  leaves integer NOT NULL,
  internal_pages integer NOT NULL,
  video_capacity integer NOT NULL,
  credits_spent integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  purchase_key text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '21 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, purchase_key)
);

GRANT SELECT ON public.memory_book_projects TO authenticated;
GRANT ALL ON public.memory_book_projects TO service_role;
ALTER TABLE public.memory_book_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memory_book_projects_owner_read" ON public.memory_book_projects;
CREATE POLICY "memory_book_projects_owner_read" ON public.memory_book_projects
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.credit_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits >= 20 AND credits <= 1000),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  provider text,
  provider_reference text,
  bonus_credits_granted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

GRANT SELECT ON public.credit_purchase_orders TO authenticated;
GRANT ALL ON public.credit_purchase_orders TO service_role;
ALTER TABLE public.credit_purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_purchase_orders_owner_read" ON public.credit_purchase_orders;
CREATE POLICY "credit_purchase_orders_owner_read" ON public.credit_purchase_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.purchase_memory_book_package(
  _user_id uuid,
  _package_code text,
  _price integer,
  _leaves integer,
  _pages integer,
  _videos integer,
  _purchase_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
  _existing public.memory_book_projects%ROWTYPE;
  _from_purchased integer;
  _from_bonus integer;
  _book_id uuid;
  _total integer;
BEGIN
  SELECT * INTO _existing FROM public.memory_book_projects
  WHERE user_id = _user_id AND purchase_key = _purchase_key;
  IF FOUND THEN
    SELECT COALESCE(balance,0) + COALESCE(purchased_balance,0) INTO _total
    FROM public.credit_wallets WHERE user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'book_id', _existing.id,
      'balance', COALESCE(_total, 0), 'charged', 0);
  END IF;

  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR (COALESCE(_wallet.balance,0) + COALESCE(_wallet.purchased_balance,0)) < _price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits',
      'balance', COALESCE(_wallet.balance,0) + COALESCE(_wallet.purchased_balance,0));
  END IF;

  _from_purchased := LEAST(COALESCE(_wallet.purchased_balance,0), _price);
  _from_bonus := _price - _from_purchased;

  UPDATE public.credit_wallets
  SET purchased_balance = COALESCE(purchased_balance,0) - _from_purchased,
      balance = balance - _from_bonus,
      lifetime_spent = lifetime_spent + _price
  WHERE id = _wallet.id;

  INSERT INTO public.memory_book_projects
    (user_id, package_code, leaves, internal_pages, video_capacity, credits_spent, purchase_key)
  VALUES (_user_id, _package_code, _leaves, _pages, _videos, _price, _purchase_key)
  RETURNING id INTO _book_id;

  IF _from_purchased > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_purchased,
      COALESCE(_wallet.purchased_balance,0) - _from_purchased,
      'Memory Book package', jsonb_build_object('book_id', _book_id, 'package', _package_code), 'purchased');
  END IF;
  IF _from_bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_bonus, _wallet.balance - _from_bonus,
      'Memory Book package', jsonb_build_object('book_id', _book_id, 'package', _package_code), 'bonus');
  END IF;

  RETURN jsonb_build_object('ok', true, 'book_id', _book_id, 'charged', _price,
    'balance', COALESCE(_wallet.balance,0) + COALESCE(_wallet.purchased_balance,0) - _price);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_memory_book_package(uuid, text, integer, integer, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purchase_memory_book_package(uuid, text, integer, integer, integer, integer, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_memory_book_package(uuid, text, integer, integer, integer, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_credit_purchase(
  _order_id uuid,
  _provider text DEFAULT NULL,
  _provider_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.credit_purchase_orders%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
  _is_first boolean;
  _bonus integer := 0;
BEGIN
  SELECT * INTO _order FROM public.credit_purchase_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;
  IF _order.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.credit_purchase_orders
    WHERE user_id = _order.user_id AND status = 'paid' AND id <> _order.id
  ) INTO _is_first;
  IF _is_first THEN _bonus := 4; END IF;

  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _order.user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.credit_wallets (user_id, balance, purchased_balance)
    VALUES (_order.user_id, 0, 0)
    RETURNING * INTO _wallet;
  END IF;

  UPDATE public.credit_wallets
  SET purchased_balance = COALESCE(purchased_balance,0) + _order.credits,
      balance = balance + _bonus
  WHERE id = _wallet.id;

  INSERT INTO public.credit_transactions
    (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
  VALUES (_wallet.id, _order.user_id, 'purchase', _order.credits,
    COALESCE(_wallet.purchased_balance,0) + _order.credits,
    'Credit purchase', jsonb_build_object('order_id', _order.id), 'purchased');

  IF _bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _order.user_id, 'promotional_bonus', _bonus, _wallet.balance + _bonus,
      'First credit purchase gift', jsonb_build_object('order_id', _order.id), 'bonus');
  END IF;

  UPDATE public.credit_purchase_orders
  SET status = 'paid', confirmed_at = now(), updated_at = now(),
      bonus_credits_granted = _bonus,
      provider = COALESCE(_provider, provider),
      provider_reference = COALESCE(_provider_reference, provider_reference)
  WHERE id = _order.id;

  RETURN jsonb_build_object('ok', true, 'credits', _order.credits, 'bonus', _bonus);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_credit_purchase(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_credit_purchase(uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_credit_purchase(uuid, text, text) TO service_role;
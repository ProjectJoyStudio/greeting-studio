CREATE TABLE IF NOT EXISTS public.live_card_attempt_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  attempts_used integer NOT NULL DEFAULT 0,
  packs_purchased integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_card_attempt_sessions TO authenticated;
GRANT ALL ON public.live_card_attempt_sessions TO service_role;

ALTER TABLE public.live_card_attempt_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own live card attempt sessions" ON public.live_card_attempt_sessions;
CREATE POLICY "Users manage their own live card attempt sessions"
ON public.live_card_attempt_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.live_card_animations ADD COLUMN IF NOT EXISTS credits_charged integer NOT NULL DEFAULT 0;

-- Buys one package of live card image attempts for a fixed credit price.
CREATE OR REPLACE FUNCTION public.buy_live_card_attempt_pack(
  _user_id uuid,
  _session_key text,
  _price integer,
  _attempts_per_pack integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
  _packs integer;
  _used integer;
BEGIN
  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits',
      'balance', COALESCE(_wallet.balance, 0));
  END IF;

  UPDATE public.credit_wallets
  SET balance = _wallet.balance - _price,
      lifetime_spent = _wallet.lifetime_spent + _price
  WHERE id = _wallet.id;

  INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata)
  VALUES (_wallet.id, _user_id, 'order_charge', -_price, _wallet.balance - _price,
    'Live greeting card — image attempt package',
    jsonb_build_object('session_key', _session_key, 'attempts', _attempts_per_pack));

  INSERT INTO public.live_card_attempt_sessions (user_id, session_key, packs_purchased)
  VALUES (_user_id, _session_key, 1)
  ON CONFLICT (user_id, session_key)
  DO UPDATE SET packs_purchased = public.live_card_attempt_sessions.packs_purchased + 1,
                updated_at = now()
  RETURNING packs_purchased, attempts_used INTO _packs, _used;

  RETURN jsonb_build_object('ok', true, 'balance', _wallet.balance - _price,
    'packs', _packs, 'used', _used);
END;
$$;

REVOKE ALL ON FUNCTION public.buy_live_card_attempt_pack(uuid, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buy_live_card_attempt_pack(uuid, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buy_live_card_attempt_pack(uuid, text, integer, integer) TO service_role;

-- Consumes one image attempt only when a picture was really produced.
CREATE OR REPLACE FUNCTION public.consume_live_card_attempt(
  _user_id uuid,
  _session_key text,
  _attempts_per_pack integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.live_card_attempt_sessions%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.live_card_attempt_sessions
  WHERE user_id = _user_id AND session_key = _session_key FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'used', 0, 'packs', 0);
  END IF;
  IF _row.attempts_used >= _row.packs_purchased * _attempts_per_pack THEN
    RETURN jsonb_build_object('ok', false, 'used', _row.attempts_used, 'packs', _row.packs_purchased);
  END IF;
  UPDATE public.live_card_attempt_sessions
  SET attempts_used = _row.attempts_used + 1, updated_at = now()
  WHERE id = _row.id;
  RETURN jsonb_build_object('ok', true, 'used', _row.attempts_used + 1, 'packs', _row.packs_purchased);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_live_card_attempt(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_live_card_attempt(uuid, text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_live_card_attempt(uuid, text, integer) TO service_role;

-- Charges the animation price once, refusing to go negative.
CREATE OR REPLACE FUNCTION public.charge_live_card_animation(
  _user_id uuid,
  _price integer,
  _duration integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
BEGIN
  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits',
      'balance', COALESCE(_wallet.balance, 0));
  END IF;

  UPDATE public.credit_wallets
  SET balance = _wallet.balance - _price,
      lifetime_spent = _wallet.lifetime_spent + _price
  WHERE id = _wallet.id;

  INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata)
  VALUES (_wallet.id, _user_id, 'order_charge', -_price, _wallet.balance - _price,
    'Live greeting card — animation',
    jsonb_build_object('duration_seconds', _duration));

  RETURN jsonb_build_object('ok', true, 'balance', _wallet.balance - _price);
END;
$$;

REVOKE ALL ON FUNCTION public.charge_live_card_animation(uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.charge_live_card_animation(uuid, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_live_card_animation(uuid, integer, integer) TO service_role;

-- Gives the animation price back when the request could not be started.
CREATE OR REPLACE FUNCTION public.refund_live_card_animation(
  _user_id uuid,
  _price integer,
  _reason text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
BEGIN
  IF _price <= 0 THEN RETURN 0; END IF;
  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;

  UPDATE public.credit_wallets
  SET balance = _wallet.balance + _price,
      lifetime_spent = GREATEST(0, _wallet.lifetime_spent - _price)
  WHERE id = _wallet.id;

  INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata)
  VALUES (_wallet.id, _user_id, 'refund', _price, _wallet.balance + _price,
    'Live greeting card — animation refund', jsonb_build_object('reason', _reason));

  RETURN _price;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_live_card_animation(uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_live_card_animation(uuid, integer, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_live_card_animation(uuid, integer, text) TO service_role;
ALTER TYPE public.credit_txn_type ADD VALUE IF NOT EXISTS 'storage_extension';

CREATE TABLE public.memory_book_storage_offers (
  code text PRIMARY KEY,
  service text NOT NULL CHECK (service IN ('working','completed')),
  duration_days integer NOT NULL DEFAULT 0 CHECK (duration_days >= 0),
  duration_months integer NOT NULL DEFAULT 0 CHECK (duration_months >= 0),
  credits integer CHECK (credits IS NULL OR (credits >= 1 AND credits <= 100000)),
  enabled boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CHECK (duration_days > 0 OR duration_months > 0),
  CHECK (NOT enabled OR credits IS NOT NULL)
);
GRANT ALL ON public.memory_book_storage_offers TO service_role;
ALTER TABLE public.memory_book_storage_offers ENABLE ROW LEVEL SECURITY;

INSERT INTO public.memory_book_storage_offers (code, service, duration_days, duration_months, credits, enabled, sort_order)
SELECT 'working_week', 'working', 7, 0,
  GREATEST(1, COALESCE((SELECT credits FROM public.tariff_settings WHERE product='memory_book' AND key='storage_week'), 3)), true, 10
UNION ALL
SELECT 'working_month', 'working', 30, 0,
  GREATEST(1, COALESCE((SELECT credits FROM public.tariff_settings WHERE product='memory_book' AND key='storage_month'), 10)), true, 20
UNION ALL
SELECT 'completed_year', 'completed', 0, 12, NULL, false, 30;

CREATE TABLE public.memory_book_storage_offer_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL REFERENCES public.memory_book_storage_offers(code),
  old_credits integer,
  new_credits integer,
  old_enabled boolean,
  new_enabled boolean,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.memory_book_storage_offer_audit TO service_role;
ALTER TABLE public.memory_book_storage_offer_audit ENABLE ROW LEVEL SECURITY;
CREATE INDEX memory_book_storage_offer_audit_code_idx ON public.memory_book_storage_offer_audit (code, changed_at DESC);

CREATE TABLE public.memory_book_storage_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  offer_code text NOT NULL REFERENCES public.memory_book_storage_offers(code),
  service text NOT NULL CHECK (service IN ('working','completed')),
  credits integer NOT NULL,
  previous_expires_at timestamptz,
  new_expires_at timestamptz NOT NULL,
  purchase_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, purchase_key)
);
GRANT SELECT ON public.memory_book_storage_purchases TO authenticated;
GRANT ALL ON public.memory_book_storage_purchases TO service_role;
ALTER TABLE public.memory_book_storage_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their storage purchases" ON public.memory_book_storage_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX memory_book_storage_purchases_book_idx ON public.memory_book_storage_purchases (book_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.purchase_memory_book_storage(
  _user_id uuid, _book_id uuid, _offer_code text, _expected_price integer, _purchase_key text, _assets_verified boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _offer public.memory_book_storage_offers%ROWTYPE;
  _book public.memory_book_projects%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
  _existing public.memory_book_storage_purchases%ROWTYPE;
  _price integer;
  _from_purchased integer;
  _from_bonus integer;
  _previous timestamptz;
  _base timestamptz;
  _new timestamptz;
  _total integer;
BEGIN
  IF _purchase_key IS NULL OR length(_purchase_key) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'failed');
  END IF;

  -- Serialize every purchase of the same customer key.
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':' || _purchase_key, 0));

  SELECT * INTO _existing FROM public.memory_book_storage_purchases
  WHERE user_id = _user_id AND purchase_key = _purchase_key;
  IF FOUND THEN
    SELECT COALESCE(balance,0) + COALESCE(purchased_balance,0) INTO _total
    FROM public.credit_wallets WHERE user_id = _user_id;
    IF _existing.book_id <> _book_id OR _existing.offer_code <> _offer_code THEN
      RETURN jsonb_build_object('ok', false, 'error', 'failed');
    END IF;
    RETURN jsonb_build_object('ok', true, 'expires_at', _existing.new_expires_at,
      'previous_expires_at', _existing.previous_expires_at, 'charged', 0, 'repeated', true,
      'balance', COALESCE(_total, 0));
  END IF;

  SELECT * INTO _offer FROM public.memory_book_storage_offers WHERE code = _offer_code FOR SHARE;
  IF NOT FOUND OR NOT _offer.enabled OR _offer.credits IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_unavailable');
  END IF;
  _price := _offer.credits;
  IF _expected_price IS DISTINCT FROM _price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'price_changed', 'price', _price);
  END IF;

  SELECT * INTO _book FROM public.memory_book_projects
  WHERE id = _book_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF _offer.service = 'working' THEN
    IF _book.status = 'completed' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_status');
    END IF;
    _previous := _book.expires_at;
    _base := GREATEST(COALESCE(_book.expires_at, now()), now());
  ELSE
    IF _book.status <> 'completed' OR _book.completed_at IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_status');
    END IF;
    IF NOT COALESCE(_assets_verified, false) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'assets_unavailable');
    END IF;
    _previous := _book.retention_expires_at;
    -- An active period is extended from its end; expired time is never charged.
    _base := GREATEST(COALESCE(_book.retention_expires_at, now()), now());
  END IF;
  _new := _base + make_interval(months => _offer.duration_months, days => _offer.duration_days);

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

  IF _offer.service = 'working' THEN
    UPDATE public.memory_book_projects SET expires_at = _new, updated_at = now() WHERE id = _book.id;
  ELSE
    UPDATE public.memory_book_projects SET retention_expires_at = _new, updated_at = now() WHERE id = _book.id;
  END IF;

  INSERT INTO public.memory_book_storage_purchases
    (user_id, book_id, offer_code, service, credits, previous_expires_at, new_expires_at, purchase_key)
  VALUES (_user_id, _book.id, _offer.code, _offer.service, _price, _previous, _new, _purchase_key);

  IF _from_purchased > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'storage_extension', -_from_purchased,
      COALESCE(_wallet.purchased_balance,0) - _from_purchased,
      CASE WHEN _offer.service = 'working' THEN 'Memory Book: extra time to finish' ELSE 'Memory Book: online storage of completed book' END,
      jsonb_build_object('book_id', _book.id, 'offer', _offer.code, 'service', _offer.service, 'kind', 'storage_extension', 'expires_at', _new), 'purchased');
  END IF;
  IF _from_bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'storage_extension', -_from_bonus, _wallet.balance - _from_bonus,
      CASE WHEN _offer.service = 'working' THEN 'Memory Book: extra time to finish' ELSE 'Memory Book: online storage of completed book' END,
      jsonb_build_object('book_id', _book.id, 'offer', _offer.code, 'service', _offer.service, 'kind', 'storage_extension', 'expires_at', _new), 'bonus');
  END IF;

  RETURN jsonb_build_object('ok', true, 'expires_at', _new, 'previous_expires_at', _previous,
    'charged', _price, 'balance', COALESCE(_wallet.balance,0) + COALESCE(_wallet.purchased_balance,0) - _price);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purchase_memory_book_storage(uuid, uuid, text, integer, text, boolean) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.purchase_memory_book_storage(uuid, uuid, text, integer, text, boolean) TO service_role;
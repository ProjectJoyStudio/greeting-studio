CREATE TABLE IF NOT EXISTS public.memory_book_storage_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  days integer NOT NULL,
  credits integer NOT NULL,
  extend_key text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, extend_key)
);

GRANT SELECT ON public.memory_book_storage_extensions TO authenticated;
GRANT ALL ON public.memory_book_storage_extensions TO service_role;
ALTER TABLE public.memory_book_storage_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their storage extensions"
ON public.memory_book_storage_extensions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.extend_memory_book_storage(
  _user_id uuid, _book_id uuid, _days integer, _price integer, _extend_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
  _book public.memory_book_projects%ROWTYPE;
  _existing public.memory_book_storage_extensions%ROWTYPE;
  _from_purchased integer;
  _from_bonus integer;
  _new_expiry timestamptz;
  _total integer;
BEGIN
  IF _days NOT IN (7, 30) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_option');
  END IF;

  SELECT * INTO _existing FROM public.memory_book_storage_extensions
  WHERE user_id = _user_id AND extend_key = _extend_key;
  IF FOUND THEN
    SELECT COALESCE(balance,0) + COALESCE(purchased_balance,0) INTO _total
    FROM public.credit_wallets WHERE user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'expires_at', _existing.expires_at,
      'balance', COALESCE(_total, 0), 'charged', 0);
  END IF;

  SELECT * INTO _book FROM public.memory_book_projects
  WHERE id = _book_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
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

  _new_expiry := GREATEST(_book.expires_at, now()) + make_interval(days => _days);

  UPDATE public.memory_book_projects
  SET expires_at = _new_expiry, updated_at = now()
  WHERE id = _book.id;

  INSERT INTO public.memory_book_storage_extensions
    (book_id, user_id, days, credits, extend_key, expires_at)
  VALUES (_book.id, _user_id, _days, _price, _extend_key, _new_expiry);

  IF _from_purchased > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_purchased,
      COALESCE(_wallet.purchased_balance,0) - _from_purchased,
      'Memory Book storage extension',
      jsonb_build_object('book_id', _book.id, 'days', _days, 'kind', 'storage_extension'), 'purchased');
  END IF;
  IF _from_bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_bonus, _wallet.balance - _from_bonus,
      'Memory Book storage extension',
      jsonb_build_object('book_id', _book.id, 'days', _days, 'kind', 'storage_extension'), 'bonus');
  END IF;

  RETURN jsonb_build_object('ok', true, 'expires_at', _new_expiry, 'charged', _price,
    'balance', COALESCE(_wallet.balance,0) + COALESCE(_wallet.purchased_balance,0) - _price);
END;
$function$;
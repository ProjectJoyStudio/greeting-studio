ALTER TABLE public.memory_book_projects
  ADD COLUMN IF NOT EXISTS cover_prompt text,
  ADD COLUMN IF NOT EXISTS leaf_prompt text,
  ADD COLUMN IF NOT EXISTS design_stage text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS cover_generations_allowed integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS cover_generations_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leaf_generations_allowed integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS leaf_generations_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_cover_id uuid,
  ADD COLUMN IF NOT EXISTS selected_leaf_id uuid;

CREATE TABLE IF NOT EXISTS public.memory_book_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stage text NOT NULL CHECK (stage IN ('cover','leaf')),
  source text NOT NULL DEFAULT 'generated' CHECK (source IN ('generated','library')),
  bucket text NOT NULL,
  path text NOT NULL,
  prompt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memory_book_designs_book_idx ON public.memory_book_designs (book_id, stage, created_at DESC);
GRANT SELECT ON public.memory_book_designs TO authenticated;
GRANT ALL ON public.memory_book_designs TO service_role;
ALTER TABLE public.memory_book_designs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read their memory book designs" ON public.memory_book_designs;
CREATE POLICY "Owners read their memory book designs"
ON public.memory_book_designs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.memory_book_generation_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stage text NOT NULL CHECK (stage IN ('cover','leaf')),
  credits integer NOT NULL,
  generations integer NOT NULL,
  purchase_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, purchase_key)
);
GRANT SELECT ON public.memory_book_generation_purchases TO authenticated;
GRANT ALL ON public.memory_book_generation_purchases TO service_role;
ALTER TABLE public.memory_book_generation_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read their generation purchases" ON public.memory_book_generation_purchases;
CREATE POLICY "Owners read their generation purchases"
ON public.memory_book_generation_purchases FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_memory_book_generation(
  _user_id uuid, _book_id uuid, _stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _book public.memory_book_projects%ROWTYPE;
  _used integer;
  _allowed integer;
BEGIN
  IF _stage NOT IN ('cover','leaf') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_stage');
  END IF;
  SELECT * INTO _book FROM public.memory_book_projects
  WHERE id = _book_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF _stage = 'cover' THEN
    _used := COALESCE(_book.cover_generations_used, 0);
    _allowed := COALESCE(_book.cover_generations_allowed, 3);
  ELSE
    _used := COALESCE(_book.leaf_generations_used, 0);
    _allowed := COALESCE(_book.leaf_generations_allowed, 3);
  END IF;

  IF _used >= _allowed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_generations', 'remaining', 0);
  END IF;

  IF _stage = 'cover' THEN
    UPDATE public.memory_book_projects
    SET cover_generations_used = _used + 1, updated_at = now() WHERE id = _book.id;
  ELSE
    UPDATE public.memory_book_projects
    SET leaf_generations_used = _used + 1, updated_at = now() WHERE id = _book.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'remaining', _allowed - _used - 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_memory_book_generation(
  _user_id uuid, _book_id uuid, _stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _stage NOT IN ('cover','leaf') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_stage');
  END IF;
  IF _stage = 'cover' THEN
    UPDATE public.memory_book_projects
    SET cover_generations_used = GREATEST(COALESCE(cover_generations_used,0) - 1, 0), updated_at = now()
    WHERE id = _book_id AND user_id = _user_id;
  ELSE
    UPDATE public.memory_book_projects
    SET leaf_generations_used = GREATEST(COALESCE(leaf_generations_used,0) - 1, 0), updated_at = now()
    WHERE id = _book_id AND user_id = _user_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_memory_book_generations(
  _user_id uuid, _book_id uuid, _stage text, _price integer, _generations integer, _purchase_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
  _book public.memory_book_projects%ROWTYPE;
  _existing public.memory_book_generation_purchases%ROWTYPE;
  _from_purchased integer;
  _from_bonus integer;
  _total integer;
BEGIN
  IF _stage NOT IN ('cover','leaf') OR _price <= 0 OR _generations <= 0 OR _purchase_key IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO _existing FROM public.memory_book_generation_purchases
  WHERE user_id = _user_id AND purchase_key = _purchase_key;
  IF FOUND THEN
    SELECT COALESCE(balance,0) + COALESCE(purchased_balance,0) INTO _total
    FROM public.credit_wallets WHERE user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'charged', 0, 'balance', COALESCE(_total,0));
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

  IF _stage = 'cover' THEN
    UPDATE public.memory_book_projects
    SET cover_generations_allowed = COALESCE(cover_generations_allowed,3) + _generations,
        credits_spent = COALESCE(credits_spent,0) + _price,
        updated_at = now()
    WHERE id = _book.id;
  ELSE
    UPDATE public.memory_book_projects
    SET leaf_generations_allowed = COALESCE(leaf_generations_allowed,3) + _generations,
        credits_spent = COALESCE(credits_spent,0) + _price,
        updated_at = now()
    WHERE id = _book.id;
  END IF;

  INSERT INTO public.memory_book_generation_purchases
    (book_id, user_id, stage, credits, generations, purchase_key)
  VALUES (_book.id, _user_id, _stage, _price, _generations, _purchase_key);

  IF _from_purchased > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_purchased,
      COALESCE(_wallet.purchased_balance,0) - _from_purchased,
      'Memory Book design creations',
      jsonb_build_object('book_id', _book.id, 'stage', _stage, 'kind', 'design_generations'), 'purchased');
  END IF;
  IF _from_bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_bonus, _wallet.balance - _from_bonus,
      'Memory Book design creations',
      jsonb_build_object('book_id', _book.id, 'stage', _stage, 'kind', 'design_generations'), 'bonus');
  END IF;

  RETURN jsonb_build_object('ok', true, 'charged', _price,
    'balance', COALESCE(_wallet.balance,0) + COALESCE(_wallet.purchased_balance,0) - _price);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_memory_book_generation(uuid, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.release_memory_book_generation(uuid, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.purchase_memory_book_generations(uuid, uuid, text, integer, integer, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.claim_memory_book_generation(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_memory_book_generation(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_memory_book_generations(uuid, uuid, text, integer, integer, text) TO service_role;
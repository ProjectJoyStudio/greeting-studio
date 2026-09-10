ALTER TABLE public.memory_book_pages
  ADD COLUMN IF NOT EXISTS background_bucket text,
  ADD COLUMN IF NOT EXISTS background_path text,
  ADD COLUMN IF NOT EXISTS improve_prompt text,
  ADD COLUMN IF NOT EXISTS improve_included_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS improve_paid_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.memory_book_page_improvements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_index integer NOT NULL,
  mode text NOT NULL CHECK (mode IN ('included','paid')),
  credits integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','refunded')),
  claim_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_key)
);

GRANT SELECT ON public.memory_book_page_improvements TO authenticated;
GRANT ALL ON public.memory_book_page_improvements TO service_role;

ALTER TABLE public.memory_book_page_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read their own page improvements"
ON public.memory_book_page_improvements
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER set_memory_book_page_improvements_updated_at
BEFORE UPDATE ON public.memory_book_page_improvements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.memory_book_improve_allowance(_package_code text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _package_code
    WHEN 'mb_15' THEN 7
    WHEN 'mb_10' THEN 5
    ELSE 2
  END;
$$;

CREATE OR REPLACE FUNCTION public.claim_memory_book_page_improvement(
  _user_id uuid,
  _book_id uuid,
  _page_index integer,
  _price integer,
  _claim_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _book public.memory_book_projects%ROWTYPE;
  _existing public.memory_book_page_improvements%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
  _included_used boolean;
  _distinct_used integer;
  _allowance integer;
  _from_purchased integer;
  _from_bonus integer;
BEGIN
  IF _claim_key IS NULL OR _claim_key = '' OR _price < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO _existing FROM public.memory_book_page_improvements
  WHERE user_id = _user_id AND claim_key = _claim_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'mode', _existing.mode, 'charged', 0, 'reused', true);
  END IF;

  SELECT * INTO _book FROM public.memory_book_projects
  WHERE id = _book_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(_book.credits_spent, 0) <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF _page_index < 1 OR _page_index > COALESCE(_book.internal_pages, 0) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_page');
  END IF;

  INSERT INTO public.memory_book_pages (book_id, user_id, page_index)
  VALUES (_book_id, _user_id, _page_index)
  ON CONFLICT (book_id, page_index) DO NOTHING;

  SELECT COALESCE(improve_included_used, false) INTO _included_used
  FROM public.memory_book_pages
  WHERE book_id = _book_id AND page_index = _page_index FOR UPDATE;

  _allowance := public.memory_book_improve_allowance(_book.package_code);

  IF NOT _included_used THEN
    SELECT count(*) INTO _distinct_used FROM public.memory_book_pages
    WHERE book_id = _book_id AND improve_included_used = true;

    IF _distinct_used >= _allowance THEN
      RETURN jsonb_build_object('ok', false, 'error', 'page_limit',
        'allowance', _allowance, 'distinct_used', _distinct_used);
    END IF;

    UPDATE public.memory_book_pages
    SET improve_included_used = true, updated_at = now()
    WHERE book_id = _book_id AND page_index = _page_index;

    INSERT INTO public.memory_book_page_improvements
      (book_id, user_id, page_index, mode, credits, claim_key)
    VALUES (_book_id, _user_id, _page_index, 'included', 0, _claim_key);

    RETURN jsonb_build_object('ok', true, 'mode', 'included', 'charged', 0);
  END IF;

  IF _price <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
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

  UPDATE public.memory_book_projects
  SET credits_spent = COALESCE(credits_spent,0) + _price, updated_at = now()
  WHERE id = _book.id;

  UPDATE public.memory_book_pages
  SET improve_paid_count = COALESCE(improve_paid_count,0) + 1, updated_at = now()
  WHERE book_id = _book_id AND page_index = _page_index;

  INSERT INTO public.memory_book_page_improvements
    (book_id, user_id, page_index, mode, credits, claim_key)
  VALUES (_book_id, _user_id, _page_index, 'paid', _price, _claim_key);

  IF _from_purchased > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_purchased,
      COALESCE(_wallet.purchased_balance,0) - _from_purchased,
      'Memory Book page improvement',
      jsonb_build_object('book_id', _book.id, 'page_index', _page_index, 'kind', 'page_improvement'),
      'purchased');
  END IF;
  IF _from_bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_bonus, _wallet.balance - _from_bonus,
      'Memory Book page improvement',
      jsonb_build_object('book_id', _book.id, 'page_index', _page_index, 'kind', 'page_improvement'),
      'bonus');
  END IF;

  RETURN jsonb_build_object('ok', true, 'mode', 'paid', 'charged', _price);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_memory_book_page_improvement(
  _user_id uuid,
  _book_id uuid,
  _claim_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _claim public.memory_book_page_improvements%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
BEGIN
  SELECT * INTO _claim FROM public.memory_book_page_improvements
  WHERE user_id = _user_id AND claim_key = _claim_key AND book_id = _book_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'refunded', 0);
  END IF;
  IF _claim.status = 'refunded' THEN
    RETURN jsonb_build_object('ok', true, 'refunded', 0);
  END IF;

  IF _claim.mode = 'included' THEN
    UPDATE public.memory_book_pages
    SET improve_included_used = false, updated_at = now()
    WHERE book_id = _claim.book_id AND page_index = _claim.page_index;
  ELSE
    UPDATE public.memory_book_pages
    SET improve_paid_count = GREATEST(COALESCE(improve_paid_count,0) - 1, 0), updated_at = now()
    WHERE book_id = _claim.book_id AND page_index = _claim.page_index;

    IF COALESCE(_claim.credits,0) > 0 THEN
      SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
      IF FOUND THEN
        UPDATE public.credit_wallets
        SET purchased_balance = COALESCE(purchased_balance,0) + _claim.credits,
            lifetime_spent = GREATEST(COALESCE(lifetime_spent,0) - _claim.credits, 0)
        WHERE id = _wallet.id;

        INSERT INTO public.credit_transactions
          (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
        VALUES (_wallet.id, _user_id, 'refund', _claim.credits,
          COALESCE(_wallet.purchased_balance,0) + _claim.credits,
          'Memory Book page improvement refund',
          jsonb_build_object('book_id', _claim.book_id, 'page_index', _claim.page_index,
            'kind', 'page_improvement_refund'),
          'purchased');
      END IF;

      UPDATE public.memory_book_projects
      SET credits_spent = GREATEST(COALESCE(credits_spent,0) - _claim.credits, 0), updated_at = now()
      WHERE id = _claim.book_id AND user_id = _user_id;
    END IF;
  END IF;

  UPDATE public.memory_book_page_improvements
  SET status = 'refunded', updated_at = now()
  WHERE id = _claim.id;

  RETURN jsonb_build_object('ok', true, 'refunded', COALESCE(_claim.credits,0));
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_memory_book_page_improvement(uuid, uuid, integer, integer, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_memory_book_page_improvement(uuid, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_memory_book_page_improvement(uuid, uuid, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_memory_book_page_improvement(uuid, uuid, text) TO service_role;
ALTER TABLE public.memory_book_projects
  ADD COLUMN IF NOT EXISTS improve_pack_remaining integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.memory_book_improve_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  credits integer NOT NULL,
  variants integer NOT NULL,
  purchase_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS memory_book_improve_packs_key
  ON public.memory_book_improve_packs (user_id, purchase_key);

GRANT SELECT ON public.memory_book_improve_packs TO authenticated;
GRANT ALL ON public.memory_book_improve_packs TO service_role;
ALTER TABLE public.memory_book_improve_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read their improve packs" ON public.memory_book_improve_packs;
CREATE POLICY "Owners read their improve packs"
  ON public.memory_book_improve_packs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Buys one bundle of extra page-improvement variants. The credits are charged
-- exactly once per purchase key; the bundle is stored as remaining variants.
CREATE OR REPLACE FUNCTION public.buy_memory_book_improve_pack(
  _user_id uuid, _book_id uuid, _price integer, _variants integer, _purchase_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _book public.memory_book_projects%ROWTYPE;
  _existing public.memory_book_improve_packs%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
  _from_purchased integer;
  _from_bonus integer;
BEGIN
  IF _purchase_key IS NULL OR _purchase_key = '' OR _price <= 0 OR _variants <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO _existing FROM public.memory_book_improve_packs
  WHERE user_id = _user_id AND purchase_key = _purchase_key;
  IF FOUND THEN
    SELECT * INTO _book FROM public.memory_book_projects WHERE id = _book_id AND user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'charged', 0, 'reused', true,
      'remaining', COALESCE(_book.improve_pack_remaining, 0));
  END IF;

  SELECT * INTO _book FROM public.memory_book_projects
  WHERE id = _book_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(_book.credits_spent, 0) <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR (COALESCE(_wallet.balance,0) + COALESCE(_wallet.purchased_balance,0)) < _price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits');
  END IF;

  _from_purchased := LEAST(COALESCE(_wallet.purchased_balance,0), _price);
  _from_bonus := _price - _from_purchased;

  UPDATE public.credit_wallets
  SET purchased_balance = COALESCE(purchased_balance,0) - _from_purchased,
      balance = balance - _from_bonus,
      lifetime_spent = lifetime_spent + _price
  WHERE id = _wallet.id;

  UPDATE public.memory_book_projects
  SET credits_spent = COALESCE(credits_spent,0) + _price,
      improve_pack_remaining = COALESCE(improve_pack_remaining,0) + _variants,
      updated_at = now()
  WHERE id = _book.id;

  INSERT INTO public.memory_book_improve_packs (user_id, book_id, credits, variants, purchase_key)
  VALUES (_user_id, _book_id, _price, _variants, _purchase_key);

  IF _from_purchased > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_purchased,
      COALESCE(_wallet.purchased_balance,0) - _from_purchased,
      'Memory Book extra page variants',
      jsonb_build_object('book_id', _book.id, 'kind', 'page_improvement_pack', 'variants', _variants),
      'purchased');
  END IF;
  IF _from_bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_bonus, _wallet.balance - _from_bonus,
      'Memory Book extra page variants',
      jsonb_build_object('book_id', _book.id, 'kind', 'page_improvement_pack', 'variants', _variants),
      'bonus');
  END IF;

  RETURN jsonb_build_object('ok', true, 'charged', _price,
    'remaining', COALESCE(_book.improve_pack_remaining,0) + _variants);
END;
$function$;

-- Claiming one page improvement: first the package allowance of this page,
-- then one variant of an already purchased bundle. Nothing is charged here.
CREATE OR REPLACE FUNCTION public.claim_memory_book_page_improvement(
  _user_id uuid, _book_id uuid, _page_index integer, _price integer, _claim_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _book public.memory_book_projects%ROWTYPE;
  _existing public.memory_book_page_improvements%ROWTYPE;
  _included_used boolean;
  _distinct_used integer;
  _allowance integer;
  _remaining integer;
BEGIN
  IF _claim_key IS NULL OR _claim_key = '' THEN
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

    IF _distinct_used < _allowance THEN
      UPDATE public.memory_book_pages
      SET improve_included_used = true, updated_at = now()
      WHERE book_id = _book_id AND page_index = _page_index;

      INSERT INTO public.memory_book_page_improvements
        (book_id, user_id, page_index, mode, credits, claim_key)
      VALUES (_book_id, _user_id, _page_index, 'included', 0, _claim_key);

      RETURN jsonb_build_object('ok', true, 'mode', 'included', 'charged', 0);
    END IF;
  END IF;

  _remaining := COALESCE(_book.improve_pack_remaining, 0);
  IF _remaining <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'needs_pack',
      'allowance', _allowance, 'remaining', 0);
  END IF;

  UPDATE public.memory_book_projects
  SET improve_pack_remaining = _remaining - 1, updated_at = now()
  WHERE id = _book.id;

  UPDATE public.memory_book_pages
  SET improve_paid_count = COALESCE(improve_paid_count,0) + 1, updated_at = now()
  WHERE book_id = _book_id AND page_index = _page_index;

  INSERT INTO public.memory_book_page_improvements
    (book_id, user_id, page_index, mode, credits, claim_key)
  VALUES (_book_id, _user_id, _page_index, 'paid', 0, _claim_key);

  RETURN jsonb_build_object('ok', true, 'mode', 'paid', 'charged', 0,
    'remaining', _remaining - 1);
END;
$function$;

-- Giving back one claim after a technical failure: either the included
-- allowance of that page, or one variant of the purchased bundle. Credits are
-- never re-charged, so a failure can never cost the customer anything.
CREATE OR REPLACE FUNCTION public.release_memory_book_page_improvement(
  _user_id uuid, _book_id uuid, _claim_key text)
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

    -- Older claims charged credits directly; those are still refunded.
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
    ELSE
      UPDATE public.memory_book_projects
      SET improve_pack_remaining = COALESCE(improve_pack_remaining,0) + 1, updated_at = now()
      WHERE id = _claim.book_id AND user_id = _user_id;
    END IF;
  END IF;

  UPDATE public.memory_book_page_improvements
  SET status = 'refunded', updated_at = now()
  WHERE id = _claim.id;

  RETURN jsonb_build_object('ok', true, 'refunded', COALESCE(_claim.credits,0));
END;
$function$;
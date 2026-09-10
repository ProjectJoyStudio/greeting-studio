CREATE TABLE public.memory_book_leaf_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('standard','video')),
  credits integer NOT NULL,
  video_added boolean NOT NULL DEFAULT false,
  purchase_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, purchase_key)
);

GRANT SELECT ON public.memory_book_leaf_purchases TO authenticated;
GRANT ALL ON public.memory_book_leaf_purchases TO service_role;

ALTER TABLE public.memory_book_leaf_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their leaf purchases"
ON public.memory_book_leaf_purchases FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.purchase_memory_book_extra_leaf(
  _user_id uuid,
  _book_id uuid,
  _kind text,
  _price integer,
  _purchase_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
  _book public.memory_book_projects%ROWTYPE;
  _existing public.memory_book_leaf_purchases%ROWTYPE;
  _from_purchased integer;
  _from_bonus integer;
  _add_video boolean;
  _total integer;
BEGIN
  IF _kind NOT IN ('standard','video') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_option');
  END IF;
  IF _price IS NULL OR _price <= 0 OR _purchase_key IS NULL OR _purchase_key = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_option');
  END IF;

  SELECT * INTO _existing FROM public.memory_book_leaf_purchases
  WHERE user_id = _user_id AND purchase_key = _purchase_key;
  IF FOUND THEN
    SELECT * INTO _book FROM public.memory_book_projects WHERE id = _existing.book_id;
    SELECT COALESCE(balance,0) + COALESCE(purchased_balance,0) INTO _total
    FROM public.credit_wallets WHERE user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'charged', 0,
      'leaves', _book.leaves, 'internal_pages', _book.internal_pages,
      'video_capacity', _book.video_capacity, 'balance', COALESCE(_total,0));
  END IF;

  SELECT * INTO _book FROM public.memory_book_projects
  WHERE id = _book_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF COALESCE(_book.leaves,0) >= 15 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_leaves');
  END IF;

  _add_video := (_kind = 'video' AND COALESCE(_book.video_capacity,0) < 5);
  IF _kind = 'video' AND NOT _add_video THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_videos');
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
  SET leaves = leaves + 1,
      internal_pages = internal_pages + 2,
      video_capacity = video_capacity + (CASE WHEN _add_video THEN 1 ELSE 0 END),
      credits_spent = COALESCE(credits_spent,0) + _price,
      updated_at = now()
  WHERE id = _book.id
  RETURNING * INTO _book;

  INSERT INTO public.memory_book_leaf_purchases
    (book_id, user_id, kind, credits, video_added, purchase_key)
  VALUES (_book.id, _user_id, _kind, _price, _add_video, _purchase_key);

  IF _from_purchased > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_purchased,
      COALESCE(_wallet.purchased_balance,0) - _from_purchased,
      'Memory Book additional leaf',
      jsonb_build_object('book_id', _book.id, 'kind', 'extra_leaf', 'leaf_kind', _kind), 'purchased');
  END IF;
  IF _from_bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_bonus, _wallet.balance - _from_bonus,
      'Memory Book additional leaf',
      jsonb_build_object('book_id', _book.id, 'kind', 'extra_leaf', 'leaf_kind', _kind), 'bonus');
  END IF;

  RETURN jsonb_build_object('ok', true, 'charged', _price,
    'leaves', _book.leaves, 'internal_pages', _book.internal_pages,
    'video_capacity', _book.video_capacity,
    'balance', COALESCE(_wallet.balance,0) + COALESCE(_wallet.purchased_balance,0) - _price);
END;
$function$;

REVOKE ALL ON FUNCTION public.purchase_memory_book_extra_leaf(uuid, uuid, text, integer, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_memory_book_extra_leaf(uuid, uuid, text, integer, text) TO service_role;
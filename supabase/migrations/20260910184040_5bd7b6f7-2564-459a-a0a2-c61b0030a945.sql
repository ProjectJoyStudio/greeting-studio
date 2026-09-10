
ALTER TABLE public.memory_book_projects
  ADD COLUMN IF NOT EXISTS music_source text,
  ADD COLUMN IF NOT EXISTS music_track_id uuid,
  ADD COLUMN IF NOT EXISTS music_track_title text,
  ADD COLUMN IF NOT EXISTS music_track_bucket text,
  ADD COLUMN IF NOT EXISTS music_track_path text,
  ADD COLUMN IF NOT EXISTS music_variant_id uuid,
  ADD COLUMN IF NOT EXISTS music_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS music_volume numeric NOT NULL DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS music_included_used integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.memory_book_music_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL DEFAULT '',
  bucket text NOT NULL,
  path text NOT NULL,
  duration_seconds numeric NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.memory_book_music_variants TO authenticated;
GRANT ALL ON public.memory_book_music_variants TO service_role;
ALTER TABLE public.memory_book_music_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own book music" ON public.memory_book_music_variants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER memory_book_music_variants_updated_at
  BEFORE UPDATE ON public.memory_book_music_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.memory_book_music_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  claim_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_key)
);
GRANT SELECT ON public.memory_book_music_claims TO authenticated;
GRANT ALL ON public.memory_book_music_claims TO service_role;
ALTER TABLE public.memory_book_music_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own music claims" ON public.memory_book_music_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.admin_music_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  prompt text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'background',
  bucket text NOT NULL,
  path text NOT NULL,
  duration_seconds numeric NOT NULL DEFAULT 0,
  published_track_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_music_drafts TO authenticated;
GRANT ALL ON public.admin_music_drafts TO service_role;
ALTER TABLE public.admin_music_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editors manage admin music drafts" ON public.admin_music_drafts
  FOR ALL TO authenticated
  USING (public.is_editor_or_above(auth.uid()))
  WITH CHECK (public.is_editor_or_above(auth.uid()));
CREATE TRIGGER admin_music_drafts_updated_at
  BEFORE UPDATE ON public.admin_music_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.claim_memory_book_music(
  _user_id uuid, _book_id uuid, _price integer, _claim_key text, _included integer DEFAULT 2)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _book public.memory_book_projects%ROWTYPE;
  _existing public.memory_book_music_claims%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
  _from_purchased integer;
  _from_bonus integer;
BEGIN
  IF _claim_key IS NULL OR _claim_key = '' OR _price < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO _existing FROM public.memory_book_music_claims
  WHERE user_id = _user_id AND claim_key = _claim_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'mode', _existing.mode, 'charged', 0, 'reused', true);
  END IF;

  SELECT * INTO _book FROM public.memory_book_projects
  WHERE id = _book_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(_book.credits_spent, 0) <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF COALESCE(_book.music_included_used, 0) < COALESCE(_included, 2) THEN
    UPDATE public.memory_book_projects
    SET music_included_used = COALESCE(music_included_used, 0) + 1, updated_at = now()
    WHERE id = _book.id;

    INSERT INTO public.memory_book_music_claims (book_id, user_id, mode, credits, claim_key)
    VALUES (_book_id, _user_id, 'included', 0, _claim_key);

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

  INSERT INTO public.memory_book_music_claims (book_id, user_id, mode, credits, claim_key)
  VALUES (_book_id, _user_id, 'paid', _price, _claim_key);

  IF _from_purchased > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_purchased,
      COALESCE(_wallet.purchased_balance,0) - _from_purchased,
      'Memory Book music creation',
      jsonb_build_object('book_id', _book.id, 'kind', 'memory_book_music'), 'purchased');
  END IF;
  IF _from_bonus > 0 THEN
    INSERT INTO public.credit_transactions
      (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
    VALUES (_wallet.id, _user_id, 'order_charge', -_from_bonus, _wallet.balance - _from_bonus,
      'Memory Book music creation',
      jsonb_build_object('book_id', _book.id, 'kind', 'memory_book_music'), 'bonus');
  END IF;

  RETURN jsonb_build_object('ok', true, 'mode', 'paid', 'charged', _price);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_memory_book_music(
  _user_id uuid, _book_id uuid, _claim_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _claim public.memory_book_music_claims%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
BEGIN
  SELECT * INTO _claim FROM public.memory_book_music_claims
  WHERE user_id = _user_id AND claim_key = _claim_key AND book_id = _book_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'released', false);
  END IF;

  IF _claim.mode = 'included' THEN
    UPDATE public.memory_book_projects
    SET music_included_used = GREATEST(COALESCE(music_included_used,0) - 1, 0), updated_at = now()
    WHERE id = _book_id AND user_id = _user_id;
  ELSE
    SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
    IF FOUND AND _claim.credits > 0 THEN
      UPDATE public.credit_wallets
      SET purchased_balance = COALESCE(purchased_balance,0) + _claim.credits,
          lifetime_spent = GREATEST(COALESCE(lifetime_spent,0) - _claim.credits, 0)
      WHERE id = _wallet.id;

      UPDATE public.memory_book_projects
      SET credits_spent = GREATEST(COALESCE(credits_spent,0) - _claim.credits, 0), updated_at = now()
      WHERE id = _book_id AND user_id = _user_id;

      INSERT INTO public.credit_transactions
        (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, bucket)
      VALUES (_wallet.id, _user_id, 'refund', _claim.credits,
        COALESCE(_wallet.purchased_balance,0) + _claim.credits,
        'Memory Book music creation failed',
        jsonb_build_object('book_id', _book_id, 'kind', 'memory_book_music'), 'purchased');
    END IF;
  END IF;

  DELETE FROM public.memory_book_music_claims WHERE id = _claim.id;
  RETURN jsonb_build_object('ok', true, 'released', true);
END;
$$;

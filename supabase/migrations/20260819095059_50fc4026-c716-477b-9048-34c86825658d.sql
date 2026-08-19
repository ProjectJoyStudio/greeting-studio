-- Start Scene attempts of a Personal Video Greeting are sold in packages:
-- one credit unlocks three starting-scene generations.
ALTER TABLE public.pvg_projects
  ADD COLUMN IF NOT EXISTS scene_packs integer NOT NULL DEFAULT 0;

UPDATE public.pvg_projects
SET scene_packs = GREATEST(
  CEIL(GREATEST(generations_used, 0)::numeric / 3)::int,
  CASE WHEN credits_charged > 0 THEN 1 ELSE 0 END
)
WHERE scene_packs = 0;

CREATE OR REPLACE FUNCTION public.buy_pvg_scene_pack(
  _user_id uuid,
  _project_id uuid,
  _price integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
  _project public.pvg_projects%ROWTYPE;
  _packs integer;
  _balance integer;
BEGIN
  SELECT * INTO _project FROM public.pvg_projects
  WHERE id = _project_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'project_not_found', 'balance', 0);
  END IF;

  -- Unused attempts are never thrown away by buying again.
  IF _project.generations_used < _project.scene_packs * 3 THEN
    SELECT balance INTO _balance FROM public.credit_wallets WHERE user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'balance', COALESCE(_balance, 0),
      'packs', _project.scene_packs, 'used', _project.generations_used, 'charged', 0);
  END IF;

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
    'Personal video greeting — starting scene attempt package',
    jsonb_build_object('project_id', _project_id, 'attempts', 3));

  UPDATE public.pvg_projects
  SET scene_packs = _project.scene_packs + 1,
      credits_charged = _project.credits_charged + _price
  WHERE id = _project_id
  RETURNING scene_packs INTO _packs;

  RETURN jsonb_build_object('ok', true, 'balance', _wallet.balance - _price,
    'packs', _packs, 'used', _project.generations_used, 'charged', _price);
END;
$$;

REVOKE ALL ON FUNCTION public.buy_pvg_scene_pack(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buy_pvg_scene_pack(uuid, uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buy_pvg_scene_pack(uuid, uuid, integer) TO service_role;
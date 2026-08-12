CREATE OR REPLACE FUNCTION public.refund_pvg_video_credits(
  _video_id uuid,
  _reason text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _video public.pvg_videos%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
  _amount integer;
BEGIN
  SELECT * INTO _video
  FROM public.pvg_videos
  WHERE id = _video_id
  FOR UPDATE;

  IF NOT FOUND OR _video.credits_charged <= 0 THEN
    RETURN 0;
  END IF;

  SELECT * INTO _wallet
  FROM public.credit_wallets
  WHERE user_id = _video.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  _amount := _video.credits_charged;

  UPDATE public.pvg_videos
  SET credits_charged = 0
  WHERE id = _video.id;

  UPDATE public.credit_wallets
  SET balance = _wallet.balance + _amount,
      lifetime_spent = GREATEST(0, _wallet.lifetime_spent - _amount)
  WHERE id = _wallet.id;

  INSERT INTO public.credit_transactions (
    wallet_id,
    user_id,
    txn_type,
    amount,
    balance_after,
    description,
    metadata
  ) VALUES (
    _wallet.id,
    _video.user_id,
    'refund',
    _amount,
    _wallet.balance + _amount,
    'Personal video greeting — refund for a film that could not be made',
    jsonb_build_object(
      'project_id', _video.project_id,
      'video_id', _video.id,
      'reason', _reason
    )
  );

  RETURN _amount;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_pvg_video_credits(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_pvg_video_credits(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_pvg_video_credits(uuid, text) TO service_role;
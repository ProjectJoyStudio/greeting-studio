CREATE OR REPLACE FUNCTION public.refund_pvg_video_credits(_video_id uuid, _reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _video public.pvg_videos%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
  _amount integer;
BEGIN
  SELECT * INTO _video FROM public.pvg_videos WHERE id = _video_id FOR UPDATE;
  IF NOT FOUND OR _video.credits_charged <= 0 THEN
    RETURN 0;
  END IF;

  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _video.user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  _amount := _video.credits_charged;

  UPDATE public.pvg_videos SET credits_charged = 0 WHERE id = _video.id;

  UPDATE public.credit_wallets
  SET balance = _wallet.balance + _amount,
      lifetime_spent = GREATEST(0, _wallet.lifetime_spent - _amount)
  WHERE id = _wallet.id;

  -- The refunded amount also leaves the spend of this personal video project,
  -- so a refunded technical failure never inflates "Spent on this project".
  UPDATE public.pvg_projects
  SET credits_charged = GREATEST(0, COALESCE(credits_charged, 0) - _amount)
  WHERE id = _video.project_id;

  INSERT INTO public.credit_transactions (
    wallet_id, user_id, txn_type, amount, balance_after, description, metadata
  ) VALUES (
    _wallet.id, _video.user_id, 'refund', _amount, _wallet.balance + _amount,
    'Personal video greeting — refund for a film that could not be made',
    jsonb_build_object('project_id', _video.project_id, 'video_id', _video.id, 'reason', _reason)
  );

  RETURN _amount;
END;
$function$;

-- One-time correction: past refunds returned the credits to the wallet but
-- were never removed from the project's spend.
WITH past AS (
  SELECT (t.metadata->>'project_id')::uuid AS project_id, SUM(t.amount)::int AS refunded
  FROM public.credit_transactions t
  WHERE t.txn_type = 'refund'
    AND t.metadata ? 'video_id'
    AND t.metadata ? 'project_id'
  GROUP BY 1
)
UPDATE public.pvg_projects p
SET credits_charged = GREATEST(0, COALESCE(p.credits_charged, 0) - past.refunded)
FROM past
WHERE p.id = past.project_id;
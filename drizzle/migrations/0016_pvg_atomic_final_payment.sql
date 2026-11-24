ALTER TABLE public.pvg_videos ADD COLUMN payment_key text, ADD COLUMN charge_txn_id uuid REFERENCES public.credit_transactions(id), ADD COLUMN refund_txn_id uuid REFERENCES public.credit_transactions(id), ADD COLUMN submission_state text, ADD COLUMN request_snapshot jsonb, ADD COLUMN reconcile_token uuid, ADD COLUMN reconcile_until timestamptz;
CREATE UNIQUE INDEX pvg_video_payment_key_unique ON public.pvg_videos(project_id,payment_key) WHERE payment_key IS NOT NULL;
CREATE UNIQUE INDEX pvg_video_charge_unique ON public.pvg_videos(charge_txn_id) WHERE charge_txn_id IS NOT NULL;
CREATE UNIQUE INDEX pvg_video_refund_unique ON public.pvg_videos(refund_txn_id) WHERE refund_txn_id IS NOT NULL;
COMMENT ON COLUMN public.pvg_videos.payment_key IS 'Server-validated predecessor key: initial or previous video UUID. Replays return this same paid job, including terminal jobs.';
CREATE OR REPLACE FUNCTION public.pvg_final_price(_seconds integer,_another boolean) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN _another THEN 5 ELSE LEAST(15,GREATEST(5,COALESCE(_seconds,10))) END $$;
COMMENT ON FUNCTION public.pvg_final_price(integer,boolean) IS 'Existing PVG prices only: 1 credit/second (5–15 seconds), 5 credits for subsequent films after a ready film. Replace this resolver when Admin pricing is introduced.';
CREATE OR REPLACE FUNCTION public.purchase_pvg_final_video(_user_id uuid,_project_id uuid,_previous_video_id uuid,_snapshot jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pvg_projects%ROWTYPE; w public.credit_wallets%ROWTYPE; v public.pvg_videos%ROWTYPE; latest uuid; k text; price integer; seconds integer; another boolean; vid uuid:=gen_random_uuid(); tx uuid:=gen_random_uuid();
BEGIN
 SELECT * INTO p FROM public.pvg_projects WHERE id=_project_id AND user_id=_user_id AND deleted_at IS NULL AND NOT permanently_deleted FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','unauthorized'); END IF;
 k:=COALESCE(_previous_video_id::text,'initial');
 SELECT * INTO v FROM public.pvg_videos WHERE project_id=p.id AND payment_key=k;
 IF FOUND THEN RETURN jsonb_build_object('ok',true,'created',false,'video_id',v.id); END IF;
 SELECT id INTO latest FROM public.pvg_videos WHERE project_id=p.id ORDER BY created_at DESC,id DESC LIMIT 1;
 IF latest IS DISTINCT FROM _previous_video_id THEN RETURN jsonb_build_object('ok',false,'error','stale_operation'); END IF;
 SELECT * INTO v FROM public.pvg_videos WHERE project_id=p.id AND status IN ('pending','processing','lipsync','assets') ORDER BY created_at DESC LIMIT 1;
 IF FOUND THEN RETURN jsonb_build_object('ok',true,'created',false,'video_id',v.id); END IF;
 IF _previous_video_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pvg_videos WHERE id=_previous_video_id AND status='failed' AND credits_charged>0) THEN RETURN jsonb_build_object('ok',false,'error','refund_pending'); END IF;
 seconds:=LEAST(15,GREATEST(5,COALESCE(p.video_duration_seconds,10)));
 IF NOT EXISTS(SELECT 1 FROM public.pvg_scenes WHERE id=p.selected_scene_id AND project_id=p.id AND user_id=_user_id AND status='ready') OR NOT EXISTS(SELECT 1 FROM public.pvg_people WHERE id=p.single_speaker_person_id AND project_id=p.id AND user_id=_user_id AND COALESCE(role,'speaker')='speaker') OR COALESCE((_snapshot->>'duration')::integer,0)<>seconds OR (_snapshot->>'scene_id') IS DISTINCT FROM p.selected_scene_id::text OR (_snapshot->>'speaker_id') IS DISTINCT FROM p.single_speaker_person_id::text OR COALESCE(_snapshot->>'prompt','')='' OR COALESCE(_snapshot->>'audioUrl','')='' OR COALESCE(_snapshot->>'imageUrl','')='' THEN RETURN jsonb_build_object('ok',false,'error','invalid_operation'); END IF;
 another:=EXISTS(SELECT 1 FROM public.pvg_videos WHERE project_id=p.id AND status='ready'); price:=public.pvg_final_price(seconds,another);
 SELECT * INTO w FROM public.credit_wallets WHERE user_id=_user_id FOR UPDATE;
 IF NOT FOUND OR w.balance-COALESCE(w.reserved,0)<price THEN RETURN jsonb_build_object('ok',false,'error','insufficient_credits','balance',COALESCE(w.balance,0)); END IF;
 UPDATE public.credit_wallets SET balance=balance-price,lifetime_spent=lifetime_spent+price WHERE id=w.id;
 INSERT INTO public.credit_transactions(id,wallet_id,user_id,txn_type,amount,balance_before,balance_after,description,metadata,source,reference_id)
 VALUES(tx,w.id,_user_id,'order_charge',-price,w.balance,w.balance-price,'Personal video greeting — the film',jsonb_build_object('project_id',p.id,'video_id',vid,'seconds',seconds,'regeneration',another,'payment_key',k),'pvg_final',vid::text);
 INSERT INTO public.pvg_videos(id,project_id,user_id,job_id,status,duration_seconds,scene_sounds,credits_charged,variant_index,action_description,seed,audio_seconds,speaker_person_id,payment_key,charge_txn_id,submission_state,request_snapshot)
 VALUES(vid,p.id,_user_id,'pvg-'||vid::text,'pending',seconds,false,price,COALESCE((SELECT MAX(variant_index) FROM public.pvg_videos WHERE project_id=p.id),0)+1,p.action_description,(_snapshot->>'seed')::bigint,(_snapshot->>'audioSeconds')::numeric,p.single_speaker_person_id,k,tx,'paid',_snapshot);
 UPDATE public.pvg_projects SET credits_charged=credits_charged+price,status='video_generating' WHERE id=p.id;
 RETURN jsonb_build_object('ok',true,'created',true,'video_id',vid,'balance',w.balance-price);
END $$;
REVOKE ALL ON FUNCTION public.purchase_pvg_final_video(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_pvg_final_video(uuid,uuid,uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_pvg_video_submission(_video_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.pvg_videos SET submission_state='dispatching',updated_at=now() WHERE id=_video_id AND submission_state='paid' AND status='pending';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_pvg_video_submission(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pvg_video_submission(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_pvg_video_reconcile(_video_id uuid,_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.pvg_videos SET reconcile_token=_token,reconcile_until=now()+interval '3 minutes' WHERE id=_video_id AND status NOT IN ('ready') AND (status<>'failed' OR credits_charged>0) AND (reconcile_until IS NULL OR reconcile_until<now());
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_pvg_video_reconcile(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pvg_video_reconcile(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.refund_pvg_video_credits(_video_id uuid,_reason text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.pvg_videos%ROWTYPE; w public.credit_wallets%ROWTYPE; debit public.credit_transactions%ROWTYPE; pid uuid; amount integer; tx uuid:=gen_random_uuid();
BEGIN
 SELECT project_id INTO pid FROM public.pvg_videos WHERE id=_video_id;
 IF NOT FOUND THEN RETURN 0; END IF;
 PERFORM 1 FROM public.pvg_projects WHERE id=pid FOR UPDATE;
 SELECT * INTO v FROM public.pvg_videos WHERE id=_video_id FOR UPDATE;
 IF NOT FOUND OR v.status<>'failed' OR v.credits_charged<=0 OR v.refund_txn_id IS NOT NULL THEN RETURN 0; END IF;
 IF v.charge_txn_id IS NOT NULL THEN
  SELECT * INTO debit FROM public.credit_transactions WHERE id=v.charge_txn_id AND user_id=v.user_id AND txn_type='order_charge' AND amount<0 AND metadata->>'video_id'=v.id::text AND metadata->>'project_id'=v.project_id::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'eligible_debit_missing'; END IF;
  amount:=-debit.amount;
 ELSE
  -- Legacy server-protected jobs retain their existing refund entitlement; no history rewrite/backfill.
  amount:=v.credits_charged;
 END IF;
 SELECT * INTO w FROM public.credit_wallets WHERE user_id=v.user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN 0; END IF;
 INSERT INTO public.credit_transactions(id,wallet_id,user_id,txn_type,amount,balance_before,balance_after,description,metadata,source,reference_id)
 VALUES(tx,w.id,v.user_id,'refund',amount,w.balance,w.balance+amount,'Personal video greeting — refund for a film that could not be made',jsonb_build_object('project_id',v.project_id,'video_id',v.id,'charge_txn_id',v.charge_txn_id,'reason',left(_reason,80)),'pvg_final_refund',v.id::text);
 UPDATE public.pvg_videos SET credits_charged=0,refund_txn_id=tx,submission_state=CASE WHEN charge_txn_id IS NOT NULL THEN 'refunded' ELSE submission_state END WHERE id=v.id;
 UPDATE public.credit_wallets SET balance=balance+amount,lifetime_spent=GREATEST(0,lifetime_spent-amount) WHERE id=w.id;
 UPDATE public.pvg_projects SET credits_charged=GREATEST(0,credits_charged-amount) WHERE id=v.project_id;
 RETURN amount;
END $$;
REVOKE ALL ON FUNCTION public.refund_pvg_video_credits(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_pvg_video_credits(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_pvg_paid_video() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN IF OLD.payment_key IS NOT NULL THEN RAISE EXCEPTION 'paid_operation_must_be_retained'; END IF; RETURN OLD; END IF;
 IF OLD.payment_key IS NOT NULL THEN
  IF (NEW.payment_key,NEW.charge_txn_id,NEW.project_id,NEW.user_id,NEW.duration_seconds,NEW.request_snapshot) IS DISTINCT FROM (OLD.payment_key,OLD.charge_txn_id,OLD.project_id,OLD.user_id,OLD.duration_seconds,OLD.request_snapshot) THEN RAISE EXCEPTION 'immutable_paid_operation'; END IF;
  IF OLD.status IN ('ready','failed') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'terminal_paid_operation'; END IF;
  IF NEW.credits_charged IS DISTINCT FROM OLD.credits_charged AND NOT(NEW.credits_charged=0 AND OLD.status='failed' AND NEW.refund_txn_id IS NOT NULL) THEN RAISE EXCEPTION 'immutable_charge'; END IF;
  IF OLD.refund_txn_id IS NOT NULL AND NEW.refund_txn_id IS DISTINCT FROM OLD.refund_txn_id THEN RAISE EXCEPTION 'immutable_refund'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_pvg_paid_video BEFORE UPDATE OR DELETE ON public.pvg_videos FOR EACH ROW EXECUTE FUNCTION public.guard_pvg_paid_video();
REVOKE INSERT,UPDATE,DELETE ON public.pvg_videos FROM anon,authenticated;

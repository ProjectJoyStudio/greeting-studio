ALTER TABLE public.pvg_videos
  ADD COLUMN IF NOT EXISTS speech_route text GENERATED ALWAYS AS (COALESCE(request_snapshot->>'route','person')) STORED,
  ADD COLUMN IF NOT EXISTS dispatch_fingerprint text,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS review_flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reconcile_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_reconcile_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reconcile_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reconcile_error text,
  ADD COLUMN IF NOT EXISTS callback_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_callback_at timestamptz;

CREATE INDEX IF NOT EXISTS pvg_videos_reconcile_queue_idx ON public.pvg_videos (next_reconcile_at)
  WHERE status IN ('pending','processing','lipsync','assets') AND NOT needs_review;
CREATE INDEX IF NOT EXISTS pvg_videos_needs_review_idx ON public.pvg_videos (review_flagged_at) WHERE needs_review;

CREATE TABLE IF NOT EXISTS public.pvg_provider_callbacks (
  delivery_id text PRIMARY KEY,
  provider text NOT NULL,
  video_id uuid,
  prediction_id text,
  event text,
  outcome text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.pvg_provider_callbacks FROM anon, authenticated;
GRANT ALL ON public.pvg_provider_callbacks TO service_role;
ALTER TABLE public.pvg_provider_callbacks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pvg_dispatch_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex'),
  enabled boolean NOT NULL DEFAULT true,
  callback_base_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.pvg_dispatch_config FROM anon, authenticated;
GRANT ALL ON public.pvg_dispatch_config TO service_role;
ALTER TABLE public.pvg_dispatch_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.pvg_dispatch_config(id, callback_base_url)
VALUES (true, 'https://project--527db7eb-cbf0-46e8-a821-e3b4695af01e-dev.lovable.app')
ON CONFLICT (id) DO NOTHING;

DO $$ DECLARE def text; before text; BEGIN
 def:=pg_get_functiondef('public.purchase_pvg_final_video(uuid,uuid,uuid,jsonb)'::regprocedure);
 before:=def;
 def:=replace(def,
  'NOT EXISTS(SELECT 1 FROM public.pvg_people WHERE id=(_snapshot->>''speaker_id'')::uuid AND project_id=p.id AND user_id=_user_id AND COALESCE(role,''speaker'')=''speaker'')',
  'NOT ((COALESCE(_snapshot->>''route'',''person'')=''person'' AND COALESCE(_snapshot->>''speaker_id'','''')<>'''' AND EXISTS(SELECT 1 FROM public.pvg_people WHERE id=NULLIF(_snapshot->>''speaker_id'','''')::uuid AND project_id=p.id AND user_id=_user_id AND COALESCE(role,''speaker'')=''speaker'')) OR (_snapshot->>''route''=''scene'' AND COALESCE(_snapshot->>''speaker_id'','''')='''' AND NOT EXISTS(SELECT 1 FROM public.pvg_people WHERE project_id=p.id AND COALESCE(role,''speaker'')=''speaker'') AND EXISTS(SELECT 1 FROM public.pvg_people WHERE project_id=p.id AND user_id=_user_id AND role=''narrator'')))');
 IF def=before THEN RAISE EXCEPTION 'purchase speaker clause not found'; END IF;
 before:=def;
 def:=replace(def,
  '(p.single_speaker_person_id IS NOT NULL AND (_snapshot->>''speaker_id'') IS DISTINCT FROM p.single_speaker_person_id::text)',
  '(p.single_speaker_person_id IS NOT NULL AND COALESCE(_snapshot->>''speaker_id'','''')<>'''' AND (_snapshot->>''speaker_id'') IS DISTINCT FROM p.single_speaker_person_id::text)');
 IF def=before THEN RAISE EXCEPTION 'purchase speaker match clause not found'; END IF;
 before:=def;
 def:=replace(def,'(_snapshot->>''speaker_id'')::uuid,k,tx','NULLIF(_snapshot->>''speaker_id'','''')::uuid,k,tx');
 IF def=before THEN RAISE EXCEPTION 'purchase insert clause not found'; END IF;
 EXECUTE def;
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_pvg_video(_video_id uuid, _action text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v public.pvg_videos%ROWTYPE; refunded integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
 SELECT * INTO v FROM public.pvg_videos WHERE id=_video_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
 IF _action='recheck' THEN
  IF v.status IN ('ready','failed') THEN RETURN jsonb_build_object('ok',false,'error','terminal'); END IF;
  UPDATE public.pvg_videos SET needs_review=false, reconcile_attempts=0, next_reconcile_at=now(), reviewed_at=now(), reviewed_by=auth.uid(),
    review_reason=left(COALESCE(_note,'admin recheck')||' | '||COALESCE(review_reason,''),500) WHERE id=v.id;
  RETURN jsonb_build_object('ok',true,'action','recheck');
 ELSIF _action='confirm_failed' THEN
  IF v.status='ready' THEN RETURN jsonb_build_object('ok',false,'error','terminal'); END IF;
  IF v.status<>'failed' THEN
   UPDATE public.pvg_videos SET status='failed', error_code='admin_confirmed_failure', error_message=left(COALESCE(_note,'Confirmed failed by administrator'),300),
     needs_review=false, reviewed_at=now(), reviewed_by=auth.uid(), completed_at=now() WHERE id=v.id;
  END IF;
  IF v.credits_charged>0 THEN refunded:=COALESCE(public.refund_pvg_video_credits(v.id,'admin_confirmed_failure'),0); END IF;
  UPDATE public.pvg_projects SET status='video_failed' WHERE id=v.project_id AND status='video_generating';
  RETURN jsonb_build_object('ok',true,'action','confirm_failed','refunded',refunded);
 END IF;
 RETURN jsonb_build_object('ok',false,'error','unknown_action');
END $$;
REVOKE ALL ON FUNCTION public.admin_resolve_pvg_video(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_pvg_video(uuid,text,text) TO authenticated, service_role;
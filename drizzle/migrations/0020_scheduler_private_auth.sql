CREATE TABLE IF NOT EXISTS public.live_cards_dispatch_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex'),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.live_cards_dispatch_config FROM anon, authenticated;
GRANT ALL ON public.live_cards_dispatch_config TO service_role;
ALTER TABLE public.live_cards_dispatch_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.live_cards_dispatch_config(id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.live_card_animations ADD COLUMN IF NOT EXISTS reconcile_until timestamptz;

CREATE OR REPLACE FUNCTION public.claim_live_card_reconcile(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int; BEGIN
  UPDATE public.live_card_animations SET reconcile_until = now() + interval '3 minutes'
   WHERE id=_id AND status IN ('preparing','queued','processing','storing')
     AND (reconcile_until IS NULL OR reconcile_until < now());
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n=1;
END $$;
REVOKE ALL ON FUNCTION public.claim_live_card_reconcile(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_card_reconcile(uuid) TO service_role;

SELECT cron.alter_job(2, command := $c$select net.http_post(url:='https://project--527db7eb-cbf0-46e8-a821-e3b4695af01e-dev.lovable.app/api/public/live-cards-reconcile', headers:=jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4b3JuaG10Y2N6dmx6Zmt5aWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Mzg2MDMsImV4cCI6MjEwMDExNDYwM30.zm_GedWEwHvzPwjykMzeM6dNqdo8vuHqS8bIpjGMVt4','Authorization','Bearer '||(select secret from public.live_cards_dispatch_config where id)), body:='{}'::jsonb) as request_id$c$);
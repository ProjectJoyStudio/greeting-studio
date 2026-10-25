-- lovable-cron-fallback-reviewed: Bounded queue wakes on enqueue, retries deadlines each minute only while pending, unschedules after drain; no enabled delayed workflow provider.
ALTER TABLE public.storage_placements ADD COLUMN backup_auto_retry boolean NOT NULL DEFAULT false, ADD COLUMN backup_lease_token uuid, ADD COLUMN backup_lease_until timestamptz, ADD COLUMN backup_retry_count integer NOT NULL DEFAULT 0, ADD COLUMN backup_stage text, ADD COLUMN backup_diagnostics jsonb, ADD COLUMN backup_history jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX storage_backup_due_idx ON public.storage_placements(retry_after) WHERE backup_auto_retry AND role='backup' AND status IN ('pending','copying','failed');
CREATE TABLE public.memory_book_backup_dispatch_config(id boolean PRIMARY KEY DEFAULT true CHECK(id), endpoint text, secret text NOT NULL DEFAULT (gen_random_uuid()::text || gen_random_uuid()::text), enabled boolean NOT NULL DEFAULT false);
GRANT ALL ON public.memory_book_backup_dispatch_config TO service_role;
ALTER TABLE public.memory_book_backup_dispatch_config ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.dispatch_memory_book_backups() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.memory_book_backup_dispatch_config; j bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(67290311);
 SELECT * INTO c FROM public.memory_book_backup_dispatch_config WHERE id;
 IF NOT FOUND OR NOT c.enabled OR c.endpoint IS NULL THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.storage_placements WHERE backup_auto_retry AND role='backup' AND status IN ('pending','copying','failed') AND backup_retry_count<5) THEN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname='memory-book-backup-retry' LOOP PERFORM cron.unschedule(j); END LOOP;
  RETURN;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='memory-book-backup-retry') THEN
  PERFORM cron.schedule('memory-book-backup-retry','* * * * *','select public.dispatch_memory_book_backups()');
 END IF;
 IF EXISTS(SELECT 1 FROM public.storage_placements WHERE backup_auto_retry AND role='backup' AND status IN ('pending','copying','failed') AND backup_retry_count<5 AND (retry_after IS NULL OR retry_after<=now()) AND (backup_lease_until IS NULL OR backup_lease_until<=now())) THEN
  PERFORM net.http_post(url:=c.endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||c.secret),body:='{}'::jsonb,timeout_milliseconds:=120000);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.arm_memory_book_backup_queue() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.backup_auto_retry AND NEW.role='backup' AND NEW.status IN ('pending','copying','failed') AND NEW.backup_retry_count<5 THEN PERFORM public.dispatch_memory_book_backups(); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER storage_backup_wake AFTER INSERT OR UPDATE OF backup_auto_retry,status,retry_after ON public.storage_placements FOR EACH ROW EXECUTE FUNCTION public.arm_memory_book_backup_queue();
CREATE OR REPLACE FUNCTION public.claim_memory_book_backup(_key text,_provider text,_token uuid,_manual boolean DEFAULT false) RETURNS SETOF public.storage_placements LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF _key !~ '^users/[^/]+/memory-book/[^/]+/(working|completed)/' THEN RETURN; END IF;
 INSERT INTO public.storage_placements(object_key,provider,role,status,backup_auto_retry) VALUES(_key,_provider,'backup','pending',true) ON CONFLICT(object_key,provider) DO NOTHING;
 RETURN QUERY UPDATE public.storage_placements SET status='copying',backup_auto_retry=true,backup_lease_token=_token,backup_lease_until=now()+interval '15 minutes',attempts=attempts+1,backup_retry_count=CASE WHEN _manual THEN 1 ELSE backup_retry_count+1 END,backup_stage='claimed',retry_after=NULL
 WHERE object_key=_key AND provider=_provider AND role='backup' AND status NOT IN ('deleted','deleting') AND (backup_lease_until IS NULL OR backup_lease_until<=now()) AND (_manual OR (backup_retry_count<5 AND status<>'present' AND (retry_after IS NULL OR retry_after<=now()))) RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_memory_book_backups(), public.arm_memory_book_backup_queue(), public.claim_memory_book_backup(text,text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_memory_book_backups(), public.arm_memory_book_backup_queue(), public.claim_memory_book_backup(text,text,uuid,boolean) TO service_role;
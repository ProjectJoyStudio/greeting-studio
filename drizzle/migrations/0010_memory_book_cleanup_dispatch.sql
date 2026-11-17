-- lovable-cron-fallback-reviewed: wake-on-enqueue queue; per-minute retry exists only while cleanup is pending and is unscheduled after drain
ALTER TABLE public.memory_book_storage_operations
 ADD COLUMN IF NOT EXISTS cleanup_next_at timestamptz,
 ADD COLUMN IF NOT EXISTS cleanup_retry_count integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS cleanup_total integer,
 ADD COLUMN IF NOT EXISTS cleanup_deleted_primary integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS cleanup_deleted_backup integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS cleanup_remaining integer,
 ADD COLUMN IF NOT EXISTS cleanup_last_success_at timestamptz,
 ADD COLUMN IF NOT EXISTS cleanup_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.dispatch_memory_book_cleanups()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.memory_book_backup_dispatch_config; j bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(67290312);
 SELECT * INTO c FROM public.memory_book_backup_dispatch_config WHERE id;
 IF NOT FOUND OR NOT c.enabled OR c.endpoint IS NULL OR NOT EXISTS(SELECT 1 FROM public.memory_book_storage_operations WHERE activated_at IS NOT NULL AND stage IN ('cleanup_pending','cleanup_running')) THEN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname='memory-book-cleanup' LOOP PERFORM cron.unschedule(j); END LOOP;
  RETURN;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='memory-book-cleanup') THEN
  PERFORM cron.schedule('memory-book-cleanup','* * * * *','select public.dispatch_memory_book_cleanups()');
 END IF;
 IF EXISTS(SELECT 1 FROM public.memory_book_storage_operations WHERE activated_at IS NOT NULL AND stage IN ('cleanup_pending','cleanup_running') AND (cleanup_next_at IS NULL OR cleanup_next_at<=now()) AND (lease_until IS NULL OR lease_until<=now())) THEN
  PERFORM net.http_post(url:=replace(c.endpoint,'/api/public/memory-book-backup-retry','/api/public/memory-book-cleanup'),headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||c.secret),body:='{}'::jsonb,timeout_milliseconds:=120000);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_memory_book_cleanups() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.arm_memory_book_cleanup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NEW.activated_at IS NOT NULL AND NEW.stage='cleanup_pending' AND (TG_OP='INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN PERFORM public.dispatch_memory_book_cleanups(); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.arm_memory_book_cleanup() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS arm_memory_book_cleanup ON public.memory_book_storage_operations;
CREATE TRIGGER arm_memory_book_cleanup AFTER INSERT OR UPDATE OF stage ON public.memory_book_storage_operations FOR EACH ROW EXECUTE FUNCTION public.arm_memory_book_cleanup();
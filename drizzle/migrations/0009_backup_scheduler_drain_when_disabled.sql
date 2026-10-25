-- lovable-cron-fallback-reviewed: Same bounded queue only, wake on enqueue and unschedule when disabled or drained, up to 1440 checks/day while pending.
CREATE OR REPLACE FUNCTION public.dispatch_memory_book_backups() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.memory_book_backup_dispatch_config; j bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(67290311);
 SELECT * INTO c FROM public.memory_book_backup_dispatch_config WHERE id;
 IF NOT FOUND OR NOT c.enabled OR c.endpoint IS NULL OR NOT EXISTS(SELECT 1 FROM public.storage_placements WHERE backup_auto_retry AND role='backup' AND status IN ('pending','copying','failed') AND backup_retry_count<5) THEN
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
REVOKE ALL ON FUNCTION public.dispatch_memory_book_backups() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_memory_book_backups() TO service_role;
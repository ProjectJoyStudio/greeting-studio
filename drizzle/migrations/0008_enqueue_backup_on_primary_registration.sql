CREATE OR REPLACE FUNCTION public.enqueue_registered_memory_book_backup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.role='primary' AND NEW.status='present' AND NEW.object_key ~ '^users/[^/]+/memory-book/[^/]+/(working|completed)/' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'present') THEN
  INSERT INTO public.storage_placements(object_key,provider,role,status,backup_auto_retry,project_id,user_id,product,retry_after) VALUES(NEW.object_key,'b2','backup','pending',true,NEW.project_id,NEW.user_id,NEW.product,now()) ON CONFLICT(object_key,provider) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER storage_primary_enqueue_backup AFTER INSERT OR UPDATE OF status ON public.storage_placements FOR EACH ROW EXECUTE FUNCTION public.enqueue_registered_memory_book_backup();
REVOKE ALL ON FUNCTION public.enqueue_registered_memory_book_backup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_registered_memory_book_backup() TO service_role;
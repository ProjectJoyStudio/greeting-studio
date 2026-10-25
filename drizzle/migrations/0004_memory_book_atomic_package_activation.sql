ALTER TABLE public.memory_book_projects ALTER COLUMN storage_version SET DEFAULT 2;
CREATE OR REPLACE FUNCTION public.validate_memory_book_storage_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE current_book jsonb; current_pages jsonb;
BEGIN
 SELECT to_jsonb(p) INTO current_book FROM public.memory_book_projects p WHERE id=NEW.book_id AND user_id=NEW.user_id FOR UPDATE;
 IF current_book IS NULL OR current_book->>'status'='completed' THEN RAISE EXCEPTION 'book_not_editable'; END IF;
 IF NEW.snapshot->'book' IS DISTINCT FROM current_book THEN RAISE EXCEPTION 'snapshot_changed_retry'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb) INTO current_pages FROM public.memory_book_pages p WHERE book_id=NEW.book_id AND user_id=NEW.user_id;
 IF current_pages IS DISTINCT FROM (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'id'),'[]'::jsonb) FROM jsonb_array_elements(NEW.snapshot->'pages') x) THEN RAISE EXCEPTION 'snapshot_changed_retry'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER memory_book_storage_snapshot_validation BEFORE INSERT ON public.memory_book_storage_operations FOR EACH ROW EXECUTE FUNCTION public.validate_memory_book_storage_snapshot();
CREATE OR REPLACE FUNCTION public.activate_memory_book_storage(_book_id uuid,_user_id uuid,_lease_token uuid,_retention_days integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.memory_book_storage_operations; ts timestamptz:=now();
BEGIN
 SELECT * INTO op FROM public.memory_book_storage_operations WHERE book_id=_book_id AND user_id=_user_id AND lease_token=_lease_token FOR UPDATE;
 IF NOT FOUND OR op.activated_at IS NOT NULL THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(op.manifest) a WHERE a->>'primaryVerified' IS DISTINCT FROM 'true' OR a->>'backupVerified' IS DISTINCT FROM 'true' OR COALESCE(a->>'checksum','') NOT LIKE 'sha256:%') THEN RAISE EXCEPTION 'package_not_verified'; END IF;
 UPDATE public.memory_book_storage_operations SET activated_at=ts,stage='cleanup_pending',lease_token=NULL,lease_until=NULL,updated_at=ts WHERE book_id=_book_id;
 UPDATE public.memory_book_projects SET status='completed',completed_at=ts,completion_method=op.method,retention_expires_at=ts+make_interval(days=>_retention_days),storage_version=2,working_cleaned_at=NULL WHERE id=_book_id AND user_id=_user_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.activate_memory_book_storage(uuid,uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_memory_book_storage(uuid,uuid,uuid,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_memory_book_storage_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE b uuid; locked boolean;
BEGIN
 IF TG_TABLE_NAME='memory_book_projects' THEN b=COALESCE(NEW.id,OLD.id); ELSE b=COALESCE(NEW.book_id,OLD.book_id); END IF;
 PERFORM id FROM public.memory_book_projects WHERE id=b FOR UPDATE;
 SELECT EXISTS(SELECT 1 FROM public.memory_book_storage_operations WHERE book_id=b) INTO locked;
 IF locked THEN
  IF TG_TABLE_NAME='memory_book_projects' AND (to_jsonb(NEW)-ARRAY['status','completed_at','completion_method','retention_expires_at','working_cleaned_at','updated_at','last_view','last_page','expires_at','storage_version']) = (to_jsonb(OLD)-ARRAY['status','completed_at','completion_method','retention_expires_at','working_cleaned_at','updated_at','last_view','last_page','expires_at','storage_version']) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'memory_book_storage_locked';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
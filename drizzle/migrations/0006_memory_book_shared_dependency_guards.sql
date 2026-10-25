CREATE OR REPLACE FUNCTION public.guard_memory_book_shared_dependency() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE dependency_bucket text; dependency_path text; in_use boolean;
BEGIN
 dependency_bucket:=CASE WHEN TG_TABLE_NAME='music_tracks' THEN to_jsonb(OLD)->>'storage_bucket' ELSE to_jsonb(OLD)->>'bucket' END;
 dependency_path:=CASE WHEN TG_TABLE_NAME='music_tracks' THEN to_jsonb(OLD)->>'storage_path' ELSE to_jsonb(OLD)->>'path' END;
 SELECT EXISTS(SELECT 1 FROM public.memory_book_storage_operations op, jsonb_array_elements(op.manifest) a WHERE a->>'bucket'=dependency_bucket AND a->>'path'=dependency_path) INTO in_use;
 IF in_use THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'completed_book_dependency_protected'; END IF;
  IF TG_TABLE_NAME='music_tracks' AND (NEW.storage_bucket IS DISTINCT FROM OLD.storage_bucket OR NEW.storage_path IS DISTINCT FROM OLD.storage_path) THEN RAISE EXCEPTION 'completed_book_dependency_protected'; END IF;
  IF TG_TABLE_NAME<>'music_tracks' AND (to_jsonb(NEW)->>'bucket' IS DISTINCT FROM dependency_bucket OR to_jsonb(NEW)->>'path' IS DISTINCT FROM dependency_path) THEN RAISE EXCEPTION 'completed_book_dependency_protected'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER memory_book_decoration_dependency_guard BEFORE UPDATE OR DELETE ON public.memory_book_decorations FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_shared_dependency();
CREATE TRIGGER memory_book_music_dependency_guard BEFORE UPDATE OR DELETE ON public.music_tracks FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_shared_dependency();
CREATE TRIGGER memory_book_design_dependency_guard BEFORE UPDATE OR DELETE ON public.memory_book_designs FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_shared_dependency();
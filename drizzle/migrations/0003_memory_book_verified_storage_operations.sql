ALTER TABLE public.memory_book_projects ADD COLUMN storage_version integer;
ALTER TABLE public.storage_placements ADD COLUMN transfer_state jsonb;
ALTER TABLE public.storage_placements ADD COLUMN retry_after timestamptz;
ALTER TABLE public.storage_placements ADD COLUMN user_id uuid;
ALTER TABLE public.storage_placements ADD COLUMN product text;
ALTER TABLE public.storage_placements ADD COLUMN project_id uuid;
CREATE TABLE public.memory_book_storage_operations (
 book_id uuid PRIMARY KEY REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 kind text NOT NULL CHECK (kind IN ('finalize','migration')),
 stage text NOT NULL DEFAULT 'requested' CHECK (stage IN ('requested','preparing','primary_verifying','backup_verifying','activating','cleanup_pending','cleanup_running','cleanup_completed','cleanup_failed','failed')),
 manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
 snapshot jsonb,
 cursor integer NOT NULL DEFAULT 0,
 lease_token uuid,
 lease_until timestamptz,
 last_error text,
 cleanup_results jsonb NOT NULL DEFAULT '[]'::jsonb,
 emergency_until timestamptz,
 activated_at timestamptz,
 method text NOT NULL DEFAULT 'cabinet',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.memory_book_storage_operations TO authenticated;
GRANT ALL ON public.memory_book_storage_operations TO service_role;
ALTER TABLE public.memory_book_storage_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read storage operations" ON public.memory_book_storage_operations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX memory_book_storage_operations_pending ON public.memory_book_storage_operations(stage,updated_at);
CREATE INDEX storage_placements_retry ON public.storage_placements(retry_after) WHERE status IN ('pending','failed','copying');
CREATE OR REPLACE FUNCTION public.guard_memory_book_storage_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE b uuid; locked boolean;
BEGIN
 IF TG_TABLE_NAME='memory_book_projects' THEN b=NEW.id; ELSE b=COALESCE(NEW.book_id,OLD.book_id); END IF;
 SELECT EXISTS(SELECT 1 FROM public.memory_book_storage_operations WHERE book_id=b AND (activated_at IS NOT NULL OR stage NOT IN ('failed'))) INTO locked;
 IF locked THEN
  IF TG_TABLE_NAME='memory_book_projects' AND (to_jsonb(NEW)-ARRAY['status','completed_at','completion_method','retention_expires_at','working_cleaned_at','updated_at','last_view','last_page','expires_at','storage_version']) = (to_jsonb(OLD)-ARRAY['status','completed_at','completion_method','retention_expires_at','working_cleaned_at','updated_at','last_view','last_page','expires_at','storage_version']) THEN RETURN NEW; END IF;
  IF TG_OP='DELETE' AND EXISTS(SELECT 1 FROM public.memory_book_storage_operations WHERE book_id=b AND stage='cleanup_running') THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'memory_book_storage_locked';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER memory_book_storage_project_guard BEFORE UPDATE ON public.memory_book_projects FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_storage_snapshot();
CREATE TRIGGER memory_book_storage_pages_guard BEFORE INSERT OR UPDATE OR DELETE ON public.memory_book_pages FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_storage_snapshot();
CREATE TRIGGER memory_book_storage_materials_guard BEFORE INSERT OR UPDATE OR DELETE ON public.memory_book_materials FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_storage_snapshot();
CREATE TRIGGER memory_book_storage_designs_guard BEFORE INSERT OR UPDATE OR DELETE ON public.memory_book_designs FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_storage_snapshot();
CREATE TRIGGER memory_book_storage_backgrounds_guard BEFORE INSERT OR UPDATE OR DELETE ON public.memory_book_page_backgrounds FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_storage_snapshot();
CREATE TRIGGER memory_book_storage_music_guard BEFORE INSERT OR UPDATE OR DELETE ON public.memory_book_music_variants FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_storage_snapshot();
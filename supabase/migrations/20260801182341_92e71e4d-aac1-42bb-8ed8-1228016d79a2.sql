CREATE TABLE public.pvg_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text,
  occasion text,
  scene_description text,
  status text NOT NULL DEFAULT 'draft',
  generations_used integer NOT NULL DEFAULT 0,
  generations_limit integer NOT NULL DEFAULT 5,
  credits_charged integer NOT NULL DEFAULT 0,
  selected_scene_id uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pvg_projects TO authenticated;
GRANT ALL ON public.pvg_projects TO service_role;
ALTER TABLE public.pvg_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.pvg_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pvg_projects_updated_at BEFORE UPDATE ON public.pvg_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX pvg_projects_user_idx ON public.pvg_projects (user_id, updated_at DESC);

CREATE TABLE public.pvg_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pvg_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  position integer NOT NULL DEFAULT 0,
  original_bucket text,
  original_path text,
  optimized_bucket text,
  optimized_path text,
  extra_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  face_quality text NOT NULL DEFAULT 'unknown',
  source text NOT NULL DEFAULT 'individual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pvg_people TO authenticated;
GRANT ALL ON public.pvg_people TO service_role;
ALTER TABLE public.pvg_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own people" ON public.pvg_people FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pvg_people_updated_at BEFORE UPDATE ON public.pvg_people
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX pvg_people_project_idx ON public.pvg_people (project_id, position);

CREATE TABLE public.pvg_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pvg_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variation_index integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  prompt text,
  prompt_en text,
  prediction_id text,
  generator_key text,
  generator_model text,
  storage_bucket text,
  storage_path text,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pvg_scenes TO authenticated;
GRANT ALL ON public.pvg_scenes TO service_role;
ALTER TABLE public.pvg_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scenes" ON public.pvg_scenes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pvg_scenes_updated_at BEFORE UPDATE ON public.pvg_scenes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX pvg_scenes_project_idx ON public.pvg_scenes (project_id, variation_index);
CREATE INDEX pvg_scenes_pending_idx ON public.pvg_scenes (status) WHERE status IN ('pending','processing');
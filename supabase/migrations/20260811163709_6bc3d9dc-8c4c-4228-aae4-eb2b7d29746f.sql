ALTER TABLE public.pvg_projects ADD COLUMN IF NOT EXISTS scene_sounds boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.pvg_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.pvg_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  duration_seconds integer NOT NULL DEFAULT 5,
  scene_sounds boolean NOT NULL DEFAULT false,
  credits_charged integer NOT NULL DEFAULT 0,
  prediction_id text,
  generator_key text,
  generator_model text,
  storage_bucket text,
  storage_path text,
  error_code text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS pvg_videos_project_idx ON public.pvg_videos(project_id);
CREATE INDEX IF NOT EXISTS pvg_videos_status_idx ON public.pvg_videos(status);

GRANT SELECT ON public.pvg_videos TO authenticated;
GRANT ALL ON public.pvg_videos TO service_role;

ALTER TABLE public.pvg_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pvg_videos_owner_read" ON public.pvg_videos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER pvg_videos_set_updated_at
  BEFORE UPDATE ON public.pvg_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
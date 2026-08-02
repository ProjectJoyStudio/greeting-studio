ALTER TABLE public.pvg_projects
  ADD COLUMN IF NOT EXISTS workflow_step text NOT NULL DEFAULT 'scene',
  ADD COLUMN IF NOT EXISTS purge_after timestamptz,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS restored_by uuid,
  ADD COLUMN IF NOT EXISTS permanently_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS voice_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS music_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS volume_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS order_cost integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_saved_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS edit_session_id text,
  ADD COLUMN IF NOT EXISTS edit_heartbeat_at timestamptz;

CREATE INDEX IF NOT EXISTS pvg_projects_deleted_idx ON public.pvg_projects (deleted_at, purge_after);

CREATE TABLE IF NOT EXISTS public.pvg_project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pvg_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pvg_project_versions_unique ON public.pvg_project_versions (project_id, version);

GRANT SELECT ON public.pvg_project_versions TO authenticated;
GRANT ALL ON public.pvg_project_versions TO service_role;

ALTER TABLE public.pvg_project_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their project versions"
  ON public.pvg_project_versions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.app_settings (key, value)
VALUES ('pvg_retention_days', '{"days": 3}'::jsonb)
ON CONFLICT (key) DO NOTHING;
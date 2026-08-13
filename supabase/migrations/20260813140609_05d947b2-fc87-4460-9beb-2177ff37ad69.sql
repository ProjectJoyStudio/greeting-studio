ALTER TABLE public.pvg_projects ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
CREATE INDEX IF NOT EXISTS pvg_projects_delivered_at_idx ON public.pvg_projects (delivered_at);
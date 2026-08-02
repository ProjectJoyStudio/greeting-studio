ALTER TABLE public.pvg_projects
  ADD COLUMN IF NOT EXISTS video_duration_seconds integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS greeting_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS greeting_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS greeting_keywords text NOT NULL DEFAULT '';
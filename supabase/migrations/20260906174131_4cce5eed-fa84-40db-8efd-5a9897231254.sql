ALTER TABLE public.memory_book_projects
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_method text,
  ADD COLUMN IF NOT EXISTS retention_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS working_cleaned_at timestamptz;

INSERT INTO public.app_settings (key, value)
VALUES ('memory_book.completed_retention_days', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;
ALTER TABLE public.pvg_personal_voices
  ADD COLUMN IF NOT EXISTS samples jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sample_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS preview_bucket text,
  ADD COLUMN IF NOT EXISTS preview_path text,
  ADD COLUMN IF NOT EXISTS preview_mime text,
  ADD COLUMN IF NOT EXISTS test_text text;
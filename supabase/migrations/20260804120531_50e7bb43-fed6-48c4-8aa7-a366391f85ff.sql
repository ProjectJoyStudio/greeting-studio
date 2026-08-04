ALTER TABLE public.pvg_people
  ADD COLUMN IF NOT EXISTS voice_id text,
  ADD COLUMN IF NOT EXISTS voice_name text,
  ADD COLUMN IF NOT EXISTS voice_provider text;
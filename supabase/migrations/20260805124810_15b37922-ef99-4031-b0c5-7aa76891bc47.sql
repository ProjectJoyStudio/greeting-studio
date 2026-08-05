ALTER TABLE public.pvg_people
  ADD COLUMN IF NOT EXISTS voice_category text,
  ADD COLUMN IF NOT EXISTS voice_confirmed boolean NOT NULL DEFAULT false;
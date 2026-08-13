ALTER TABLE public.pvg_people
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'speaker',
  ADD COLUMN IF NOT EXISTS appearance_description text;
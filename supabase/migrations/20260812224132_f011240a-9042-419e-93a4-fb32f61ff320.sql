ALTER TABLE public.pvg_videos
  ADD COLUMN IF NOT EXISTS audio_seconds numeric,
  ADD COLUMN IF NOT EXISTS speaker_person_id uuid;
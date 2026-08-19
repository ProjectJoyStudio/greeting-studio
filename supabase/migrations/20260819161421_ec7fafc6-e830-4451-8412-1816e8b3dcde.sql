ALTER TABLE public.pvg_videos
  ADD COLUMN IF NOT EXISTS mix_storage_path text,
  ADD COLUMN IF NOT EXISTS mix_signature text;
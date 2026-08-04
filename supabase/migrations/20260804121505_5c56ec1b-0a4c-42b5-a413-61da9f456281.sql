ALTER TABLE public.pvg_projects
  ADD COLUMN IF NOT EXISTS speech_mode text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS sync_mode text NOT NULL DEFAULT 'delayed',
  ADD COLUMN IF NOT EXISTS chorus_voice_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.pvg_people
  ADD COLUMN IF NOT EXISTS part_text text,
  ADD COLUMN IF NOT EXISTS voice_source text,
  ADD COLUMN IF NOT EXISTS recording_bucket text,
  ADD COLUMN IF NOT EXISTS recording_path text,
  ADD COLUMN IF NOT EXISTS recording_mime text,
  ADD COLUMN IF NOT EXISTS recording_duration_seconds numeric;

ALTER TABLE public.pvg_voiceovers
  ADD COLUMN IF NOT EXISTS speech_mode text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS sync_mode text,
  ADD COLUMN IF NOT EXISTS track_summary jsonb NOT NULL DEFAULT '[]'::jsonb;
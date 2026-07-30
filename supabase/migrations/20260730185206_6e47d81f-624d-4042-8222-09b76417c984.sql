ALTER TABLE public.live_card_animations
  ADD COLUMN IF NOT EXISTS greeting_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS greeting_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS greeting_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS text_design jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS text_saved_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
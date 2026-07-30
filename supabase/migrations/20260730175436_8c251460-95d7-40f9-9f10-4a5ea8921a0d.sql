ALTER TABLE public.live_card_animations
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS music_storage_bucket text,
  ADD COLUMN IF NOT EXISTS music_storage_path text,
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_slug text,
  ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_status text;

CREATE UNIQUE INDEX IF NOT EXISTS live_card_animations_share_slug_key
  ON public.live_card_animations (share_slug) WHERE share_slug IS NOT NULL;
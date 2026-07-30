ALTER TABLE public.live_greeting_cards
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS aspect_ratio text;

CREATE INDEX IF NOT EXISTS live_greeting_cards_session_idx
  ON public.live_greeting_cards (user_id, session_id, created_at DESC);

UPDATE public.live_greeting_cards
   SET status = 'not_selected'
 WHERE status = 'image_ready';
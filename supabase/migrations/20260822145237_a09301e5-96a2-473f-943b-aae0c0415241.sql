ALTER TABLE public.user_card_attempt_sessions
  ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.user_greeting_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS user_card_attempt_sessions_card_id_idx
  ON public.user_card_attempt_sessions (card_id);
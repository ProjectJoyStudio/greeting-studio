ALTER TABLE public.user_card_attempt_sessions
  ADD COLUMN IF NOT EXISTS free_grant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_order_id uuid;
ALTER TABLE public.user_greeting_cards ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE TABLE IF NOT EXISTS public.user_card_attempt_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  attempts_used integer NOT NULL DEFAULT 0,
  extra_packs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_card_attempt_sessions TO authenticated;
GRANT ALL ON public.user_card_attempt_sessions TO service_role;

ALTER TABLE public.user_card_attempt_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own card attempt sessions"
ON public.user_card_attempt_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
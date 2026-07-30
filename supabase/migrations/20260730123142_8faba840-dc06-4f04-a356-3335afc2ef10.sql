CREATE TABLE public.live_greeting_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'image_ready',
  prompt text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'generated',
  generator_key text,
  generator_model text,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  width integer,
  height integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_storage_bucket text,
  video_storage_path text,
  video_generator_key text,
  video_status text,
  duration_seconds integer,
  price_credits integer,
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_greeting_cards_user_idx ON public.live_greeting_cards (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_greeting_cards TO authenticated;
GRANT ALL ON public.live_greeting_cards TO service_role;

ALTER TABLE public.live_greeting_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own live greeting cards"
  ON public.live_greeting_cards FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view live greeting cards"
  ON public.live_greeting_cards FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_live_greeting_cards_updated_at
  BEFORE UPDATE ON public.live_greeting_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
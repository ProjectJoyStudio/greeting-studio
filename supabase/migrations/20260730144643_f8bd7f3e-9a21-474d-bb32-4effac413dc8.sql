CREATE TABLE public.live_card_animations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  source_card_id uuid REFERENCES public.live_greeting_cards(id) ON DELETE SET NULL,
  source_bucket text,
  source_path text,
  prompt text NOT NULL DEFAULT '',
  prompt_en text,
  prompt_lang text,
  duration_seconds integer NOT NULL DEFAULT 5,
  aspect_ratio text,
  resolution text,
  generator_key text,
  generator_model text,
  prediction_id text,
  status text NOT NULL DEFAULT 'preparing',
  storage_bucket text,
  storage_path text,
  error_code text,
  error_message text,
  price_credits integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_card_animations TO authenticated;
GRANT ALL ON public.live_card_animations TO service_role;

ALTER TABLE public.live_card_animations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own animations"
ON public.live_card_animations FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all animations"
ON public.live_card_animations FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER live_card_animations_updated_at
BEFORE UPDATE ON public.live_card_animations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX live_card_animations_user_idx ON public.live_card_animations(user_id, created_at DESC);
CREATE INDEX live_card_animations_session_idx ON public.live_card_animations(session_id);
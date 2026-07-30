ALTER TABLE public.user_greeting_cards
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS final_storage_bucket text,
  ADD COLUMN IF NOT EXISTS final_storage_path text,
  ADD COLUMN IF NOT EXISTS share_slug text,
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS card_kind text NOT NULL DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS source_card_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS user_greeting_cards_share_slug_key
  ON public.user_greeting_cards (share_slug) WHERE share_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_greeting_cards_user_created_idx
  ON public.user_greeting_cards (user_id, created_at DESC);

DROP TRIGGER IF EXISTS user_greeting_cards_set_updated_at ON public.user_greeting_cards;
CREATE TRIGGER user_greeting_cards_set_updated_at
  BEFORE UPDATE ON public.user_greeting_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_card_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.user_greeting_cards(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  event_type text NOT NULL,
  channel text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_card_events TO authenticated;
GRANT ALL ON public.user_card_events TO service_role;

ALTER TABLE public.user_card_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their own card events"
  ON public.user_card_events FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners record their own card events"
  ON public.user_card_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE INDEX IF NOT EXISTS user_card_events_card_idx ON public.user_card_events (card_id, created_at DESC);
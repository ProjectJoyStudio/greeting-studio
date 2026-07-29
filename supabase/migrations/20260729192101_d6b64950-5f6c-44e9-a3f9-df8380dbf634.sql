
CREATE TABLE public.user_greeting_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'preview',
  prompt text NOT NULL DEFAULT '',
  keywords text[] NOT NULL DEFAULT '{}',
  greeting_mode text NOT NULL DEFAULT 'manual',
  greeting_text text NOT NULL DEFAULT '',
  storage_bucket text NOT NULL DEFAULT 'user-greeting-cards',
  storage_path text NOT NULL,
  text_design jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_greeting_cards TO authenticated;
GRANT ALL ON public.user_greeting_cards TO service_role;
ALTER TABLE public.user_greeting_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own greeting cards"
  ON public.user_greeting_cards FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all greeting cards"
  ON public.user_greeting_cards FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER user_greeting_cards_updated_at
  BEFORE UPDATE ON public.user_greeting_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_user_greeting_cards_user ON public.user_greeting_cards (user_id, created_at DESC);

CREATE TABLE public.user_card_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  prompt text NOT NULL DEFAULT '',
  keywords text[] NOT NULL DEFAULT '{}',
  greeting_text text NOT NULL DEFAULT '',
  storage_bucket text NOT NULL DEFAULT 'user-card-drafts',
  storage_path text NOT NULL,
  source_card_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_card_drafts TO authenticated;
GRANT ALL ON public.user_card_drafts TO service_role;
ALTER TABLE public.user_card_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read rejected user drafts"
  ON public.user_card_drafts FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete rejected user drafts"
  ON public.user_card_drafts FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can move their own card into drafts"
  ON public.user_card_drafts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_card_drafts_created ON public.user_card_drafts (created_at DESC);

-- Storage: user greeting cards live under <user_id>/...
CREATE POLICY "Users read own greeting card files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-greeting-cards'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

CREATE POLICY "Users write own greeting card files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-greeting-cards'
    AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own greeting card files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-greeting-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own greeting card files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-greeting-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage: rejected user drafts are administrator-only
CREATE POLICY "Admins read user card draft files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-card-drafts' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete user card draft files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-card-drafts' AND public.is_admin(auth.uid()));


ALTER TABLE public.user_greeting_cards
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS purge_after timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS file_size bigint;

CREATE INDEX IF NOT EXISTS user_greeting_cards_deleted_at_idx ON public.user_greeting_cards (deleted_at);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read settings" ON public.app_settings;
CREATE POLICY "Admins read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS app_settings_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (key, value)
VALUES ('deleted_cards_retention_days', jsonb_build_object('days', 30))
ON CONFLICT (key) DO NOTHING;

-- Owners only see their live cards; admins keep full visibility.
DROP POLICY IF EXISTS "Users manage their own greeting cards" ON public.user_greeting_cards;
CREATE POLICY "Users manage their own greeting cards" ON public.user_greeting_cards
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

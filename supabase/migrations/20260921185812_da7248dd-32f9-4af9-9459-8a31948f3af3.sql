CREATE TABLE public.tariff_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  key text NOT NULL,
  credits integer NOT NULL CHECK (credits >= 0 AND credits <= 100000),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product, key)
);

GRANT SELECT ON public.tariff_settings TO authenticated;
GRANT SELECT ON public.tariff_settings TO anon;
GRANT ALL ON public.tariff_settings TO service_role;

ALTER TABLE public.tariff_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tariffs are readable" ON public.tariff_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins manage tariffs" ON public.tariff_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER tariff_settings_updated_at
  BEFORE UPDATE ON public.tariff_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.memory_book_storage_retention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('r2','b2')),
  delete_after timestamptz,
  note text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, provider)
);

GRANT SELECT ON public.memory_book_storage_retention TO authenticated;
GRANT ALL ON public.memory_book_storage_retention TO service_role;

ALTER TABLE public.memory_book_storage_retention ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read book storage retention" ON public.memory_book_storage_retention
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER memory_book_storage_retention_updated_at
  BEFORE UPDATE ON public.memory_book_storage_retention
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
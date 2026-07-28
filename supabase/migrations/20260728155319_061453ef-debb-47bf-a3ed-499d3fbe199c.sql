CREATE TABLE public.hero_showcase_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text,
  storage_bucket text,
  storage_path text,
  gradient text,
  alt_text text,
  link_to text NOT NULL DEFAULT '/catalog',
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hero_showcase_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_showcase_cards TO authenticated;
GRANT ALL ON public.hero_showcase_cards TO service_role;

ALTER TABLE public.hero_showcase_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled hero cards"
  ON public.hero_showcase_cards FOR SELECT
  USING (is_enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Editors can insert hero cards"
  ON public.hero_showcase_cards FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Editors can update hero cards"
  ON public.hero_showcase_cards FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Editors can delete hero cards"
  ON public.hero_showcase_cards FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER hero_showcase_cards_set_updated_at
  BEFORE UPDATE ON public.hero_showcase_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.hero_showcase_cards (gradient, link_to, sort_order, alt_text) VALUES
  ('linear-gradient(160deg, oklch(0.9 0.06 70), oklch(0.72 0.13 45))', '/catalog', 1, 'Project Joy showcase card'),
  ('linear-gradient(160deg, oklch(0.42 0.11 30), oklch(0.28 0.08 20))', '/showcase', 2, 'Project Joy showcase card'),
  ('linear-gradient(160deg, oklch(0.94 0.05 340), oklch(0.7 0.11 340))', '/studio', 3, 'Project Joy showcase card');
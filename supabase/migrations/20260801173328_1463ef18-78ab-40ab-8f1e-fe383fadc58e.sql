CREATE TABLE public.studio_promo_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL UNIQUE,
  title text NOT NULL,
  storage_bucket text,
  storage_path text,
  video_url text,
  poster_path text,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.studio_promo_windows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_promo_windows TO authenticated;
GRANT ALL ON public.studio_promo_windows TO service_role;

ALTER TABLE public.studio_promo_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view studio promo windows"
  ON public.studio_promo_windows FOR SELECT
  USING (is_enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Editors can insert studio promo windows"
  ON public.studio_promo_windows FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Editors can update studio promo windows"
  ON public.studio_promo_windows FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Editors can delete studio promo windows"
  ON public.studio_promo_windows FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER studio_promo_windows_set_updated_at
  BEFORE UPDATE ON public.studio_promo_windows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.studio_promo_windows (slot, title, sort_order) VALUES
  ('card', 'Greeting Cards', 1),
  ('animated', 'Live Greeting Cards', 2),
  ('video-greeting', 'Personal Video Greeting', 3),
  ('video-clip', 'Personal Music Video', 4),
  ('cartoon', 'Personal Video', 5),
  ('premium', 'Premium Personal Request', 6);
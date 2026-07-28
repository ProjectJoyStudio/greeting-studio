CREATE POLICY "Anyone can read hero showcase images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-showcase');

CREATE POLICY "Editors can upload hero showcase images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hero-showcase' AND public.is_admin(auth.uid()));

CREATE POLICY "Editors can update hero showcase images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hero-showcase' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'hero-showcase' AND public.is_admin(auth.uid()));

CREATE POLICY "Editors can delete hero showcase images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hero-showcase' AND public.is_admin(auth.uid()));
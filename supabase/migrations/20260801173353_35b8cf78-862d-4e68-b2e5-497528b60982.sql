CREATE POLICY "Anyone signed in can read studio promos"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'studio-promos');

CREATE POLICY "Admins can upload studio promos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'studio-promos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update studio promos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'studio-promos' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'studio-promos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete studio promos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'studio-promos' AND public.is_admin(auth.uid()));
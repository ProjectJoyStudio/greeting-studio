CREATE POLICY "Admins read memory book library"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'memory-book-library' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins upload memory book library"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memory-book-library' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update memory book library"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'memory-book-library' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete memory book library"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'memory-book-library' AND public.is_admin(auth.uid()));

-- Catalog buckets: public read (anon+auth), editor+ manage
DO $$
DECLARE b TEXT;
DECLARE buckets TEXT[] := ARRAY['catalog-images','catalog-animations','public-previews'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format($f$CREATE POLICY "%s_public_read" ON storage.objects FOR SELECT USING (bucket_id = %L);$f$, b, b);
    EXECUTE format($f$CREATE POLICY "%s_editor_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND public.is_editor_or_above(auth.uid()));$f$, b, b);
    EXECUTE format($f$CREATE POLICY "%s_editor_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND public.is_editor_or_above(auth.uid())) WITH CHECK (bucket_id = %L AND public.is_editor_or_above(auth.uid()));$f$, b, b, b);
    EXECUTE format($f$CREATE POLICY "%s_editor_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND public.is_editor_or_above(auth.uid()));$f$, b, b);
  END LOOP;
END $$;

-- Private per-user buckets: first path segment must equal auth.uid()
DO $$
DECLARE b TEXT;
DECLARE buckets TEXT[] := ARRAY['user-uploads','generated-images','generated-videos','generated-audio','private-previews'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format($f$CREATE POLICY "%s_owner_all" ON storage.objects FOR ALL TO authenticated USING (bucket_id = %L AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))) WITH CHECK (bucket_id = %L AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));$f$, b, b, b);
  END LOOP;
END $$;

-- Voice samples: owner only; admin read
CREATE POLICY "voice_samples_owner_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'voice-samples' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())))
  WITH CHECK (bucket_id = 'voice-samples' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Order files: owner or admin
CREATE POLICY "order_files_owner_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'order-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())))
  WITH CHECK (bucket_id = 'order-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

CREATE TABLE public.music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'background',
  storage_bucket text NOT NULL DEFAULT 'music-library',
  storage_path text NOT NULL,
  duration_seconds numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.music_tracks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_tracks TO authenticated;
GRANT ALL ON public.music_tracks TO service_role;

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active music is visible to signed in users"
  ON public.music_tracks FOR SELECT TO authenticated
  USING (is_active OR public.is_admin(auth.uid()));

CREATE POLICY "Admins insert music"
  ON public.music_tracks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update music"
  ON public.music_tracks FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete music"
  ON public.music_tracks FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX music_tracks_sort_idx ON public.music_tracks (sort_order, created_at);

CREATE TRIGGER music_tracks_set_updated_at
  BEFORE UPDATE ON public.music_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage: Project Joy music library
CREATE POLICY "Signed in users can listen to library music"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'music-library');

CREATE POLICY "Admins upload library music"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'music-library' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update library music"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'music-library' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete library music"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'music-library' AND public.is_admin(auth.uid()));

-- Storage: customer uploaded music, first folder is the owner id
CREATE POLICY "Owners read their project music"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pvg-music' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners upload their project music"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pvg-music' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners replace their project music"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pvg-music' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners delete their project music"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pvg-music' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE TABLE public.memory_book_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo','video')),
  bucket text NOT NULL,
  path text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes bigint,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX memory_book_materials_unique_path ON public.memory_book_materials (bucket, path);
CREATE INDEX memory_book_materials_book_idx ON public.memory_book_materials (book_id, kind, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_book_materials TO authenticated;
GRANT ALL ON public.memory_book_materials TO service_role;

ALTER TABLE public.memory_book_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage their own book materials"
ON public.memory_book_materials FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Customers upload their own memory book materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memory-book-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Customers read their own memory book materials"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'memory-book-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Customers delete their own memory book materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'memory-book-materials' AND (storage.foldername(name))[1] = auth.uid()::text);
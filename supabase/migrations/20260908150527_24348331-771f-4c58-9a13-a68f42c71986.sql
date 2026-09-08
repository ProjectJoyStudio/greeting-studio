CREATE TABLE public.memory_book_decorations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'memory-book-decorations',
  path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('svg','png')),
  recolorable BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT memory_book_decorations_category_check CHECK (category IN ('hearts','flowers','celebration','wedding','children','christmas','nature')),
  CONSTRAINT memory_book_decorations_path_key UNIQUE (bucket, path)
);

GRANT SELECT ON public.memory_book_decorations TO authenticated;
GRANT ALL ON public.memory_book_decorations TO service_role;

ALTER TABLE public.memory_book_decorations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view enabled decorations"
ON public.memory_book_decorations FOR SELECT TO authenticated
USING (enabled OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage decorations"
ON public.memory_book_decorations FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX memory_book_decorations_category_idx
  ON public.memory_book_decorations (category, sort_order, created_at);

CREATE TRIGGER memory_book_decorations_updated_at
BEFORE UPDATE ON public.memory_book_decorations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admins read decoration files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'memory-book-decorations' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins upload decoration files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memory-book-decorations' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update decoration files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'memory-book-decorations' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete decoration files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'memory-book-decorations' AND public.is_admin(auth.uid()));
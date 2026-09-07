CREATE TABLE IF NOT EXISTS public.memory_book_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  page_index INTEGER NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'empty' CHECK (content_type IN ('empty','photos','text','video')),
  layout TEXT,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  text_content TEXT,
  video_material_id UUID REFERENCES public.memory_book_materials(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (book_id, page_index)
);

CREATE INDEX IF NOT EXISTS memory_book_pages_book_idx ON public.memory_book_pages (book_id, page_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_book_pages TO authenticated;
GRANT ALL ON public.memory_book_pages TO service_role;

ALTER TABLE public.memory_book_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their memory book pages" ON public.memory_book_pages;
CREATE POLICY "Owners manage their memory book pages"
ON public.memory_book_pages FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.memory_book_pages
  ADD COLUMN IF NOT EXISTS decorations jsonb NOT NULL DEFAULT '[]'::jsonb;
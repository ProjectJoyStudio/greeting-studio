ALTER TABLE public.memory_book_pages
  ADD COLUMN IF NOT EXISTS frame jsonb NOT NULL DEFAULT '{"x": 0, "y": 0, "scale": 1}'::jsonb;
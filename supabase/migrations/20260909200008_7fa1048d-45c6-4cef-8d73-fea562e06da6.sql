ALTER TABLE public.memory_book_projects
  ADD COLUMN IF NOT EXISTS last_view text,
  ADD COLUMN IF NOT EXISTS last_page integer;
ALTER TABLE public.memory_book_projects
  ADD COLUMN IF NOT EXISTS back_cover_design_id uuid,
  ADD COLUMN IF NOT EXISTS back_cover_overridden boolean NOT NULL DEFAULT false;
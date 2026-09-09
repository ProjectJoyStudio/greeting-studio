ALTER TABLE public.memory_book_materials
  ADD COLUMN IF NOT EXISTS prepared_from_material_id uuid REFERENCES public.memory_book_materials(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.memory_book_video_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  source_material_id uuid NOT NULL REFERENCES public.memory_book_materials(id) ON DELETE CASCADE,
  fragments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, source_material_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_book_video_edits TO authenticated;
GRANT ALL ON public.memory_book_video_edits TO service_role;

ALTER TABLE public.memory_book_video_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their video edits"
ON public.memory_book_video_edits FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER memory_book_video_edits_updated_at
BEFORE UPDATE ON public.memory_book_video_edits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
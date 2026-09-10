CREATE TABLE public.memory_book_page_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  page_index integer NOT NULL,
  bucket text NOT NULL,
  path text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, page_index, path)
);

GRANT SELECT ON public.memory_book_page_backgrounds TO authenticated;
GRANT ALL ON public.memory_book_page_backgrounds TO service_role;

ALTER TABLE public.memory_book_page_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their page backgrounds"
ON public.memory_book_page_backgrounds
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX memory_book_page_backgrounds_page_idx
ON public.memory_book_page_backgrounds (book_id, page_index, created_at);

INSERT INTO public.memory_book_page_backgrounds (user_id, book_id, page_index, bucket, path, prompt, created_at)
SELECT p.user_id, p.book_id, p.page_index, p.background_bucket, p.background_path,
       COALESCE(p.improve_prompt, ''), COALESCE(p.updated_at, now())
FROM public.memory_book_pages p
WHERE p.background_bucket IS NOT NULL AND p.background_path IS NOT NULL
ON CONFLICT DO NOTHING;
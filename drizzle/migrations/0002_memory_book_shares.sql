CREATE TABLE public.memory_book_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  CONSTRAINT memory_book_shares_token_len CHECK (char_length(token) >= 32)
);
CREATE INDEX memory_book_shares_book_idx ON public.memory_book_shares(book_id, created_at);
GRANT SELECT ON public.memory_book_shares TO authenticated;
GRANT ALL ON public.memory_book_shares TO service_role;
ALTER TABLE public.memory_book_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their share links" ON public.memory_book_shares
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Once disabled, a link can never become active again.
CREATE OR REPLACE FUNCTION public.memory_book_shares_no_reenable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.active = false AND NEW.active = true THEN
    RAISE EXCEPTION 'share link cannot be re-enabled';
  END IF;
  IF NEW.token <> OLD.token OR NEW.book_id <> OLD.book_id OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'share link identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER memory_book_shares_guard BEFORE UPDATE ON public.memory_book_shares
  FOR EACH ROW EXECUTE FUNCTION public.memory_book_shares_no_reenable();
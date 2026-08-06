CREATE TABLE public.pvg_personal_voices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.pvg_projects(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'library' CHECK (scope IN ('library','project')),
  display_name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  duration_seconds numeric NOT NULL DEFAULT 0,
  source_bucket text,
  source_path text,
  source_mime text,
  processed_bucket text,
  processed_path text,
  processed_mime text,
  provider text,
  provider_voice_id text,
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','ready','failed')),
  processing_error text,
  consent_confirmed boolean NOT NULL DEFAULT false,
  consent_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pvg_personal_voices_project_scope CHECK (scope = 'library' OR project_id IS NOT NULL)
);

CREATE INDEX pvg_personal_voices_user_idx ON public.pvg_personal_voices (user_id, scope);
CREATE INDEX pvg_personal_voices_project_idx ON public.pvg_personal_voices (project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pvg_personal_voices TO authenticated;
GRANT ALL ON public.pvg_personal_voices TO service_role;

ALTER TABLE public.pvg_personal_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their personal voices"
ON public.pvg_personal_voices FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER pvg_personal_voices_updated_at
BEFORE UPDATE ON public.pvg_personal_voices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pvg_people
  ADD COLUMN IF NOT EXISTS personal_voice_id uuid REFERENCES public.pvg_personal_voices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS speaking_style text;
CREATE TABLE public.pvg_voice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pvg_projects(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.pvg_people(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  language text NOT NULL DEFAULT 'en',
  duration_seconds numeric NOT NULL DEFAULT 0,
  original_bucket text,
  original_path text,
  original_mime text,
  processed_bucket text,
  processed_path text,
  processed_mime text,
  enhanced_bucket text,
  enhanced_path text,
  enhanced_mime text,
  active_version text NOT NULL DEFAULT 'processed',
  processing_status text NOT NULL DEFAULT 'pending',
  processing_error text,
  voice_model_status text NOT NULL DEFAULT 'not_requested',
  voice_model_id text,
  voice_model_provider text,
  permission_confirmed boolean NOT NULL DEFAULT false,
  permission_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pvg_voice_recordings_person_unique UNIQUE (person_id),
  CONSTRAINT pvg_voice_recordings_active_version_check CHECK (active_version IN ('original','processed','enhanced')),
  CONSTRAINT pvg_voice_recordings_processing_status_check CHECK (processing_status IN ('pending','processing','ready','failed')),
  CONSTRAINT pvg_voice_recordings_voice_model_status_check CHECK (voice_model_status IN ('not_requested','queued','creating','ready','failed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pvg_voice_recordings TO authenticated;
GRANT ALL ON public.pvg_voice_recordings TO service_role;

ALTER TABLE public.pvg_voice_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own voice recordings"
ON public.pvg_voice_recordings FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX pvg_voice_recordings_project_idx ON public.pvg_voice_recordings(project_id);

CREATE TRIGGER pvg_voice_recordings_updated_at
BEFORE UPDATE ON public.pvg_voice_recordings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
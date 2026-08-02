CREATE TABLE public.pvg_voiceovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.pvg_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'elevenlabs',
  voice_id text NOT NULL,
  voice_name text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en',
  model_id text NOT NULL DEFAULT '',
  storage_bucket text NOT NULL DEFAULT 'generated-audio',
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'audio/mpeg',
  duration_seconds numeric NOT NULL DEFAULT 0,
  character_count integer NOT NULL DEFAULT 0,
  greeting_text text NOT NULL DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pvg_voiceovers TO authenticated;
GRANT ALL ON public.pvg_voiceovers TO service_role;

ALTER TABLE public.pvg_voiceovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own voiceovers"
  ON public.pvg_voiceovers FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all voiceovers"
  ON public.pvg_voiceovers FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER pvg_voiceovers_set_updated_at
  BEFORE UPDATE ON public.pvg_voiceovers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pvg_voice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.pvg_projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'elevenlabs',
  voice_id text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT '',
  character_count integer NOT NULL DEFAULT 0,
  generation_ms integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pvg_voice_logs TO authenticated;
GRANT ALL ON public.pvg_voice_logs TO service_role;

ALTER TABLE public.pvg_voice_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice logs"
  ON public.pvg_voice_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE INDEX pvg_voice_logs_project_idx ON public.pvg_voice_logs(project_id, created_at DESC);
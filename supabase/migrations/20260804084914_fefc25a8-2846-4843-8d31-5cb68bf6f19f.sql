CREATE TABLE public.voice_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'elevenlabs',
  external_voice_id text NOT NULL,
  name text NOT NULL,
  display_name text,
  description text,
  gender text,
  language text,
  category text,
  labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_compatibility text[] NOT NULL DEFAULT '{}'::text[],
  provider_preview_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_voice_id)
);

GRANT SELECT ON public.voice_library TO authenticated;
GRANT ALL ON public.voice_library TO service_role;
ALTER TABLE public.voice_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in people can read voices"
  ON public.voice_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage voices"
  ON public.voice_library FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER voice_library_updated_at
  BEFORE UPDATE ON public.voice_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.voice_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id uuid NOT NULL REFERENCES public.voice_library(id) ON DELETE CASCADE,
  language text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'voice-previews',
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'audio/mpeg',
  duration_seconds numeric NOT NULL DEFAULT 0,
  character_count integer NOT NULL DEFAULT 0,
  model_key text,
  sample_text text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voice_id, language)
);

GRANT SELECT ON public.voice_previews TO authenticated;
GRANT ALL ON public.voice_previews TO service_role;
ALTER TABLE public.voice_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in people can read voice previews"
  ON public.voice_previews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage voice previews"
  ON public.voice_previews FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER voice_previews_updated_at
  BEFORE UPDATE ON public.voice_previews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_voice_previews_voice ON public.voice_previews (voice_id);
CREATE INDEX idx_voice_library_active ON public.voice_library (is_active, sort_order);
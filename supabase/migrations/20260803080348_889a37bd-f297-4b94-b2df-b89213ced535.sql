CREATE TABLE public.voice_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_key text NOT NULL,
  label text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'testing' CHECK (status IN ('production','testing','disabled')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_models TO authenticated;
GRANT ALL ON public.voice_models TO service_role;
ALTER TABLE public.voice_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read voice models" ON public.voice_models FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage voice models" ON public.voice_models FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE UNIQUE INDEX voice_models_single_production ON public.voice_models ((status)) WHERE status = 'production';

CREATE TRIGGER voice_models_updated_at BEFORE UPDATE ON public.voice_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.voice_models (provider, model_key, label, description, status, sort_order) VALUES
  ('elevenlabs', 'eleven_flash_v2_5', 'Eleven Flash v2.5', 'Fastest generation, lower cost.', 'testing', 1),
  ('elevenlabs', 'eleven_multilingual_v2', 'Eleven Multilingual v2', 'Balanced quality across languages.', 'production', 2),
  ('elevenlabs', 'eleven_v3', 'Eleven v3', 'Most expressive voice model.', 'testing', 3);

CREATE TABLE public.voice_model_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  provider text NOT NULL,
  model_key text NOT NULL,
  model_label text,
  voice_id text NOT NULL,
  voice_name text,
  language text NOT NULL,
  text_content text NOT NULL,
  character_count integer NOT NULL DEFAULT 0,
  duration_seconds numeric NOT NULL DEFAULT 0,
  generation_ms integer NOT NULL DEFAULT 0,
  storage_bucket text,
  storage_path text,
  mime_type text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','error')),
  error_message text,
  notes text,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_model_tests TO authenticated;
GRANT ALL ON public.voice_model_tests TO service_role;
ALTER TABLE public.voice_model_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read voice tests" ON public.voice_model_tests FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage voice tests" ON public.voice_model_tests FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX voice_model_tests_created_idx ON public.voice_model_tests (created_at DESC);

CREATE TRIGGER voice_model_tests_updated_at BEFORE UPDATE ON public.voice_model_tests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.admin_set_production_voice_model(_model_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.voice_models%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_row FROM public.voice_models WHERE id = _model_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'model_not_found'; END IF;

  UPDATE public.voice_models SET status = 'testing' WHERE status = 'production' AND id <> _model_id;
  UPDATE public.voice_models SET status = 'production' WHERE id = _model_id;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, new_data)
  VALUES (auth.uid(), 'voice_model.production_set', 'voice_model', _model_id::text,
          jsonb_build_object('provider', v_row.provider, 'model_key', v_row.model_key));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_voice_model_stats()
RETURNS TABLE(provider text, model_key text, total integer, succeeded integer, failed integer,
              avg_generation_ms numeric, total_characters bigint, avg_duration_seconds numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT t.provider, t.model_key,
         COUNT(*)::integer,
         COUNT(*) FILTER (WHERE t.status = 'success')::integer,
         COUNT(*) FILTER (WHERE t.status = 'error')::integer,
         ROUND(AVG(t.generation_ms)::numeric, 0),
         COALESCE(SUM(t.character_count), 0)::bigint,
         ROUND(AVG(t.duration_seconds) FILTER (WHERE t.status = 'success')::numeric, 2)
    FROM public.voice_model_tests t
   GROUP BY t.provider, t.model_key;
END; $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-voice-model-tests',
  '20 3 * * *',
  $$DELETE FROM public.voice_model_tests WHERE is_favorite = false AND created_at < now() - interval '7 days';$$
);
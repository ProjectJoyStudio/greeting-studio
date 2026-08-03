ALTER TABLE public.pvg_voiceovers
  ADD COLUMN IF NOT EXISTS model_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credits_used numeric NOT NULL DEFAULT 0;

ALTER TABLE public.voice_model_tests
  ADD COLUMN IF NOT EXISTS credits_used numeric NOT NULL DEFAULT 0;

ALTER TABLE public.voice_models
  ADD COLUMN IF NOT EXISTS credit_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS usd_per_1000_credits numeric NOT NULL DEFAULT 0.15;

UPDATE public.voice_models SET credit_multiplier = 0.5 WHERE model_key = 'eleven_flash_v2_5';

DROP FUNCTION IF EXISTS public.admin_voice_model_stats();

CREATE OR REPLACE FUNCTION public.admin_voice_model_stats()
 RETURNS TABLE(provider text, model_key text, total integer, succeeded integer, failed integer, avg_generation_ms numeric, total_characters bigint, avg_duration_seconds numeric, avg_characters numeric, avg_credits numeric, total_credits numeric, avg_cost_usd numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         ROUND(AVG(t.duration_seconds) FILTER (WHERE t.status = 'success')::numeric, 2),
         ROUND(AVG(t.character_count)::numeric, 0),
         ROUND(AVG(COALESCE(NULLIF(t.credits_used, 0), t.character_count * COALESCE(m.credit_multiplier, 1)))::numeric, 1),
         ROUND(SUM(COALESCE(NULLIF(t.credits_used, 0), t.character_count * COALESCE(m.credit_multiplier, 1)))::numeric, 1),
         ROUND((AVG(COALESCE(NULLIF(t.credits_used, 0), t.character_count * COALESCE(m.credit_multiplier, 1))) * COALESCE(m.usd_per_1000_credits, 0) / 1000)::numeric, 4)
    FROM public.voice_model_tests t
    LEFT JOIN public.voice_models m ON m.model_key = t.model_key AND m.provider = t.provider
   GROUP BY t.provider, t.model_key, m.credit_multiplier, m.usd_per_1000_credits;
END; $function$;
ALTER TABLE public.cleanup_operations ADD COLUMN IF NOT EXISTS trigger_kind text NOT NULL DEFAULT 'automatic' CHECK (trigger_kind IN ('automatic','manual'));
ALTER TABLE public.cleanup_operations ADD COLUMN IF NOT EXISTS initiated_by uuid;
ALTER TABLE public.cleanup_operations ADD COLUMN IF NOT EXISTS manual_early boolean NOT NULL DEFAULT false;
ALTER TABLE public.cleanup_object_audit DROP CONSTRAINT IF EXISTS cleanup_object_audit_status_check;
ALTER TABLE public.cleanup_object_audit ADD CONSTRAINT cleanup_object_audit_status_check CHECK (status IN ('PENDING','IN_PROGRESS','VERIFIED_DELETED','ALREADY_ABSENT_VERIFIED','PROTECTED_RETAINED','RETRY_REQUIRED','FAILED','NOT_VERIFIED','NEEDS_REVIEW'));

CREATE OR REPLACE FUNCTION public.cleanup_object_reference_count(_bucket text, _key text, _entity_type text, _entity_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    (SELECT count(*) FROM public.user_greeting_cards c
      WHERE NOT (_entity_type = 'card' AND c.id = _entity_id)
        AND ((coalesce(c.storage_bucket,'user-greeting-cards') = _bucket AND c.storage_path = _key)
          OR (coalesce(c.final_storage_bucket,'user-greeting-cards') = _bucket AND c.final_storage_path = _key)))
  + (SELECT count(*) FROM public.live_greeting_cards l
      WHERE NOT (_entity_type = 'live_card' AND l.id = _entity_id)
        AND ((l.storage_bucket = _bucket AND l.storage_path = _key) OR (l.video_storage_bucket = _bucket AND l.video_storage_path = _key)))
  + (SELECT count(*) FROM public.live_card_animations a
      WHERE NOT (_entity_type = 'live_animation' AND a.id = _entity_id)
        AND ((a.storage_bucket = _bucket AND a.storage_path = _key) OR (a.music_storage_bucket = _bucket AND a.music_storage_path = _key)
          OR (a.source_bucket = _bucket AND a.source_path = _key) OR (a.final_bucket = _bucket AND a.final_path = _key)))
  + (SELECT count(*) FROM public.pvg_people p
      WHERE NOT (_entity_type = 'pvg_project' AND p.project_id = _entity_id)
        AND ((p.original_bucket = _bucket AND p.original_path = _key) OR (p.optimized_bucket = _bucket AND p.optimized_path = _key)
          OR (p.recording_bucket = _bucket AND p.recording_path = _key)
          OR EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.extra_photos) = 'array' THEN p.extra_photos ELSE '[]'::jsonb END) e
                      WHERE e->>'bucket' = _bucket AND e->>'path' = _key)))
  + (SELECT count(*) FROM public.pvg_scenes s
      WHERE NOT (_entity_type = 'pvg_project' AND s.project_id = _entity_id)
        AND s.storage_bucket = _bucket AND s.storage_path = _key)
  + (SELECT count(*) FROM public.pvg_videos v
      WHERE NOT (_entity_type = 'pvg_project' AND v.project_id = _entity_id)
        AND ((v.storage_bucket = _bucket AND (v.storage_path = _key OR v.mix_storage_path = _key)) OR (v.silent_bucket = _bucket AND v.silent_path = _key)))
  + (SELECT count(*) FROM public.pvg_voiceovers o
      WHERE NOT (_entity_type = 'pvg_project' AND o.project_id = _entity_id)
        AND o.storage_bucket = _bucket AND o.storage_path = _key)
  + (SELECT count(*) FROM public.pvg_voice_recordings r
      WHERE NOT (_entity_type = 'pvg_project' AND r.project_id = _entity_id)
        AND ((r.original_bucket = _bucket AND r.original_path = _key) OR (r.processed_bucket = _bucket AND r.processed_path = _key)
          OR (r.enhanced_bucket = _bucket AND r.enhanced_path = _key)))
  + (SELECT count(*) FROM public.pvg_personal_voices pv
      WHERE (pv.source_bucket = _bucket AND pv.source_path = _key) OR (pv.processed_bucket = _bucket AND pv.processed_path = _key)
         OR (pv.preview_bucket = _bucket AND pv.preview_path = _key))
  + (SELECT count(*) FROM public.media_assets m WHERE m.storage_bucket = _bucket AND m.storage_path = _key)
  + (SELECT count(*) FROM public.music_tracks t WHERE t.storage_bucket = _bucket AND t.storage_path = _key)
  )::integer;
$$;
REVOKE ALL ON FUNCTION public.cleanup_object_reference_count(text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_object_reference_count(text, text, text, uuid) TO service_role;
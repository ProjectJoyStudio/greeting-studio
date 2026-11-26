CREATE TABLE public.cleanup_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('card','live_card','live_animation','pvg_project')),
  entity_id uuid NOT NULL,
  owner_user_id uuid,
  reason text NOT NULL DEFAULT 'retention_expired',
  deleted_at_snapshot timestamptz,
  purge_after_snapshot timestamptz,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','RETRY_REQUIRED','COMPLETED','FAILED','NOT_VERIFIED','CANCELLED')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  last_run_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  objects_total integer NOT NULL DEFAULT 0,
  objects_verified integer NOT NULL DEFAULT 0,
  objects_absent integer NOT NULL DEFAULT 0,
  objects_protected integer NOT NULL DEFAULT 0,
  objects_unresolved integer NOT NULL DEFAULT 0,
  last_error text,
  record_finalized_at timestamptz,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX cleanup_operations_status_idx ON public.cleanup_operations (status, next_attempt_at);

CREATE TABLE public.cleanup_object_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES public.cleanup_operations(id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'cloud_storage',
  bucket text NOT NULL,
  object_key text NOT NULL,
  key_hash text NOT NULL,
  role text NOT NULL DEFAULT 'file',
  reason text NOT NULL DEFAULT 'retention_expired',
  eligibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at_snapshot timestamptz,
  purge_after_snapshot timestamptz,
  attempt integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  api_result text,
  verification text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','VERIFIED_DELETED','ALREADY_ABSENT_VERIFIED','PROTECTED_RETAINED','RETRY_REQUIRED','FAILED','NOT_VERIFIED')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operation_id, bucket, object_key)
);
CREATE INDEX cleanup_object_audit_op_idx ON public.cleanup_object_audit (operation_id);

CREATE TABLE public.cleanup_object_attempts (
  id bigserial PRIMARY KEY,
  object_id uuid NOT NULL REFERENCES public.cleanup_object_audit(id) ON DELETE RESTRICT,
  operation_id uuid NOT NULL,
  attempt integer NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  api_result text,
  verification text,
  status text NOT NULL,
  error text
);
CREATE INDEX cleanup_object_attempts_obj_idx ON public.cleanup_object_attempts (object_id);

GRANT SELECT ON public.cleanup_operations TO authenticated;
GRANT SELECT ON public.cleanup_object_audit TO authenticated;
GRANT SELECT ON public.cleanup_object_attempts TO authenticated;
GRANT ALL ON public.cleanup_operations TO service_role;
GRANT ALL ON public.cleanup_object_audit TO service_role;
GRANT ALL ON public.cleanup_object_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cleanup_object_attempts_id_seq TO service_role;

ALTER TABLE public.cleanup_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_object_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_object_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read cleanup operations" ON public.cleanup_operations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins read cleanup objects" ON public.cleanup_object_audit FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins read cleanup attempts" ON public.cleanup_object_attempts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Attempt history is append-only, even for the server.
CREATE OR REPLACE FUNCTION public.cleanup_attempts_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'cleanup attempt history is append-only'; END $$;
CREATE TRIGGER cleanup_attempts_append_only BEFORE UPDATE OR DELETE ON public.cleanup_object_attempts
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_attempts_append_only();

-- Lease so concurrent scheduler runs never process the same item.
CREATE OR REPLACE FUNCTION public.claim_cleanup_operation(_op uuid, _token uuid, _seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.cleanup_operations
     SET lease_token = _token, lease_until = now() + make_interval(secs => greatest(30, least(_seconds, 900))),
         status = 'IN_PROGRESS', last_run_at = now(), attempts = attempts + 1, updated_at = now()
   WHERE id = _op
     AND status IN ('PENDING','RETRY_REQUIRED','IN_PROGRESS')
     AND (lease_until IS NULL OR lease_until < now());
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END $$;

-- Authoritative metadata check, independent of the delete call.
CREATE OR REPLACE FUNCTION public.cleanup_object_present(_bucket text, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage AS $$
  SELECT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = _bucket AND name = _key);
$$;

-- Counts references to a file from anything other than the item being cleaned.
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
      WHERE (v.storage_bucket = _bucket AND (v.storage_path = _key OR v.mix_storage_path = _key)) OR (v.silent_bucket = _bucket AND v.silent_path = _key))
  + (SELECT count(*) FROM public.media_assets m WHERE m.storage_bucket = _bucket AND m.storage_path = _key)
  + (SELECT count(*) FROM public.music_tracks t WHERE t.storage_bucket = _bucket AND t.storage_path = _key)
  )::integer;
$$;

REVOKE ALL ON FUNCTION public.claim_cleanup_operation(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_object_present(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_object_reference_count(text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_cleanup_operation(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_object_present(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_object_reference_count(text, text, text, uuid) TO service_role;
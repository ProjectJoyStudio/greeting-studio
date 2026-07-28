-- ============ user_entitlements ============
CREATE TABLE public.user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_free_greeting_used boolean NOT NULL DEFAULT false,
  first_free_greeting_used_at timestamptz,
  first_free_greeting_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  first_free_greeting_product_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entitlement"
  ON public.user_entitlements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all entitlements"
  ON public.user_entitlements FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER user_entitlements_set_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill existing users
INSERT INTO public.user_entitlements (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- New users start eligible
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_entitlements (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $function$;

-- ============ eligibility helpers ============
CREATE OR REPLACE FUNCTION public.is_first_free_eligible_product(_product_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$ SELECT _product_type IN ('card', 'animated') $$;

CREATE OR REPLACE FUNCTION public.get_first_free_greeting_status(_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  user_id uuid,
  first_free_greeting_used boolean,
  first_free_greeting_used_at timestamptz,
  first_free_greeting_order_id uuid,
  first_free_greeting_product_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  IF auth.uid() IS DISTINCT FROM _user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT e.user_id, e.first_free_greeting_used, e.first_free_greeting_used_at,
         e.first_free_greeting_order_id, e.first_free_greeting_product_type
  FROM public.user_entitlements e WHERE e.user_id = _user_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT _user_id, false, NULL::timestamptz, NULL::uuid, NULL::text;
  END IF;
END; $$;

-- ============ atomic claim ============
CREATE OR REPLACE FUNCTION public.claim_first_free_greeting(
  _product_type text,
  _title text DEFAULT NULL,
  _language text DEFAULT 'en',
  _configuration jsonb DEFAULT '{}'::jsonb,
  _recipient_data jsonb DEFAULT '{}'::jsonb,
  _customer_text text DEFAULT NULL
)
RETURNS TABLE (order_id uuid, order_number text, used_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ent public.user_entitlements%ROWTYPE;
  v_existing uuid;
  v_order_id uuid;
  v_order_number text;
  v_now timestamptz := now();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.is_first_free_eligible_product(_product_type) THEN
    RAISE EXCEPTION 'product_not_eligible';
  END IF;

  INSERT INTO public.user_entitlements (user_id) VALUES (v_user)
    ON CONFLICT (user_id) DO NOTHING;

  -- serialize concurrent attempts for this account
  SELECT * INTO v_ent FROM public.user_entitlements
    WHERE user_entitlements.user_id = v_user FOR UPDATE;

  IF v_ent.first_free_greeting_used THEN
    RAISE EXCEPTION 'already_used';
  END IF;

  -- defence in depth: any previously accepted free order blocks a new one
  SELECT o.id INTO v_existing FROM public.orders o
   WHERE o.user_id = v_user
     AND (o.configuration->>'first_free_greeting')::boolean IS TRUE
     AND o.status NOT IN ('cancelled', 'failed', 'refunded')
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'already_used';
  END IF;

  v_order_number := 'JOY-FREE-' || to_char(v_now, 'YYYYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  INSERT INTO public.orders (
    user_id, order_number, product_type, title, requested_language, source_language,
    customer_text, status, recipient_data, configuration,
    credits_reserved, credits_charged, monetary_amount
  ) VALUES (
    v_user, v_order_number, _product_type, _title, _language, _language,
    _customer_text, 'queued', COALESCE(_recipient_data, '{}'::jsonb),
    COALESCE(_configuration, '{}'::jsonb) || jsonb_build_object('first_free_greeting', true),
    0, 0, 0
  ) RETURNING id INTO v_order_id;

  UPDATE public.user_entitlements e
     SET first_free_greeting_used = true,
         first_free_greeting_used_at = v_now,
         first_free_greeting_order_id = v_order_id,
         first_free_greeting_product_type = _product_type
   WHERE e.user_id = v_user AND e.first_free_greeting_used = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'already_used';
  END IF;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, new_data, request_metadata)
  VALUES (v_user, 'first_free_greeting.consumed', 'user_entitlement', v_user::text,
          jsonb_build_object('order_id', v_order_id, 'product_type', _product_type, 'used_at', v_now),
          '{}'::jsonb);

  RETURN QUERY SELECT v_order_id, v_order_number, v_now;
END; $$;

-- ============ safe restore on failed / cancelled free order ============
CREATE OR REPLACE FUNCTION public.release_first_free_greeting(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_order FROM public.orders o WHERE o.id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.user_id <> v_user AND NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_order.status NOT IN ('failed', 'cancelled') THEN
    RETURN false;
  END IF;

  UPDATE public.user_entitlements e
     SET first_free_greeting_used = false,
         first_free_greeting_used_at = NULL,
         first_free_greeting_order_id = NULL,
         first_free_greeting_product_type = NULL
   WHERE e.user_id = v_order.user_id
     AND e.first_free_greeting_order_id = _order_id;

  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, new_data, request_metadata)
  VALUES (v_user, 'first_free_greeting.released', 'user_entitlement', v_order.user_id::text,
          jsonb_build_object('order_id', _order_id, 'reason', 'order_' || v_order.status), '{}'::jsonb);
  RETURN true;
END; $$;

-- ============ super-admin manual restore ============
CREATE OR REPLACE FUNCTION public.admin_restore_first_free_greeting(_user_id uuid, _reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_prev public.user_entitlements%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT public.is_super_admin(v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT * INTO v_prev FROM public.user_entitlements e WHERE e.user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_entitlements (user_id) VALUES (_user_id)
      ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_prev FROM public.user_entitlements e WHERE e.user_id = _user_id;
  END IF;

  UPDATE public.user_entitlements e
     SET first_free_greeting_used = false,
         first_free_greeting_used_at = NULL,
         first_free_greeting_order_id = NULL,
         first_free_greeting_product_type = NULL
   WHERE e.user_id = _user_id;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, previous_data, new_data, request_metadata)
  VALUES (
    v_actor, 'first_free_greeting.restored', 'user_entitlement', _user_id::text,
    jsonb_build_object(
      'first_free_greeting_used', v_prev.first_free_greeting_used,
      'first_free_greeting_used_at', v_prev.first_free_greeting_used_at,
      'first_free_greeting_order_id', v_prev.first_free_greeting_order_id,
      'first_free_greeting_product_type', v_prev.first_free_greeting_product_type
    ),
    jsonb_build_object('first_free_greeting_used', false, 'reason', _reason),
    jsonb_build_object('admin_id', v_actor, 'user_id', _user_id, 'reason', _reason,
                       'order_id', v_prev.first_free_greeting_order_id, 'at', now())
  );
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.claim_first_free_greeting(text, text, text, jsonb, jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_free_greeting(text, text, text, jsonb, jsonb, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_first_free_greeting_status(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_first_free_greeting_status(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.release_first_free_greeting(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.release_first_free_greeting(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_restore_first_free_greeting(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_first_free_greeting(uuid, text) TO authenticated, service_role;

-- ===== helper: is this write coming straight from a customer session? =====
CREATE OR REPLACE FUNCTION public.is_client_write()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT current_user IN ('authenticated','anon')
         AND NOT COALESCE(public.is_admin(auth.uid()), false)
$$;

-- ===== 1. Live card refunds linked to a real charge =====
ALTER TABLE public.live_card_animations ADD COLUMN IF NOT EXISTS charge_txn_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_live_card_refund_once
  ON public.credit_transactions (reference_id) WHERE source = 'live_card_refund';

CREATE OR REPLACE FUNCTION public.charge_live_card_animation(_user_id uuid, _price integer, _duration integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _wallet public.credit_wallets%ROWTYPE;
  _txn uuid;
BEGIN
  IF _price IS NULL OR _price <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_price');
  END IF;
  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR _wallet.balance < _price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', COALESCE(_wallet.balance, 0));
  END IF;
  UPDATE public.credit_wallets
  SET balance = _wallet.balance - _price, lifetime_spent = _wallet.lifetime_spent + _price
  WHERE id = _wallet.id;
  INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, source)
  VALUES (_wallet.id, _user_id, 'order_charge', -_price, _wallet.balance - _price,
    'Live greeting card — animation', jsonb_build_object('duration_seconds', _duration), 'live_card_animation_charge')
  RETURNING id INTO _txn;
  RETURN jsonb_build_object('ok', true, 'balance', _wallet.balance - _price, 'charge_id', _txn);
END;
$function$;

CREATE OR REPLACE FUNCTION public.refund_live_card_charge(_user_id uuid, _charge_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _charge public.credit_transactions%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
  _amount integer;
BEGIN
  IF _charge_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_charge'); END IF;
  SELECT * INTO _charge FROM public.credit_transactions WHERE id = _charge_id FOR UPDATE;
  IF NOT FOUND OR _charge.user_id IS DISTINCT FROM _user_id OR _charge.txn_type <> 'order_charge'
     OR _charge.source IS DISTINCT FROM 'live_card_animation_charge' OR _charge.amount >= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_charge');
  END IF;
  IF EXISTS (SELECT 1 FROM public.credit_transactions WHERE source = 'live_card_refund' AND reference_id = _charge_id::text) THEN
    RETURN jsonb_build_object('ok', true, 'refunded', 0, 'already', true);
  END IF;
  _amount := -_charge.amount;
  SELECT * INTO _wallet FROM public.credit_wallets WHERE id = _charge.wallet_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'wallet_missing'); END IF;
  UPDATE public.credit_wallets
  SET balance = _wallet.balance + _amount, lifetime_spent = GREATEST(0, _wallet.lifetime_spent - _amount)
  WHERE id = _wallet.id;
  INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, source, reference_id)
  VALUES (_wallet.id, _user_id, 'refund', _amount, _wallet.balance + _amount,
    'Live greeting card — animation refund', jsonb_build_object('reason', left(COALESCE(_reason,''), 80), 'charge_id', _charge_id),
    'live_card_refund', _charge_id::text);
  RETURN jsonb_build_object('ok', true, 'refunded', _amount);
END;
$function$;

-- The old amount-based refund can no longer be used.
CREATE OR REPLACE FUNCTION public.refund_live_card_animation(_user_id uuid, _price integer, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  RAISE EXCEPTION 'deprecated: use refund_live_card_charge';
END;
$function$;
COMMENT ON FUNCTION public.refund_live_card_animation(uuid, integer, text) IS 'DEPRECATED: replaced by refund_live_card_charge (charge-linked, once only)';

-- ===== 2. Create Card attempt packs: atomic purchase and consumption =====
CREATE OR REPLACE FUNCTION public.buy_card_attempt_pack(_user_id uuid, _session_key text, _price integer, _attempts_per_pack integer, _first_pack_only boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _s public.user_card_attempt_sessions%ROWTYPE;
  _wallet public.credit_wallets%ROWTYPE;
BEGIN
  IF _session_key IS NULL OR _session_key = '' OR _price <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request', 'balance', 0);
  END IF;
  INSERT INTO public.user_card_attempt_sessions (user_id, session_key) VALUES (_user_id, _session_key)
  ON CONFLICT (user_id, session_key) DO NOTHING;
  SELECT * INTO _s FROM public.user_card_attempt_sessions WHERE user_id = _user_id AND session_key = _session_key FOR UPDATE;
  SELECT * INTO _wallet FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF _s.closed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_closed', 'balance', COALESCE(_wallet.balance,0));
  END IF;
  IF _first_pack_only AND _s.extra_packs > 0 THEN
    RETURN jsonb_build_object('ok', true, 'charged', 0, 'balance', COALESCE(_wallet.balance,0), 'packs', _s.extra_packs, 'used', _s.attempts_used);
  END IF;
  IF _wallet.id IS NULL OR _wallet.balance < _price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', COALESCE(_wallet.balance,0));
  END IF;
  UPDATE public.credit_wallets SET balance = _wallet.balance - _price, lifetime_spent = _wallet.lifetime_spent + _price WHERE id = _wallet.id;
  INSERT INTO public.credit_transactions (wallet_id, user_id, txn_type, amount, balance_after, description, metadata, source)
  VALUES (_wallet.id, _user_id, 'order_charge', -_price, _wallet.balance - _price,
    'Greeting card — ' || _attempts_per_pack || ' more generation attempts', jsonb_build_object('session_key', _session_key), 'card_attempt_pack');
  UPDATE public.user_card_attempt_sessions SET extra_packs = _s.extra_packs + 1, updated_at = now() WHERE id = _s.id;
  RETURN jsonb_build_object('ok', true, 'charged', _price, 'balance', _wallet.balance - _price, 'packs', _s.extra_packs + 1, 'used', _s.attempts_used);
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_card_attempt(_user_id uuid, _session_key text, _card_id uuid, _attempts_per_pack integer, _free_attempts integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _s public.user_card_attempt_sessions%ROWTYPE;
  _allowed integer;
BEGIN
  SELECT * INTO _s FROM public.user_card_attempt_sessions WHERE user_id = _user_id AND session_key = _session_key FOR UPDATE;
  IF NOT FOUND OR _s.closed_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'attempt_limit'); END IF;
  _allowed := _s.extra_packs * _attempts_per_pack + CASE WHEN _s.free_grant THEN _free_attempts ELSE 0 END;
  IF _s.attempts_used >= _allowed THEN RETURN jsonb_build_object('ok', false, 'error', 'attempt_limit', 'used', _s.attempts_used); END IF;
  UPDATE public.user_card_attempt_sessions
  SET attempts_used = _s.attempts_used + 1, card_id = COALESCE(_card_id, card_id), updated_at = now() WHERE id = _s.id;
  RETURN jsonb_build_object('ok', true, 'used', _s.attempts_used + 1, 'allowed', _allowed);
END;
$function$;

-- ===== 3. Execute permissions: financial functions are server-only =====
REVOKE EXECUTE ON FUNCTION public.buy_memory_book_improve_pack(uuid, uuid, integer, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_live_card_charge(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.buy_card_attempt_pack(uuid, text, integer, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_card_attempt(uuid, text, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.charge_live_card_animation(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_live_card_animation(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buy_memory_book_improve_pack(uuid, uuid, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_live_card_charge(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.buy_card_attempt_pack(uuid, text, integer, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_card_attempt(uuid, text, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.charge_live_card_animation(uuid, integer, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_test_credits(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_test_credits(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_dev_test_account(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_production_voice_model(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_test_credit_history(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_test_accounts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_voice_model_stats() FROM anon;

-- ===== 4. Policies: tables only the server may write =====
DROP POLICY IF EXISTS "Users manage their own live card attempt sessions" ON public.live_card_attempt_sessions;
CREATE POLICY "Users read their own live card attempt sessions" ON public.live_card_attempt_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own scenes" ON public.pvg_scenes;
CREATE POLICY "own scenes read" ON public.pvg_scenes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS orders_owner_insert ON public.orders;

-- ===== 5. Column guards for customer-writable tables =====
CREATE OR REPLACE FUNCTION public.guard_live_card_animation_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_client_write() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'live_card_animation_server_only' USING ERRCODE = '42501'; END IF;
  IF (NEW.user_id, NEW.source_card_id, NEW.source_bucket, NEW.source_path, NEW.duration_seconds, NEW.generator_key,
      NEW.generator_model, NEW.prediction_id, NEW.storage_bucket, NEW.storage_path, NEW.error_code, NEW.error_message,
      NEW.price_credits, NEW.credits_charged, NEW.charge_txn_id, NEW.metadata, NEW.completed_at, NEW.resolution, NEW.aspect_ratio)
     IS DISTINCT FROM
     (OLD.user_id, OLD.source_card_id, OLD.source_bucket, OLD.source_path, OLD.duration_seconds, OLD.generator_key,
      OLD.generator_model, OLD.prediction_id, OLD.storage_bucket, OLD.storage_path, OLD.error_code, OLD.error_message,
      OLD.price_credits, OLD.credits_charged, OLD.charge_txn_id, OLD.metadata, OLD.completed_at, OLD.resolution, OLD.aspect_ratio)
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'discarded') THEN
    RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_live_card_animation_write ON public.live_card_animations;
CREATE TRIGGER guard_live_card_animation_write BEFORE INSERT OR UPDATE OR DELETE ON public.live_card_animations
  FOR EACH ROW EXECUTE FUNCTION public.guard_live_card_animation_write();

CREATE OR REPLACE FUNCTION public.guard_card_attempt_session_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_client_write() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501'; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.attempts_used := 0; NEW.extra_packs := 0; NEW.free_grant := false;
    NEW.free_order_id := NULL; NEW.card_id := NULL; NEW.closed_at := NULL;
    RETURN NEW;
  END IF;
  IF (NEW.user_id, NEW.session_key, NEW.attempts_used, NEW.extra_packs, NEW.free_grant, NEW.free_order_id, NEW.card_id)
     IS DISTINCT FROM (OLD.user_id, OLD.session_key, OLD.attempts_used, OLD.extra_packs, OLD.free_grant, OLD.free_order_id, OLD.card_id)
     OR (OLD.closed_at IS NOT NULL AND NEW.closed_at IS DISTINCT FROM OLD.closed_at) THEN
    RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_card_attempt_session_write ON public.user_card_attempt_sessions;
CREATE TRIGGER guard_card_attempt_session_write BEFORE INSERT OR UPDATE OR DELETE ON public.user_card_attempt_sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_card_attempt_session_write();

CREATE OR REPLACE FUNCTION public.guard_pvg_project_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_client_write() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501'; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.generations_used := 0; NEW.generations_limit := 5; NEW.scene_packs := 0; NEW.credits_charged := 0;
    NEW.credit_history := '[]'::jsonb; NEW.permanently_deleted := false; NEW.restored_at := NULL;
    NEW.restored_by := NULL; NEW.delivered_at := NULL; NEW.status := 'draft';
    RETURN NEW;
  END IF;
  IF (NEW.user_id, NEW.generations_used, NEW.generations_limit, NEW.scene_packs, NEW.credits_charged, NEW.credit_history,
      NEW.permanently_deleted, NEW.restored_at, NEW.restored_by, NEW.delivered_at)
     IS DISTINCT FROM
     (OLD.user_id, OLD.generations_used, OLD.generations_limit, OLD.scene_packs, OLD.credits_charged, OLD.credit_history,
      OLD.permanently_deleted, OLD.restored_at, OLD.restored_by, OLD.delivered_at)
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('draft','scene_selected','deleted_by_user')) THEN
    RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_pvg_project_write ON public.pvg_projects;
CREATE TRIGGER guard_pvg_project_write BEFORE INSERT OR UPDATE OR DELETE ON public.pvg_projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_pvg_project_write();

CREATE OR REPLACE FUNCTION public.guard_order_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_client_write() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'order_server_only' USING ERRCODE = '42501'; END IF;
  IF (NEW.user_id, NEW.order_number, NEW.product_type, NEW.status, NEW.queue_position, NEW.priority_level,
      NEW.estimated_completion_at, NEW.configuration, NEW.credits_reserved, NEW.credits_charged, NEW.monetary_amount,
      NEW.currency, NEW.completed_at, NEW.cancelled_at, NEW.duration_seconds)
     IS DISTINCT FROM
     (OLD.user_id, OLD.order_number, OLD.product_type, OLD.status, OLD.queue_position, OLD.priority_level,
      OLD.estimated_completion_at, OLD.configuration, OLD.credits_reserved, OLD.credits_charged, OLD.monetary_amount,
      OLD.currency, OLD.completed_at, OLD.cancelled_at, OLD.duration_seconds) THEN
    RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_order_write ON public.orders;
CREATE TRIGGER guard_order_write BEFORE INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_write();

CREATE OR REPLACE FUNCTION public.guard_memory_book_page_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_client_write() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.improve_included_used := false; NEW.improve_paid_count := 0; RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.improve_included_used,false) OR COALESCE(OLD.improve_paid_count,0) > 0 THEN
      RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF (NEW.user_id, NEW.book_id, NEW.page_index, NEW.improve_included_used, NEW.improve_paid_count)
     IS DISTINCT FROM (OLD.user_id, OLD.book_id, OLD.page_index, OLD.improve_included_used, OLD.improve_paid_count) THEN
    RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_memory_book_page_write ON public.memory_book_pages;
CREATE TRIGGER guard_memory_book_page_write BEFORE INSERT OR UPDATE OR DELETE ON public.memory_book_pages
  FOR EACH ROW EXECUTE FUNCTION public.guard_memory_book_page_write();

CREATE OR REPLACE FUNCTION public.guard_profile_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_client_write() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_dev_test_account := false; NEW.account_status := 'active'; RETURN NEW;
  END IF;
  IF (NEW.is_dev_test_account, NEW.account_status) IS DISTINCT FROM (OLD.is_dev_test_account, OLD.account_status) THEN
    RAISE EXCEPTION 'protected_field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_write ON public.profiles;
CREATE TRIGGER guard_profile_write BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_write();


CREATE OR REPLACE FUNCTION public.claim_pvg_scene_attempt(_user_id uuid, _project_id uuid, _variation_index integer, _prompt text, _attempts_per_pack integer, _included integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _p public.pvg_projects%ROWTYPE;
  _used integer;
  _scene uuid;
BEGIN
  SELECT * INTO _p FROM public.pvg_projects WHERE id = _project_id AND user_id = _user_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'project_not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.pvg_scenes WHERE project_id = _project_id AND status IN ('pending','processing')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'busy');
  END IF;
  SELECT count(*) INTO _used FROM public.pvg_scenes WHERE project_id = _project_id AND status <> 'failed';
  IF _used >= COALESCE(_p.scene_packs, 0) * _attempts_per_pack THEN
    RETURN jsonb_build_object('ok', false, 'error', 'attempts_empty');
  END IF;
  INSERT INTO public.pvg_scenes (project_id, user_id, variation_index, status, prompt)
  VALUES (_project_id, _user_id, _variation_index, 'pending', _prompt) RETURNING id INTO _scene;
  UPDATE public.pvg_projects SET generations_used = _used + 1, generations_limit = _included, status = 'generating'
  WHERE id = _project_id;
  RETURN jsonb_build_object('ok', true, 'scene_id', _scene, 'used', _used + 1);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.claim_pvg_scene_attempt(uuid, uuid, integer, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pvg_scene_attempt(uuid, uuid, integer, text, integer, integer) TO service_role;

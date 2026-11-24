DO $$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.purchase_pvg_final_video(uuid,uuid,uuid,jsonb)'::regprocedure);
 def:=replace(def,'id=p.selected_scene_id AND project_id=p.id','id=(_snapshot->>''scene_id'')::uuid AND project_id=p.id');
 def:=replace(def,'id=p.single_speaker_person_id AND project_id=p.id','id=(_snapshot->>''speaker_id'')::uuid AND project_id=p.id');
 def:=replace(def,'(_snapshot->>''scene_id'') IS DISTINCT FROM p.selected_scene_id::text','(p.selected_scene_id IS NOT NULL AND (_snapshot->>''scene_id'') IS DISTINCT FROM p.selected_scene_id::text)');
 def:=replace(def,'(_snapshot->>''speaker_id'') IS DISTINCT FROM p.single_speaker_person_id::text','(p.single_speaker_person_id IS NOT NULL AND (_snapshot->>''speaker_id'') IS DISTINCT FROM p.single_speaker_person_id::text)');
 def:=replace(def,'p.single_speaker_person_id,k,tx','(_snapshot->>''speaker_id'')::uuid,k,tx');
 EXECUTE def;
 def:=pg_get_functiondef('public.guard_pvg_paid_video()'::regprocedure);
 def:=replace(def,'IF OLD.payment_key IS NOT NULL THEN RAISE EXCEPTION ''paid_operation_must_be_retained'';','IF OLD.payment_key IS NOT NULL AND EXISTS(SELECT 1 FROM public.pvg_projects WHERE id=OLD.project_id) THEN RAISE EXCEPTION ''paid_operation_must_be_retained'';');
 EXECUTE def;
END $$;
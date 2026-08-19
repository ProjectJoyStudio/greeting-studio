update public.app_settings
set value = jsonb_set(value, '{functions,personal_video.start_scene,primary}', '"flux2_max"')
where key = 'generator_control'
  and value->'functions'->'personal_video.start_scene'->>'primary' = 'flux2_dev';

update public.app_settings
set value = jsonb_set(value, '{functions,personal_video.start_scene,backup}', 'null'::jsonb)
where key = 'generator_control'
  and value->'functions'->'personal_video.start_scene'->>'backup' = 'flux2_dev';
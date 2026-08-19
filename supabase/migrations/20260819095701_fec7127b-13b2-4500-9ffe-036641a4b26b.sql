CREATE TABLE IF NOT EXISTS public._pvg_pack_check (id serial primary key, step text, result jsonb, at timestamptz default now());
GRANT ALL ON public._pvg_pack_check TO service_role;
ALTER TABLE public._pvg_pack_check ENABLE ROW LEVEL SECURITY;

INSERT INTO public._pvg_pack_check (step, result)
VALUES ('first', public.buy_pvg_scene_pack('ddb9c1b8-8531-4371-a5f0-ef1f10089632'::uuid, '47f29f4d-6f79-4770-b775-590c27cdc7e7'::uuid, 1));

INSERT INTO public._pvg_pack_check (step, result)
VALUES ('second', public.buy_pvg_scene_pack('ddb9c1b8-8531-4371-a5f0-ef1f10089632'::uuid, '47f29f4d-6f79-4770-b775-590c27cdc7e7'::uuid, 1));
ALTER TABLE public.pvg_projects ADD COLUMN IF NOT EXISTS action_description text;
ALTER TABLE public.pvg_videos ADD COLUMN IF NOT EXISTS variant_index integer NOT NULL DEFAULT 1;
ALTER TABLE public.pvg_videos ADD COLUMN IF NOT EXISTS action_description text;
ALTER TABLE public.pvg_videos ADD COLUMN IF NOT EXISTS seed bigint;
ALTER TABLE public.pvg_videos ADD COLUMN IF NOT EXISTS is_selected boolean NOT NULL DEFAULT false;
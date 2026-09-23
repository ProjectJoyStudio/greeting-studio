CREATE TABLE public.ready_design_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key text NOT NULL UNIQUE,
  stage text NOT NULL CHECK (stage IN ('cover','leaf')),
  hidden boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ready_design_visibility TO authenticated;
GRANT ALL ON public.ready_design_visibility TO service_role;

ALTER TABLE public.ready_design_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ready design visibility"
ON public.ready_design_visibility FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_ready_design_visibility_updated_at
BEFORE UPDATE ON public.ready_design_visibility
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
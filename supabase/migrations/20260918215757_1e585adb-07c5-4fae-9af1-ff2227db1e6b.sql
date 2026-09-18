CREATE TABLE public.storage_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('r2','b2')),
  role text NOT NULL CHECK (role IN ('primary','backup','emergency')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','copying','present','failed','deleting','deleted')),
  size_bytes bigint,
  checksum text,
  content_type text,
  verified_at timestamp with time zone,
  last_backup_at timestamp with time zone,
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT storage_placements_unique_object_provider UNIQUE (object_key, provider)
);

CREATE INDEX storage_placements_role_status_idx ON public.storage_placements (role, status);
CREATE INDEX storage_placements_object_key_idx ON public.storage_placements (object_key);

GRANT ALL ON public.storage_placements TO service_role;

ALTER TABLE public.storage_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view storage placements"
ON public.storage_placements
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER storage_placements_set_updated_at
BEFORE UPDATE ON public.storage_placements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
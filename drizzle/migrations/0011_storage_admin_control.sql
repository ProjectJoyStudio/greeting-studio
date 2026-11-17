CREATE TABLE public.storage_platform_state (
  scope text PRIMARY KEY,
  mode text NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal','emergency','recovery')),
  read_provider text NOT NULL DEFAULT 'r2',
  version integer NOT NULL DEFAULT 1,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  reason text,
  operation_id uuid,
  lock_token uuid,
  lock_until timestamptz
);
GRANT ALL ON public.storage_platform_state TO service_role;
ALTER TABLE public.storage_platform_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.storage_platform_state(scope) VALUES ('global') ON CONFLICT DO NOTHING;

CREATE TABLE public.storage_admin_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  actor_user_id uuid,
  source_provider text,
  destination_provider text,
  key_prefix text,
  cursor text,
  total integer NOT NULL DEFAULT 0,
  done integer NOT NULL DEFAULT 0,
  verified integer NOT NULL DEFAULT 0,
  conflicts integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  bytes bigint NOT NULL DEFAULT 0,
  result jsonb,
  error text,
  lease_token uuid,
  lease_until timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.storage_admin_operations TO service_role;
ALTER TABLE public.storage_admin_operations ENABLE ROW LEVEL SECURITY;
CREATE INDEX storage_admin_operations_kind_idx ON public.storage_admin_operations(scope, kind, started_at DESC);
-- Only one active recovery/inventory per scope+kind.
CREATE UNIQUE INDEX storage_admin_operations_one_active ON public.storage_admin_operations(scope, kind) WHERE status IN ('pending','running');

CREATE TABLE public.storage_recovery_items (
  operation_id uuid NOT NULL REFERENCES public.storage_admin_operations(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','copying','verified','conflict','missing_source','failed')),
  expected_checksum text,
  expected_size bigint,
  destination_checksum text,
  transfer_state jsonb,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operation_id, object_key)
);
GRANT ALL ON public.storage_recovery_items TO service_role;
ALTER TABLE public.storage_recovery_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.storage_provider_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  provider text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  write_ok boolean,
  read_ok boolean,
  delete_ok boolean,
  latency_ms integer,
  error text,
  actor_user_id uuid
);
GRANT ALL ON public.storage_provider_health TO service_role;
ALTER TABLE public.storage_provider_health ENABLE ROW LEVEL SECURITY;
CREATE INDEX storage_provider_health_idx ON public.storage_provider_health(scope, provider, checked_at DESC);

CREATE TABLE public.storage_inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES public.storage_admin_operations(id) ON DELETE SET NULL,
  provider text NOT NULL,
  objects integer NOT NULL DEFAULT 0,
  bytes bigint NOT NULL DEFAULT 0,
  by_area jsonb NOT NULL DEFAULT '{}'::jsonb,
  complete boolean NOT NULL DEFAULT false,
  taken_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.storage_inventory_snapshots TO service_role;
ALTER TABLE public.storage_inventory_snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX storage_inventory_snapshots_idx ON public.storage_inventory_snapshots(provider, taken_at DESC);
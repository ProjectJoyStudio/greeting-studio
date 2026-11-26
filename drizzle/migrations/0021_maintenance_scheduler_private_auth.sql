CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.card_purge_dispatch_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex'),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.voice_previews_dispatch_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex'),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.card_purge_dispatch_config FROM anon, authenticated;
REVOKE ALL ON public.voice_previews_dispatch_config FROM anon, authenticated;
GRANT ALL ON public.card_purge_dispatch_config TO service_role;
GRANT ALL ON public.voice_previews_dispatch_config TO service_role;
ALTER TABLE public.card_purge_dispatch_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_previews_dispatch_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.card_purge_dispatch_config DEFAULT VALUES;
INSERT INTO public.voice_previews_dispatch_config DEFAULT VALUES;

-- =====================================================================
-- PROJECT JOY — PLATFORM FOUNDATION
-- =====================================================================

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =====================================================================
-- ENUMS
-- =====================================================================
CREATE TYPE public.app_role AS ENUM ('customer','editor','admin','super_admin');
CREATE TYPE public.account_status AS ENUM ('active','suspended','deleted');
CREATE TYPE public.orientation AS ENUM ('vertical','square','horizontal');
CREATE TYPE public.background_status AS ENUM ('draft','active','hidden','archived');
CREATE TYPE public.variant_status AS ENUM ('draft','review','published','hidden','archived');
CREATE TYPE public.translation_status AS ENUM ('missing','draft','machine_translated','needs_review','approved','published');
CREATE TYPE public.asset_type AS ENUM ('image','animated_image','video','audio','song','voiceover','cartoon','voice_sample','document','other');
CREATE TYPE public.asset_visibility AS ENUM ('public','private','restricted');
CREATE TYPE public.asset_processing_status AS ENUM ('pending','processing','ready','failed');
CREATE TYPE public.moderation_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.order_status AS ENUM ('draft','awaiting_payment','paid','queued','processing','review','completed','failed','cancelled','refunded');
CREATE TYPE public.generation_job_status AS ENUM ('pending','queued','running','completed','failed','cancelled','retrying');
CREATE TYPE public.credit_txn_type AS ENUM ('purchase','subscription_grant','order_reservation','order_charge','refund','cashback','promotional_bonus','manual_adjustment','expiration');
CREATE TYPE public.notification_channel AS ENUM ('email','sms','push','in_app');
CREATE TYPE public.notification_status AS ENUM ('pending','sent','delivered','failed','cancelled');

-- =====================================================================
-- PROFILES + ROLES
-- =====================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  account_status public.account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('editor','admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_editor_or_above(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('editor','admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles_super_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + assign customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- LANGUAGES
-- =====================================================================
CREATE TABLE public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.languages TO anon, authenticated;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "languages_public_read" ON public.languages FOR SELECT USING (true);
CREATE POLICY "languages_admin_manage" ON public.languages FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_languages_updated BEFORE UPDATE ON public.languages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.languages (code, name, native_name, sort_order) VALUES
  ('ru','Russian','Русский',1),
  ('en','English','English',2),
  ('de','German','Deutsch',3),
  ('uk','Ukrainian','Українська',4),
  ('fr','French','Français',5),
  ('pl','Polish','Polski',6);

-- =====================================================================
-- MEDIA ASSETS
-- =====================================================================
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID, -- FK added later
  asset_type public.asset_type NOT NULL,
  purpose TEXT,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  file_size BIGINT,
  width INT,
  height INT,
  duration_seconds NUMERIC,
  checksum TEXT,
  visibility public.asset_visibility NOT NULL DEFAULT 'private',
  processing_status public.asset_processing_status NOT NULL DEFAULT 'ready',
  moderation_status public.moderation_status NOT NULL DEFAULT 'approved',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(storage_bucket, storage_path)
);
CREATE INDEX idx_media_assets_owner ON public.media_assets(owner_user_id);
CREATE INDEX idx_media_assets_order ON public.media_assets(order_id);
CREATE INDEX idx_media_assets_visibility ON public.media_assets(visibility);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT SELECT ON public.media_assets TO anon;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_public_read" ON public.media_assets FOR SELECT
  USING (visibility = 'public' AND deleted_at IS NULL);
CREATE POLICY "media_owner_read" ON public.media_assets FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());
CREATE POLICY "media_admin_read" ON public.media_assets FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "media_owner_insert" ON public.media_assets FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() OR public.is_editor_or_above(auth.uid()));
CREATE POLICY "media_owner_update" ON public.media_assets FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_editor_or_above(auth.uid()));
CREATE POLICY "media_admin_delete" ON public.media_assets FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR owner_user_id = auth.uid());
CREATE TRIGGER trg_media_assets_updated BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- CATALOG TAXONOMY (shared shape via macro-like repetition)
-- =====================================================================

-- Generic helper: creates a taxonomy table + its translations table
-- (Postgres has no macros; the definitions are repeated but consistent.)

-- OCCASIONS
CREATE TABLE public.catalog_occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_occasion_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occasion_id UUID NOT NULL REFERENCES public.catalog_occasions(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(occasion_id, language_code)
);

-- RECIPIENTS
CREATE TABLE public.catalog_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_recipient_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.catalog_recipients(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipient_id, language_code)
);

-- CATEGORIES
CREATE TABLE public.catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.catalog_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.catalog_categories(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, language_code)
);

-- TAGS
CREATE TABLE public.catalog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_tag_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES public.catalog_tags(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tag_id, language_code)
);

-- STYLES
CREATE TABLE public.catalog_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_style_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL REFERENCES public.catalog_styles(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(style_id, language_code)
);

-- MOODS
CREATE TABLE public.catalog_moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_mood_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mood_id UUID NOT NULL REFERENCES public.catalog_moods(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mood_id, language_code)
);

-- VISUAL OBJECTS
CREATE TABLE public.catalog_visual_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_visual_object_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visual_object_id UUID NOT NULL REFERENCES public.catalog_visual_objects(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(visual_object_id, language_code)
);

-- AGE GROUPS
CREATE TABLE public.catalog_age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_age_group_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id UUID NOT NULL REFERENCES public.catalog_age_groups(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(age_group_id, language_code)
);

-- SEASONS
CREATE TABLE public.catalog_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_season_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.catalog_seasons(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, language_code)
);

-- THEMES
CREATE TABLE public.catalog_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.catalog_theme_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES public.catalog_themes(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(theme_id, language_code)
);

-- Grants + RLS for every taxonomy table (loop)
DO $$
DECLARE t TEXT;
DECLARE tables TEXT[] := ARRAY[
  'catalog_occasions','catalog_occasion_translations',
  'catalog_recipients','catalog_recipient_translations',
  'catalog_categories','catalog_category_translations',
  'catalog_tags','catalog_tag_translations',
  'catalog_styles','catalog_style_translations',
  'catalog_moods','catalog_mood_translations',
  'catalog_visual_objects','catalog_visual_object_translations',
  'catalog_age_groups','catalog_age_group_translations',
  'catalog_seasons','catalog_season_translations',
  'catalog_themes','catalog_theme_translations'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated;', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "%s_public_read" ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY "%s_editor_manage" ON public.%I FOR ALL TO authenticated USING (public.is_editor_or_above(auth.uid())) WITH CHECK (public.is_editor_or_above(auth.uid()));', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t, t);
  END LOOP;
END $$;

-- =====================================================================
-- BACKGROUNDS + CARD VARIANTS
-- =====================================================================
CREATE TABLE public.catalog_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name TEXT NOT NULL,
  primary_media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  thumbnail_media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  orientation public.orientation NOT NULL DEFAULT 'vertical',
  width INT,
  height INT,
  status public.background_status NOT NULL DEFAULT 'draft',
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  internal_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_backgrounds_status ON public.catalog_backgrounds(status) WHERE deleted_at IS NULL;
GRANT SELECT ON public.catalog_backgrounds TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalog_backgrounds TO authenticated;
GRANT ALL ON public.catalog_backgrounds TO service_role;
ALTER TABLE public.catalog_backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bg_public_read" ON public.catalog_backgrounds FOR SELECT
  USING (status = 'active' AND NOT is_hidden AND NOT is_archived AND deleted_at IS NULL);
CREATE POLICY "bg_editor_read" ON public.catalog_backgrounds FOR SELECT TO authenticated
  USING (public.is_editor_or_above(auth.uid()));
CREATE POLICY "bg_editor_write" ON public.catalog_backgrounds FOR INSERT TO authenticated
  WITH CHECK (public.is_editor_or_above(auth.uid()));
CREATE POLICY "bg_editor_update" ON public.catalog_backgrounds FOR UPDATE TO authenticated
  USING (public.is_editor_or_above(auth.uid())) WITH CHECK (public.is_editor_or_above(auth.uid()));
CREATE POLICY "bg_superadmin_delete" ON public.catalog_backgrounds FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_backgrounds_updated BEFORE UPDATE ON public.catalog_backgrounds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.catalog_card_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  background_id UUID NOT NULL REFERENCES public.catalog_backgrounds(id) ON DELETE RESTRICT,
  internal_name TEXT NOT NULL,
  primary_occasion_id UUID REFERENCES public.catalog_occasions(id) ON DELETE SET NULL,
  style_id UUID REFERENCES public.catalog_styles(id) ON DELETE SET NULL,
  mood_id UUID REFERENCES public.catalog_moods(id) ON DELETE SET NULL,
  orientation public.orientation NOT NULL DEFAULT 'vertical',
  age_group_id UUID REFERENCES public.catalog_age_groups(id) ON DELETE SET NULL,
  status public.variant_status NOT NULL DEFAULT 'draft',
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  allow_sharing BOOLEAN NOT NULL DEFAULT true,
  allow_downloading BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  publication_date TIMESTAMPTZ,
  internal_notes TEXT,
  search_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_cv_status ON public.catalog_card_variants(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_cv_bg ON public.catalog_card_variants(background_id);
CREATE INDEX idx_cv_primary_occasion ON public.catalog_card_variants(primary_occasion_id);
GRANT SELECT ON public.catalog_card_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalog_card_variants TO authenticated;
GRANT ALL ON public.catalog_card_variants TO service_role;
ALTER TABLE public.catalog_card_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv_public_read" ON public.catalog_card_variants FOR SELECT
  USING (status = 'published' AND NOT is_hidden AND NOT is_archived AND deleted_at IS NULL);
CREATE POLICY "cv_editor_read" ON public.catalog_card_variants FOR SELECT TO authenticated
  USING (public.is_editor_or_above(auth.uid()));
CREATE POLICY "cv_editor_insert" ON public.catalog_card_variants FOR INSERT TO authenticated
  WITH CHECK (public.is_editor_or_above(auth.uid()));
CREATE POLICY "cv_editor_update" ON public.catalog_card_variants FOR UPDATE TO authenticated
  USING (public.is_editor_or_above(auth.uid())) WITH CHECK (public.is_editor_or_above(auth.uid()));
CREATE POLICY "cv_superadmin_delete" ON public.catalog_card_variants FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_cv_updated BEFORE UPDATE ON public.catalog_card_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Junctions
CREATE TABLE public.card_variant_additional_occasions (
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  occasion_id UUID NOT NULL REFERENCES public.catalog_occasions(id) ON DELETE CASCADE,
  PRIMARY KEY (card_variant_id, occasion_id)
);
CREATE TABLE public.card_variant_categories (
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.catalog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (card_variant_id, category_id)
);
CREATE TABLE public.card_variant_recipients (
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.catalog_recipients(id) ON DELETE CASCADE,
  PRIMARY KEY (card_variant_id, recipient_id)
);
CREATE TABLE public.card_variant_tags (
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.catalog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_variant_id, tag_id)
);
CREATE TABLE public.card_variant_visual_objects (
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  visual_object_id UUID NOT NULL REFERENCES public.catalog_visual_objects(id) ON DELETE CASCADE,
  PRIMARY KEY (card_variant_id, visual_object_id)
);
CREATE TABLE public.card_variant_themes (
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.catalog_themes(id) ON DELETE CASCADE,
  PRIMARY KEY (card_variant_id, theme_id)
);
CREATE TABLE public.card_variant_seasons (
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.catalog_seasons(id) ON DELETE CASCADE,
  PRIMARY KEY (card_variant_id, season_id)
);

DO $$
DECLARE t TEXT;
DECLARE tables TEXT[] := ARRAY[
  'card_variant_additional_occasions','card_variant_categories','card_variant_recipients',
  'card_variant_tags','card_variant_visual_objects','card_variant_themes','card_variant_seasons'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated;', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "%s_public_read" ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY "%s_editor_write" ON public.%I FOR ALL TO authenticated USING (public.is_editor_or_above(auth.uid())) WITH CHECK (public.is_editor_or_above(auth.uid()));', t, t);
  END LOOP;
END $$;

-- =====================================================================
-- CARD TRANSLATIONS + TEXT DESIGNS
-- =====================================================================
CREATE TABLE public.catalog_card_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON UPDATE CASCADE,
  title TEXT,
  greeting_text TEXT,
  description TEXT,
  alt_text TEXT,
  slug TEXT,
  seo_title TEXT,
  seo_description TEXT,
  search_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  translation_status public.translation_status NOT NULL DEFAULT 'draft',
  translated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_variant_id, language_code)
);
CREATE INDEX idx_cct_variant ON public.catalog_card_translations(card_variant_id);
GRANT SELECT ON public.catalog_card_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalog_card_translations TO authenticated;
GRANT ALL ON public.catalog_card_translations TO service_role;
ALTER TABLE public.catalog_card_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cct_public_read" ON public.catalog_card_translations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.catalog_card_variants v
    WHERE v.id = card_variant_id AND v.status='published' AND NOT v.is_hidden AND NOT v.is_archived AND v.deleted_at IS NULL
  ));
CREATE POLICY "cct_editor_read" ON public.catalog_card_translations FOR SELECT TO authenticated
  USING (public.is_editor_or_above(auth.uid()));
CREATE POLICY "cct_editor_write" ON public.catalog_card_translations FOR ALL TO authenticated
  USING (public.is_editor_or_above(auth.uid())) WITH CHECK (public.is_editor_or_above(auth.uid()));
CREATE TRIGGER trg_cct_updated BEFORE UPDATE ON public.catalog_card_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.catalog_text_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_variant_id UUID NOT NULL REFERENCES public.catalog_card_variants(id) ON DELETE CASCADE,
  language_code TEXT REFERENCES public.languages(code) ON UPDATE CASCADE,
  text_x NUMERIC NOT NULL DEFAULT 10,
  text_y NUMERIC NOT NULL DEFAULT 70,
  text_width NUMERIC NOT NULL DEFAULT 80,
  text_height NUMERIC,
  alignment TEXT NOT NULL DEFAULT 'center',
  vertical_alignment TEXT NOT NULL DEFAULT 'top',
  font_family TEXT NOT NULL DEFAULT 'Fraunces',
  font_size NUMERIC NOT NULL DEFAULT 42,
  font_weight INT NOT NULL DEFAULT 600,
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  background_color TEXT,
  background_opacity NUMERIC NOT NULL DEFAULT 0,
  line_height NUMERIC NOT NULL DEFAULT 1.2,
  letter_spacing NUMERIC NOT NULL DEFAULT 0,
  text_shadow BOOLEAN NOT NULL DEFAULT true,
  text_outline BOOLEAN NOT NULL DEFAULT false,
  rotation NUMERIC NOT NULL DEFAULT 0,
  max_lines INT NOT NULL DEFAULT 3,
  mobile_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  tablet_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  desktop_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_variant_id, language_code)
);
GRANT SELECT ON public.catalog_text_designs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalog_text_designs TO authenticated;
GRANT ALL ON public.catalog_text_designs TO service_role;
ALTER TABLE public.catalog_text_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ctd_public_read" ON public.catalog_text_designs FOR SELECT USING (true);
CREATE POLICY "ctd_editor_write" ON public.catalog_text_designs FOR ALL TO authenticated
  USING (public.is_editor_or_above(auth.uid())) WITH CHECK (public.is_editor_or_above(auth.uid()));
CREATE TRIGGER trg_ctd_updated BEFORE UPDATE ON public.catalog_text_designs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- ORDERS
-- =====================================================================
CREATE SEQUENCE public.orders_number_seq START 100001;
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE DEFAULT ('PJ-' || nextval('public.orders_number_seq')),
  product_type TEXT NOT NULL,
  title TEXT,
  source_language TEXT REFERENCES public.languages(code),
  requested_language TEXT REFERENCES public.languages(code),
  customer_prompt TEXT,
  customer_text TEXT,
  duration_seconds INT,
  priority_level INT NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'draft',
  queue_position INT,
  estimated_completion_at TIMESTAMPTZ,
  scheduled_delivery_at TIMESTAMPTZ,
  delivery_method TEXT,
  recipient_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  credits_reserved INT NOT NULL DEFAULT 0,
  credits_charged INT NOT NULL DEFAULT 0,
  monetary_amount NUMERIC(12,2),
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_owner_read" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "orders_owner_insert" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_owner_update" ON public.orders FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_order_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE TABLE public.order_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  participant_role TEXT NOT NULL,
  display_name TEXT,
  linked_media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  is_minor BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_participants TO authenticated;
GRANT ALL ON public.order_participants TO service_role;
ALTER TABLE public.order_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_owner_all" ON public.order_participants FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND (o.user_id=auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND (o.user_id=auth.uid() OR public.is_admin(auth.uid()))));
CREATE TRIGGER trg_op_updated BEFORE UPDATE ON public.order_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES public.order_participants(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deletion_requested_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_owner_read" ON public.consent_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "consent_owner_insert" ON public.consent_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- VOICE PROFILES
-- =====================================================================
CREATE TABLE public.voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  source_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  consent_confirmed_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_profiles TO authenticated;
GRANT ALL ON public.voice_profiles TO service_role;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vp_owner_all" ON public.voice_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_vp_updated BEFORE UPDATE ON public.voice_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- GENERATION JOBS
-- =====================================================================
CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  provider TEXT,
  provider_model TEXT,
  status public.generation_job_status NOT NULL DEFAULT 'pending',
  priority INT NOT NULL DEFAULT 0,
  attempt_number INT NOT NULL DEFAULT 0,
  input_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_request_id TEXT,
  estimated_provider_cost NUMERIC(12,4),
  actual_provider_cost NUMERIC(12,4),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gj_order ON public.generation_jobs(order_id);
CREATE INDEX idx_gj_status ON public.generation_jobs(status);
GRANT SELECT ON public.generation_jobs TO authenticated;
GRANT ALL ON public.generation_jobs TO service_role;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gj_owner_read" ON public.generation_jobs FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.user_id=auth.uid()) OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_gj_updated BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.generation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_job_id UUID NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  provider TEXT,
  status public.generation_job_status NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output_asset_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  cost NUMERIC(12,4),
  error_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.generation_attempts TO authenticated;
GRANT ALL ON public.generation_attempts TO service_role;
ALTER TABLE public.generation_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ga_admin_read" ON public.generation_attempts FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- =====================================================================
-- CREDITS + PAYMENTS
-- =====================================================================
CREATE TABLE public.credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  lifetime_purchased INT NOT NULL DEFAULT 0,
  lifetime_spent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cw_owner_read" ON public.credit_wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_cw_updated BEFORE UPDATE ON public.credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  txn_type public.credit_txn_type NOT NULL,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id UUID,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ct_wallet ON public.credit_transactions(wallet_id);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_owner_read" ON public.credit_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_records TO authenticated;
GRANT ALL ON public.payment_records TO service_role;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_owner_read" ON public.payment_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  provider TEXT,
  provider_reference TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_owner_read" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_sub_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subscription_credit_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  granted_amount INT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.subscription_credit_grants TO authenticated;
GRANT ALL ON public.subscription_credit_grants TO service_role;
ALTER TABLE public.subscription_credit_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scg_owner_read" ON public.subscription_credit_grants FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND (s.user_id=auth.uid() OR public.is_admin(auth.uid()))));

-- =====================================================================
-- DELIVERY + NOTIFICATIONS
-- =====================================================================
CREATE TABLE public.scheduled_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  channel public.notification_channel NOT NULL,
  destination TEXT NOT NULL,
  status public.notification_status NOT NULL DEFAULT 'pending',
  attempted_count INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.scheduled_deliveries TO authenticated;
GRANT ALL ON public.scheduled_deliveries TO service_role;
ALTER TABLE public.scheduled_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sd_owner_all" ON public.scheduled_deliveries FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_sd_updated BEFORE UPDATE ON public.scheduled_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "np_owner_all" ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_np_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel public.notification_channel NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.notification_status NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_jobs TO authenticated;
GRANT ALL ON public.notification_jobs TO service_role;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nj_owner_read" ON public.notification_jobs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_nj_updated BEFORE UPDATE ON public.notification_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_job_id UUID REFERENCES public.notification_jobs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel public.notification_channel NOT NULL,
  status public.notification_status NOT NULL,
  provider_reference TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_owner_read" ON public.notification_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- =====================================================================
-- ADMIN AUDIT LOG
-- =====================================================================
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  previous_data JSONB,
  new_data JSONB,
  request_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON public.admin_audit_log(actor_user_id);
CREATE INDEX idx_audit_entity ON public.admin_audit_log(entity_type, entity_id);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "audit_editor_insert" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_editor_or_above(auth.uid()) AND actor_user_id = auth.uid());

-- =====================================================================
-- SEED CATALOG TAXONOMY (slugs + multilingual labels)
-- =====================================================================

-- Helper to insert taxonomy + all 6 translations
CREATE OR REPLACE FUNCTION public._seed_taxonomy(
  _table TEXT, _trans_table TEXT, _fk TEXT,
  _slug TEXT, _sort INT, _icon TEXT,
  _ru TEXT, _en TEXT, _de TEXT, _uk TEXT, _fr TEXT, _pl TEXT
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE _id UUID;
BEGIN
  EXECUTE format('INSERT INTO public.%I (slug, sort_order, icon) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id', _table)
    INTO _id USING _slug, _sort, _icon;
  EXECUTE format('INSERT INTO public.%I (%I, language_code, name) VALUES ($1,$2,$3),($1,$4,$5),($1,$6,$7),($1,$8,$9),($1,$10,$11),($1,$12,$13) ON CONFLICT (%I, language_code) DO UPDATE SET name=EXCLUDED.name',
                 _trans_table, _fk, _fk)
    USING _id, 'ru', _ru, 'en', _en, 'de', _de, 'uk', _uk, 'fr', _fr, 'pl', _pl;
  RETURN _id;
END; $$;

-- Same but for taxonomies without an icon column
CREATE OR REPLACE FUNCTION public._seed_taxonomy_noicon(
  _table TEXT, _trans_table TEXT, _fk TEXT,
  _slug TEXT, _sort INT,
  _ru TEXT, _en TEXT, _de TEXT, _uk TEXT, _fr TEXT, _pl TEXT
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE _id UUID;
BEGIN
  EXECUTE format('INSERT INTO public.%I (slug, sort_order) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id', _table)
    INTO _id USING _slug, _sort;
  EXECUTE format('INSERT INTO public.%I (%I, language_code, name) VALUES ($1,$2,$3),($1,$4,$5),($1,$6,$7),($1,$8,$9),($1,$10,$11),($1,$12,$13) ON CONFLICT (%I, language_code) DO UPDATE SET name=EXCLUDED.name',
                 _trans_table, _fk, _fk)
    USING _id, 'ru', _ru, 'en', _en, 'de', _de, 'uk', _uk, 'fr', _fr, 'pl', _pl;
  RETURN _id;
END; $$;

-- Occasions
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','birthday',1,'🎂','День рождения','Birthday','Geburtstag','День народження','Anniversaire','Urodziny');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','wedding',2,'💍','Свадьба','Wedding','Hochzeit','Весілля','Mariage','Ślub');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','anniversary',3,'🥂','Годовщина','Anniversary','Jahrestag','Річниця','Anniversaire de mariage','Rocznica');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','newborn',4,'👶','Рождение ребёнка','Newborn','Neugeborenes','Народження дитини','Naissance','Narodziny');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','graduation',5,'🎓','Выпускной','Graduation','Abschluss','Випускний','Remise de diplôme','Ukończenie szkoły');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','new_year',6,'🎄','Новый год','New Year','Neujahr','Новий рік','Nouvel an','Nowy Rok');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','christmas',7,'🎁','Рождество','Christmas','Weihnachten','Різдво','Noël','Boże Narodzenie');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','valentines',8,'💌','День святого Валентина','Valentine''s Day','Valentinstag','День Валентина','Saint-Valentin','Walentynki');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','mothers_day',9,'💐','День матери','Mother''s Day','Muttertag','День матері','Fête des mères','Dzień Matki');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','fathers_day',10,'🎩','День отца','Father''s Day','Vatertag','День батька','Fête des pères','Dzień Ojca');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','get_well',11,'🌷','Выздоравливай','Get Well','Gute Besserung','Одужання','Bon rétablissement','Powrót do zdrowia');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','thank_you',12,'🙏','Спасибо','Thank You','Danke','Дякую','Merci','Dziękuję');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','congratulations',13,'🎉','Поздравления','Congratulations','Glückwunsch','Вітання','Félicitations','Gratulacje');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','forgive_me',14,'🕊️','Прости меня','Forgive Me','Verzeih mir','Прости мене','Pardonne-moi','Wybacz mi');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','love',15,'❤️','Любовь','Love','Liebe','Кохання','Amour','Miłość');
SELECT public._seed_taxonomy('catalog_occasions','catalog_occasion_translations','occasion_id','farewell',16,'👋','Прощание','Farewell','Abschied','Прощання','Adieu','Pożegnanie');

-- Recipients
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','mother',1,'👩','Маме','For Mother','Für die Mutter','Мамі','Pour maman','Dla mamy');
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','father',2,'👨','Папе','For Father','Für den Vater','Татові','Pour papa','Dla taty');
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','wife',3,'💗','Жене','For Wife','Für die Ehefrau','Дружині','Pour épouse','Dla żony');
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','husband',4,'💙','Мужу','For Husband','Für den Ehemann','Чоловікові','Pour époux','Dla męża');
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','daughter',5,'👧','Дочери','For Daughter','Für die Tochter','Доньці','Pour fille','Dla córki');
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','son',6,'👦','Сыну','For Son','Für den Sohn','Синові','Pour fils','Dla syna');
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','friend',7,'👯','Другу','For Friend','Für Freund','Другові','Pour ami','Dla przyjaciela');
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','colleague',8,'💼','Коллеге','For Colleague','Für Kollegen','Колезі','Pour collègue','Dla kolegi');
SELECT public._seed_taxonomy('catalog_recipients','catalog_recipient_translations','recipient_id','grandparent',9,'👴','Бабушке/Дедушке','For Grandparent','Für Großeltern','Бабусі/Дідусю','Pour grands-parents','Dla dziadków');

-- Categories (a compact starter set)
SELECT public._seed_taxonomy('catalog_categories','catalog_category_translations','category_id','holidays',1,'🎊','Праздники','Holidays','Feiertage','Свята','Fêtes','Święta');
SELECT public._seed_taxonomy('catalog_categories','catalog_category_translations','category_id','family',2,'👨‍👩‍👧','Семья','Family','Familie','Родина','Famille','Rodzina');
SELECT public._seed_taxonomy('catalog_categories','catalog_category_translations','category_id','love',3,'💖','Любовь','Love','Liebe','Кохання','Amour','Miłość');
SELECT public._seed_taxonomy('catalog_categories','catalog_category_translations','category_id','friendship',4,'🤝','Дружба','Friendship','Freundschaft','Дружба','Amitié','Przyjaźń');
SELECT public._seed_taxonomy('catalog_categories','catalog_category_translations','category_id','work',5,'🏢','Работа','Work','Arbeit','Робота','Travail','Praca');
SELECT public._seed_taxonomy('catalog_categories','catalog_category_translations','category_id','children',6,'🧒','Детям','Children','Kinder','Дітям','Enfants','Dzieci');
SELECT public._seed_taxonomy('catalog_categories','catalog_category_translations','category_id','apologies',7,'🕊️','Извинения','Apologies','Entschuldigung','Вибачення','Excuses','Przeprosiny');
SELECT public._seed_taxonomy('catalog_categories','catalog_category_translations','category_id','gratitude',8,'🙏','Благодарность','Gratitude','Dankbarkeit','Подяка','Gratitude','Wdzięczność');

-- Styles
SELECT public._seed_taxonomy_noicon('catalog_styles','catalog_style_translations','style_id','warm',1,'Тёплый','Warm','Warm','Теплий','Chaleureux','Ciepły');
SELECT public._seed_taxonomy_noicon('catalog_styles','catalog_style_translations','style_id','elegant',2,'Элегантный','Elegant','Elegant','Елегантний','Élégant','Elegancki');
SELECT public._seed_taxonomy_noicon('catalog_styles','catalog_style_translations','style_id','funny',3,'Весёлый','Funny','Lustig','Веселий','Drôle','Zabawny');
SELECT public._seed_taxonomy_noicon('catalog_styles','catalog_style_translations','style_id','minimalist',4,'Минимализм','Minimalist','Minimalistisch','Мінімалізм','Minimaliste','Minimalistyczny');
SELECT public._seed_taxonomy_noicon('catalog_styles','catalog_style_translations','style_id','vintage',5,'Винтаж','Vintage','Vintage','Вінтаж','Vintage','Vintage');
SELECT public._seed_taxonomy_noicon('catalog_styles','catalog_style_translations','style_id','modern',6,'Современный','Modern','Modern','Сучасний','Moderne','Nowoczesny');

-- Moods
SELECT public._seed_taxonomy_noicon('catalog_moods','catalog_mood_translations','mood_id','joyful',1,'Радостное','Joyful','Fröhlich','Радісне','Joyeux','Radosny');
SELECT public._seed_taxonomy_noicon('catalog_moods','catalog_mood_translations','mood_id','romantic',2,'Романтичное','Romantic','Romantisch','Романтичне','Romantique','Romantyczny');
SELECT public._seed_taxonomy_noicon('catalog_moods','catalog_mood_translations','mood_id','peaceful',3,'Спокойное','Peaceful','Ruhig','Спокійне','Paisible','Spokojny');
SELECT public._seed_taxonomy_noicon('catalog_moods','catalog_mood_translations','mood_id','uplifting',4,'Вдохновляющее','Uplifting','Aufmunternd','Надихаюче','Encourageant','Inspirujący');
SELECT public._seed_taxonomy_noicon('catalog_moods','catalog_mood_translations','mood_id','playful',5,'Игривое','Playful','Verspielt','Грайливе','Enjoué','Figlarny');
SELECT public._seed_taxonomy_noicon('catalog_moods','catalog_mood_translations','mood_id','solemn',6,'Торжественное','Solemn','Feierlich','Урочисте','Solennel','Uroczysty');

-- Visual objects
SELECT public._seed_taxonomy_noicon('catalog_visual_objects','catalog_visual_object_translations','visual_object_id','flowers',1,'Цветы','Flowers','Blumen','Квіти','Fleurs','Kwiaty');
SELECT public._seed_taxonomy_noicon('catalog_visual_objects','catalog_visual_object_translations','visual_object_id','balloons',2,'Шары','Balloons','Ballons','Кульки','Ballons','Balony');
SELECT public._seed_taxonomy_noicon('catalog_visual_objects','catalog_visual_object_translations','visual_object_id','cake',3,'Торт','Cake','Kuchen','Торт','Gâteau','Ciasto');
SELECT public._seed_taxonomy_noicon('catalog_visual_objects','catalog_visual_object_translations','visual_object_id','hearts',4,'Сердца','Hearts','Herzen','Сердечка','Cœurs','Serca');
SELECT public._seed_taxonomy_noicon('catalog_visual_objects','catalog_visual_object_translations','visual_object_id','stars',5,'Звёзды','Stars','Sterne','Зірки','Étoiles','Gwiazdy');
SELECT public._seed_taxonomy_noicon('catalog_visual_objects','catalog_visual_object_translations','visual_object_id','candles',6,'Свечи','Candles','Kerzen','Свічки','Bougies','Świece');

-- Age groups
SELECT public._seed_taxonomy_noicon('catalog_age_groups','catalog_age_group_translations','age_group_id','children',1,'Дети','Children','Kinder','Діти','Enfants','Dzieci');
SELECT public._seed_taxonomy_noicon('catalog_age_groups','catalog_age_group_translations','age_group_id','teens',2,'Подростки','Teens','Teenager','Підлітки','Adolescents','Nastolatki');
SELECT public._seed_taxonomy_noicon('catalog_age_groups','catalog_age_group_translations','age_group_id','adults',3,'Взрослые','Adults','Erwachsene','Дорослі','Adultes','Dorośli');
SELECT public._seed_taxonomy_noicon('catalog_age_groups','catalog_age_group_translations','age_group_id','seniors',4,'Пожилые','Seniors','Senioren','Літні','Seniors','Seniorzy');
SELECT public._seed_taxonomy_noicon('catalog_age_groups','catalog_age_group_translations','age_group_id','all_ages',5,'Все возрасты','All Ages','Alle Altersgruppen','Всі віки','Tous âges','Wszystkie wieki');

-- Seasons
SELECT public._seed_taxonomy_noicon('catalog_seasons','catalog_season_translations','season_id','spring',1,'Весна','Spring','Frühling','Весна','Printemps','Wiosna');
SELECT public._seed_taxonomy_noicon('catalog_seasons','catalog_season_translations','season_id','summer',2,'Лето','Summer','Sommer','Літо','Été','Lato');
SELECT public._seed_taxonomy_noicon('catalog_seasons','catalog_season_translations','season_id','autumn',3,'Осень','Autumn','Herbst','Осінь','Automne','Jesień');
SELECT public._seed_taxonomy_noicon('catalog_seasons','catalog_season_translations','season_id','winter',4,'Зима','Winter','Winter','Зима','Hiver','Zima');
SELECT public._seed_taxonomy_noicon('catalog_seasons','catalog_season_translations','season_id','all_year',5,'Круглый год','All Year','Ganzjährig','Цілий рік','Toute l''année','Cały rok');

-- Themes
SELECT public._seed_taxonomy_noicon('catalog_themes','catalog_theme_translations','theme_id','floral',1,'Цветочная','Floral','Blumig','Квіткова','Floral','Kwiatowy');
SELECT public._seed_taxonomy_noicon('catalog_themes','catalog_theme_translations','theme_id','abstract',2,'Абстракция','Abstract','Abstrakt','Абстракція','Abstrait','Abstrakcja');
SELECT public._seed_taxonomy_noicon('catalog_themes','catalog_theme_translations','theme_id','nature',3,'Природа','Nature','Natur','Природа','Nature','Natura');
SELECT public._seed_taxonomy_noicon('catalog_themes','catalog_theme_translations','theme_id','geometric',4,'Геометрия','Geometric','Geometrisch','Геометрія','Géométrique','Geometryczny');
SELECT public._seed_taxonomy_noicon('catalog_themes','catalog_theme_translations','theme_id','watercolor',5,'Акварель','Watercolor','Aquarell','Акварель','Aquarelle','Akwarela');
SELECT public._seed_taxonomy_noicon('catalog_themes','catalog_theme_translations','theme_id','gold_luxe',6,'Золото и роскошь','Gold & Luxe','Gold & Luxus','Золото та розкіш','Or & Luxe','Złoto i luksus');

DROP FUNCTION public._seed_taxonomy(TEXT,TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION public._seed_taxonomy_noicon(TEXT,TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);

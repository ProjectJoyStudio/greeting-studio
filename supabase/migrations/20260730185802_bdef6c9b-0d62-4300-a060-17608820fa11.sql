ALTER TABLE public.live_card_animations
  ADD COLUMN IF NOT EXISTS greeting_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS greeting_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS greeting_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS text_design jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS text_saved_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.live_card_animations ALTER COLUMN sound_enabled SET DEFAULT false;
UPDATE public.live_card_animations SET sound_enabled = false WHERE sound_enabled IS TRUE;

DROP POLICY IF EXISTS "Admins can view all live card animations" ON public.live_card_animations;
CREATE POLICY "Admins can view all live card animations"
ON public.live_card_animations FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage live card animations" ON public.live_card_animations;
CREATE POLICY "Admins can manage live card animations"
ON public.live_card_animations FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
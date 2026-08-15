GRANT INSERT, UPDATE ON public.app_settings TO authenticated;

DROP POLICY IF EXISTS "Admins insert settings" ON public.app_settings;
CREATE POLICY "Admins insert settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update settings" ON public.app_settings;
CREATE POLICY "Admins update settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
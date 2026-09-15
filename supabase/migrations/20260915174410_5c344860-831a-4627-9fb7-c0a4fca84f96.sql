REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.submission_throttle FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.submission_throttle TO service_role;
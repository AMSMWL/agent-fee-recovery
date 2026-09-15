-- 1) Restrict reads on financial tables to staff (admin/accounting) only.
DROP POLICY IF EXISTS "Signed-in users can read refund requests" ON public.refund_requests;
CREATE POLICY "Staff can read refund requests"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Signed-in users can read credits" ON public.fmls_credits;
CREATE POLICY "Staff can read credits"
  ON public.fmls_credits FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- 2) Atomic rate-limit check for anonymous submissions.
CREATE OR REPLACE FUNCTION public.record_submission_attempt(
  _client_key text,
  _max_per_window integer,
  _window_minutes integer
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ins AS (
    INSERT INTO public.submission_throttle (client_key)
    VALUES (_client_key)
    RETURNING id
  )
  SELECT count(*) <= _max_per_window
  FROM public.submission_throttle t
  WHERE t.client_key = _client_key
    AND t.created_at >= now() - make_interval(mins => _window_minutes)
    AND (SELECT count(*) FROM ins) = 1;
$$;

REVOKE ALL ON FUNCTION public.record_submission_attempt(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_submission_attempt(text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.record_submission_attempt(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_submission_attempt(text, integer, integer) TO service_role;

-- 3) Document the intentional service-role pass-through in the matching trigger.
COMMENT ON FUNCTION public.match_fmls_credit() IS
  'Auto-matches a new FMLS credit to the oldest pending refund request. When auth.uid() IS NULL the caller is the trusted server (service_role) path used by server functions and migrations, so the staff check is intentionally skipped; anon has no privileges on fmls_credits, so this path is not reachable by unauthenticated users.';
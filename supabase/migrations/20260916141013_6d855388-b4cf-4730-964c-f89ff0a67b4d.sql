-- Safe, non-financial view of refund requests for signed-in non-staff accounts.
CREATE OR REPLACE FUNCTION public.list_refund_requests_safe()
RETURNS TABLE (
  id uuid,
  agent_name text,
  fmls_number text,
  transaction_type transaction_type,
  property_address text,
  submission_date date,
  prior_waiver boolean,
  prior_waiver_date date,
  prior_waiver_details text,
  notes text,
  status refund_status,
  credit_amount numeric,
  credit_entered_at timestamptz,
  processed_at timestamptz,
  payment_date date,
  refund_amount numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.agent_name, r.fmls_number, r.transaction_type, r.property_address,
         r.submission_date, r.prior_waiver, r.prior_waiver_date, r.prior_waiver_details,
         r.notes, r.status, r.credit_amount, r.credit_entered_at, r.processed_at,
         r.payment_date, r.refund_amount, r.created_at
  FROM public.refund_requests r
  WHERE auth.uid() IS NOT NULL
  ORDER BY r.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_refund_requests_safe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_refund_requests_safe() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_refund_requests_safe() TO authenticated;

-- Throttle: per-key cap plus a global cap for the same window.
CREATE OR REPLACE FUNCTION public.record_submission_attempt(
  _client_key text,
  _max_per_window integer,
  _window_minutes integer,
  _max_global integer DEFAULT 200
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
  ),
  win AS (
    SELECT
      count(*) FILTER (WHERE t.client_key = _client_key) AS key_count,
      count(*) AS global_count
    FROM public.submission_throttle t
    WHERE t.created_at >= now() - make_interval(mins => _window_minutes)
      AND (SELECT count(*) FROM ins) = 1
  )
  SELECT key_count <= _max_per_window AND global_count <= _max_global FROM win;
$$;

REVOKE ALL ON FUNCTION public.record_submission_attempt(text, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_submission_attempt(text, integer, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.record_submission_attempt(text, integer, integer, integer) FROM authenticated;

-- Atomic role replacement: admin-only, refuses self-change.
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own access level';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role <> _role;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO authenticated;
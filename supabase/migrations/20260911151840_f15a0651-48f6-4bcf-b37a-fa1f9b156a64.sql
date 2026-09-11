-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'accounting', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'accounting')
  )
$$;

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. refund_requests: no direct anonymous writes; staff-only mutations
DROP POLICY IF EXISTS "Anyone can submit a refund request" ON public.refund_requests;
DROP POLICY IF EXISTS "Team can read refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Team can insert refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Team can update refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Team can delete refund requests" ON public.refund_requests;

REVOKE ALL ON public.refund_requests FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

CREATE POLICY "Signed-in users can read refund requests"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can insert refund requests"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update refund requests"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admins can delete refund requests"
  ON public.refund_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. fmls_credits: staff-only writes
DROP POLICY IF EXISTS "Team can read credits" ON public.fmls_credits;
DROP POLICY IF EXISTS "Team can insert credits" ON public.fmls_credits;
DROP POLICY IF EXISTS "Team can update credits" ON public.fmls_credits;
DROP POLICY IF EXISTS "Team can delete credits" ON public.fmls_credits;

REVOKE ALL ON public.fmls_credits FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fmls_credits TO authenticated;
GRANT ALL ON public.fmls_credits TO service_role;

CREATE POLICY "Signed-in users can read credits"
  ON public.fmls_credits FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can insert credits"
  ON public.fmls_credits FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND (entered_by IS NULL OR entered_by = auth.uid()));

CREATE POLICY "Staff can update credits"
  ON public.fmls_credits FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admins can delete credits"
  ON public.fmls_credits FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Harden the auto-match trigger
CREATE OR REPLACE FUNCTION public.match_fmls_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  target_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only accounting or admin users may record FMLS credits';
  END IF;

  SELECT id INTO target_id
  FROM public.refund_requests
  WHERE lower(trim(fmls_number)) = lower(trim(NEW.fmls_number))
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;

  IF target_id IS NOT NULL THEN
    UPDATE public.refund_requests
    SET status = 'approved',
        credit_amount = NEW.credit_amount,
        credit_entered_at = now(),
        credit_entered_by = NEW.entered_by
    WHERE id = target_id;

    NEW.matched_request_id = target_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Rate-limit ledger for public submissions (server-side only)
CREATE TABLE public.submission_throttle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX submission_throttle_key_time_idx
  ON public.submission_throttle (client_key, created_at DESC);

GRANT ALL ON public.submission_throttle TO service_role;

ALTER TABLE public.submission_throttle ENABLE ROW LEVEL SECURITY;

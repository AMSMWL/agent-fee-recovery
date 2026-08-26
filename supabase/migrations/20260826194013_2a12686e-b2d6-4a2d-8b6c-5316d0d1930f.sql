CREATE TYPE public.refund_status AS ENUM ('pending', 'approved', 'processed');

CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_name TEXT NOT NULL,
  broker_email TEXT,
  agent_name TEXT NOT NULL,
  agent_email TEXT,
  agent_fmls_id TEXT,
  fmls_number TEXT NOT NULL,
  property_address TEXT,
  closing_date DATE,
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status public.refund_status NOT NULL DEFAULT 'pending',
  credit_amount NUMERIC(12,2),
  credit_entered_at TIMESTAMPTZ,
  credit_entered_by UUID,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  processed_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refund_requests_fmls ON public.refund_requests (fmls_number);
CREATE INDEX idx_refund_requests_status ON public.refund_requests (status);

CREATE TABLE public.fmls_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fmls_number TEXT NOT NULL,
  credit_amount NUMERIC(12,2) NOT NULL,
  invoice_month DATE,
  matched_request_id UUID REFERENCES public.refund_requests(id) ON DELETE SET NULL,
  entered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fmls_credits_fmls ON public.fmls_credits (fmls_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_requests TO authenticated;
GRANT INSERT ON public.refund_requests TO anon;
GRANT ALL ON public.refund_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fmls_credits TO authenticated;
GRANT ALL ON public.fmls_credits TO service_role;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmls_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a refund request"
  ON public.refund_requests FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Team can read refund requests"
  ON public.refund_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can insert refund requests"
  ON public.refund_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team can update refund requests"
  ON public.refund_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Team can delete refund requests"
  ON public.refund_requests FOR DELETE TO authenticated USING (true);

CREATE POLICY "Team can read credits"
  ON public.fmls_credits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can insert credits"
  ON public.fmls_credits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team can update credits"
  ON public.fmls_credits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Team can delete credits"
  ON public.fmls_credits FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.match_fmls_credit()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_match_fmls_credit
  BEFORE INSERT ON public.fmls_credits
  FOR EACH ROW EXECUTE FUNCTION public.match_fmls_credit();
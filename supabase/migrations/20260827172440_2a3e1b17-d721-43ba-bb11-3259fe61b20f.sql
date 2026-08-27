CREATE TYPE public.transaction_type AS ENUM ('personal_home_purchase', 'personal_home_sale');

ALTER TABLE public.refund_requests
  ADD COLUMN transaction_type public.transaction_type,
  ADD COLUMN submission_date date,
  ADD COLUMN prior_waiver boolean NOT NULL DEFAULT false,
  ADD COLUMN prior_waiver_date date,
  ADD COLUMN prior_waiver_details text;

ALTER TABLE public.refund_requests
  ALTER COLUMN broker_name DROP NOT NULL,
  ALTER COLUMN fee_amount DROP NOT NULL;
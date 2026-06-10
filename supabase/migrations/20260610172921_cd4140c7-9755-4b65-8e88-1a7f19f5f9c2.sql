
CREATE TABLE IF NOT EXISTS public.billing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pub_name text,
  amount_inr integer NOT NULL DEFAULT 599,
  status text NOT NULL DEFAULT 'pending',
  note text,
  transaction_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_requests_status_chk CHECK (status IN ('pending','verified','rejected'))
);

GRANT SELECT, INSERT ON public.billing_requests TO authenticated;
GRANT ALL ON public.billing_requests TO service_role;

ALTER TABLE public.billing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants insert their own billing request"
  ON public.billing_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants read their own billing requests"
  ON public.billing_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all billing requests"
  ON public.billing_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER billing_requests_touch_updated_at
  BEFORE UPDATE ON public.billing_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS billing_requests_user_id_idx ON public.billing_requests(user_id);
CREATE INDEX IF NOT EXISTS billing_requests_status_idx ON public.billing_requests(status);

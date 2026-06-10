
CREATE TABLE public.advertiser_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pub_name text NOT NULL,
  city text NOT NULL,
  contact_info text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.advertiser_leads TO anon, authenticated;
GRANT ALL ON public.advertiser_leads TO service_role;

ALTER TABLE public.advertiser_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a sponsorship request"
  ON public.advertiser_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(pub_name)) BETWEEN 1 AND 120
    AND length(trim(city)) BETWEEN 1 AND 80
    AND length(trim(contact_info)) BETWEEN 3 AND 240
  );

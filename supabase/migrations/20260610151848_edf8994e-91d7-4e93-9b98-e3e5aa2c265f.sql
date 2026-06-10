
CREATE TABLE IF NOT EXISTS public.merchant_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pub_name TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  deal_text TEXT NOT NULL,
  urgency_level INTEGER NOT NULL DEFAULT 1 CHECK (urgency_level BETWEEN 1 AND 3),
  heading_there_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.merchant_deals TO anon, authenticated;
GRANT ALL ON public.merchant_deals TO service_role;

ALTER TABLE public.merchant_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active merchant deals"
  ON public.merchant_deals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated can increment heading there"
  ON public.merchant_deals FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS merchant_deals_touch_updated_at ON public.merchant_deals;
CREATE TRIGGER merchant_deals_touch_updated_at
  BEFORE UPDATE ON public.merchant_deals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS merchant_deals_city_active_idx
  ON public.merchant_deals (city, is_active);

ALTER TABLE public.merchant_deals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_deals;

INSERT INTO public.merchant_deals (pub_name, city, neighborhood, deal_text, urgency_level, heading_there_count, is_active) VALUES
('Toit', 'Bangalore', 'Indiranagar', '⚡ FLASH: Server crashed at a major tech park? First 50 devs showing their terminal get a free stout at Toit Indiranagar — right now.', 3, 47, true),
('Striker Pub & Brewery', 'Gurgaon', 'Cyberhub', '⚡ CYBERHUB: Concurrency bugs in prod? Show this screen at Striker for 1+1 on pitchers before 7 PM.', 2, 38, true),
('Prost Brewpub', 'Hyderabad', 'HITEC City', '⚡ HITEC CITY: Stuck on a Jira sprint? Prost Brewpub pouring buy-1-get-1 wheat beers for badge-flashing engineers till 8 PM.', 2, 29, true),
('Independence Brewing Co.', 'Pune', 'Koregaon Park', '⚡ KOREGAON PARK: Standup ran 90 minutes? IBC dropping ₹199 pints for the next 30 developers through the door.', 2, 22, true),
('The Bar Stock Exchange', 'Mumbai', 'BKC', '⚡ BKC FLASH: PRs piling up? Bar Stock Exchange just crashed lager prices — live ticker pricing until your sprint ends.', 3, 41, true),
('Social Offline', 'Delhi', 'Aerocity', '⚡ AEROCITY: Deployment failed at 6 PM? Social Offline comping the first round for anyone with a red CI build on screen.', 2, 31, true);

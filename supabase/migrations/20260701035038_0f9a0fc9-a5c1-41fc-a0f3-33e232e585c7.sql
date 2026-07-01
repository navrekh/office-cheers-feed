
-- grind_posts
CREATE TABLE public.grind_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.grind_posts TO anon, authenticated;
GRANT ALL ON public.grind_posts TO service_role;
ALTER TABLE public.grind_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grind_posts read all" ON public.grind_posts FOR SELECT USING (true);
CREATE POLICY "grind_posts insert anon" ON public.grind_posts FOR INSERT WITH CHECK (
  length(coalesce(body,'')) <= 2000
  AND coalesce(array_length(tags,1),0) <= 8
  AND coalesce(length(image_url),0) <= 5000000
);

-- shame_metrics
CREATE TABLE public.shame_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL UNIQUE,
  ats_score INT NOT NULL DEFAULT 50,
  ghost_days INT NOT NULL DEFAULT 30,
  rejection_velocity INT NOT NULL DEFAULT 10,
  complaint_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shame_metrics TO anon, authenticated;
GRANT ALL ON public.shame_metrics TO service_role;
ALTER TABLE public.shame_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shame_metrics read all" ON public.shame_metrics FOR SELECT USING (true);

-- bypass_referrals
CREATE TABLE public.bypass_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_profile TEXT NOT NULL,
  referrer_hash TEXT,
  referred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referred_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.bypass_referrals TO anon, authenticated;
GRANT ALL ON public.bypass_referrals TO service_role;
ALTER TABLE public.bypass_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bypass read all" ON public.bypass_referrals FOR SELECT USING (true);
CREATE POLICY "bypass insert anon" ON public.bypass_referrals FOR INSERT WITH CHECK (
  length(candidate_profile) BETWEEN 20 AND 2000
);

-- File complaint RPC — atomic + rate-safe. Anyone can call.
CREATE OR REPLACE FUNCTION public.file_shame_complaint(p_company TEXT, p_severity INT)
RETURNS SETOF public.shame_metrics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta INT := GREATEST(1, LEAST(5, COALESCE(p_severity,0) / 20));
BEGIN
  RETURN QUERY
  UPDATE public.shame_metrics
     SET ats_score = LEAST(100, ats_score + delta),
         ghost_days = ghost_days + (delta / 2),
         rejection_velocity = GREATEST(1, rejection_velocity - (delta / 3)),
         complaint_count = complaint_count + 1,
         updated_at = now()
   WHERE company = p_company
   RETURNING *;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.file_shame_complaint(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.file_shame_complaint(TEXT, INT) TO anon, authenticated;

-- Mark referral RPC
CREATE OR REPLACE FUNCTION public.mark_bypass_referred(p_id UUID)
RETURNS SETOF public.bypass_referrals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.bypass_referrals
     SET referred = true,
         referred_at = now(),
         referrer_hash = encode(gen_random_bytes(8), 'hex')
   WHERE id = p_id AND referred = false
   RETURNING *;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_bypass_referred(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_bypass_referred(UUID) TO anon, authenticated;

-- Seed shame_metrics
INSERT INTO public.shame_metrics (company, ats_score, ghost_days, rejection_velocity) VALUES
  ('Accenture', 94, 42, 3),
  ('Capgemini', 91, 51, 4),
  ('TCS', 88, 38, 6),
  ('Infosys', 86, 45, 5),
  ('Cognizant', 92, 37, 2),
  ('Wipro', 84, 49, 7)
ON CONFLICT (company) DO NOTHING;

-- Seed a couple of grind posts
INSERT INTO public.grind_posts (body, tags) VALUES
  ('Applied to SI firm at 14:03:07. Auto-reject email at 14:03:19. Twelve. Seconds. The algorithm didn''t even pretend to read.', ARRAY['Instant Rejection','AI Assessment Choke']),
  ('Round 7. ''Culture fit.'' They asked me to whiteboard leftpad. Ghosted 3 weeks later.', ARRAY['7-Round Interview Traumatic Stress','Ghosted 30 Days']);

-- Seed bypass candidates
INSERT INTO public.bypass_referrals (candidate_profile) VALUES
  ('Backend / Go+Rust · gRPC · 8y distributed systems · k8s operator author · 40M QPS load handled'),
  ('ML/Infra · PyTorch · CUDA kernel opt · trained 7B param model · MLOps @ hyperscaler');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.grind_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shame_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bypass_referrals;

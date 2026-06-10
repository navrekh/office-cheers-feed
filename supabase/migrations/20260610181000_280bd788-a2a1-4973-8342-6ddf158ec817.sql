
CREATE TABLE IF NOT EXISTS public.city_campaigns (
  city text PRIMARY KEY,
  vote_count integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 500,
  launched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.city_campaigns TO anon, authenticated;
GRANT ALL ON public.city_campaigns TO service_role;
ALTER TABLE public.city_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "city_campaigns public read"
  ON public.city_campaigns FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.city_campaign_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS city_campaign_votes_user_idx
  ON public.city_campaign_votes (city, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS city_campaign_votes_session_idx
  ON public.city_campaign_votes (city, session_id) WHERE session_id IS NOT NULL;

GRANT SELECT ON public.city_campaign_votes TO authenticated;
GRANT ALL ON public.city_campaign_votes TO service_role;
ALTER TABLE public.city_campaign_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voters see own votes"
  ON public.city_campaign_votes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.vote_for_city(
  p_city text,
  p_session_id text DEFAULT NULL
) RETURNS TABLE(vote_count integer, target integer, launched boolean, already_voted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_city text := trim(p_city);
  v_inserted boolean := false;
  v_session text := NULLIF(trim(coalesce(p_session_id, '')), '');
BEGIN
  IF v_city IS NULL OR length(v_city) = 0 OR length(v_city) > 60 THEN
    RAISE EXCEPTION 'Invalid city';
  END IF;

  INSERT INTO public.city_campaigns(city)
    VALUES (v_city)
    ON CONFLICT (city) DO NOTHING;

  IF v_uid IS NOT NULL THEN
    INSERT INTO public.city_campaign_votes(city, user_id)
      VALUES (v_city, v_uid)
      ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  ELSIF v_session IS NOT NULL THEN
    INSERT INTO public.city_campaign_votes(city, session_id)
      VALUES (v_city, v_session)
      ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  ELSE
    -- No identity at all: still count, but don't dedup.
    INSERT INTO public.city_campaign_votes(city) VALUES (v_city);
    v_inserted := true;
  END IF;

  IF v_inserted THEN
    UPDATE public.city_campaigns
       SET vote_count = vote_count + 1,
           updated_at = now()
     WHERE city = v_city;
  END IF;

  RETURN QUERY
    SELECT cc.vote_count, cc.target, cc.launched, NOT v_inserted
      FROM public.city_campaigns cc WHERE cc.city = v_city;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_for_city(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_city_status(p_city text)
RETURNS TABLE(active_merchants integer, vote_count integer, target integer, launched boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city text := trim(p_city);
BEGIN
  IF v_city IS NULL OR length(v_city) = 0 THEN
    RAISE EXCEPTION 'Invalid city';
  END IF;

  INSERT INTO public.city_campaigns(city)
    VALUES (v_city)
    ON CONFLICT (city) DO NOTHING;

  RETURN QUERY
    SELECT
      (SELECT COUNT(*)::int FROM public.merchant_deals md
        WHERE md.city = v_city AND md.is_active = true AND md.expires_at > now()),
      cc.vote_count, cc.target, cc.launched
    FROM public.city_campaigns cc
   WHERE cc.city = v_city;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_city_status(text) TO anon, authenticated;

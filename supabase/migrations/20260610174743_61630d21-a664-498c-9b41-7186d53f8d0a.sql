
ALTER TABLE public.merchant_deals
  ADD COLUMN IF NOT EXISTS verified_at_venue_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commuting_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS pub_id uuid REFERENCES public.merchant_deals(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text;

-- Loosen the activity check so the new at_venue / commuting statuses can be written via activity too,
-- and add a separate constraint for the status column.
ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_activity_check;
ALTER TABLE public.check_ins
  ADD CONSTRAINT check_ins_activity_check
  CHECK (activity = ANY (ARRAY['browsing_deals','posting','commenting','checked_in','at_venue','commuting']));
ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_status_check;
ALTER TABLE public.check_ins
  ADD CONSTRAINT check_ins_status_check
  CHECK (status IS NULL OR status = ANY (ARRAY['at_venue','commuting']));

ALTER TABLE public.check_ins
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 hours');

CREATE INDEX IF NOT EXISTS check_ins_pub_status_idx
  ON public.check_ins (pub_id, status, expires_at DESC);

-- Geofenced check-in RPC. Returns the resolved status + distance for UI feedback.
CREATE OR REPLACE FUNCTION public.check_in_at_deal(
  p_deal_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS TABLE(status text, distance_km double precision,
              verified_at_venue_count integer, commuting_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
  v_dist_km double precision;
  v_status text;
  v_pub_name text;
  v_city text;
  v_uid uuid := auth.uid();
  v_session text := COALESCE(v_uid::text, gen_random_uuid()::text);
  R constant double precision := 6371.0; -- km
  a double precision;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  SELECT md.pub_name, md.city INTO v_pub_name, v_city
    FROM public.merchant_deals md
   WHERE md.id = p_deal_id AND md.is_active = true AND md.expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal not found or inactive'; END IF;

  -- Pub coordinates live on the merchant's profile
  SELECT p.latitude, p.longitude INTO v_lat, v_lng
    FROM public.profiles p
   WHERE p.pub_name IS NOT NULL
     AND lower(p.pub_name) = lower(v_pub_name)
     AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
   LIMIT 1;

  IF v_lat IS NULL OR v_lng IS NULL OR p_lat IS NULL OR p_lng IS NULL THEN
    -- No pinned coordinates → treat as commuting (we can't verify proximity)
    v_dist_km := NULL;
    v_status := 'commuting';
  ELSE
    -- Haversine
    a := sin(radians((p_lat - v_lat)/2))^2
       + cos(radians(v_lat)) * cos(radians(p_lat))
       * sin(radians((p_lng - v_lng)/2))^2;
    v_dist_km := 2 * R * asin(sqrt(a));
    v_status := CASE WHEN v_dist_km <= 0.2 THEN 'at_venue' ELSE 'commuting' END;
  END IF;

  -- Record the session
  INSERT INTO public.check_ins
    (user_id, session_id, activity, city, latitude, longitude, pub_id, status, expires_at)
  VALUES
    (v_uid, v_session, v_status, v_city, COALESCE(p_lat, 0), COALESCE(p_lng, 0),
     p_deal_id, v_status, now() + interval '5 hours');

  -- Update the deal counters. Keep heading_there_count as a combined legacy total.
  IF v_status = 'at_venue' THEN
    UPDATE public.merchant_deals
       SET verified_at_venue_count = verified_at_venue_count + 1,
           heading_there_count = heading_there_count + 1
     WHERE id = p_deal_id;
  ELSE
    UPDATE public.merchant_deals
       SET commuting_count = commuting_count + 1,
           heading_there_count = heading_there_count + 1
     WHERE id = p_deal_id;
  END IF;

  RETURN QUERY
    SELECT v_status, v_dist_km, md.verified_at_venue_count, md.commuting_count
      FROM public.merchant_deals md WHERE md.id = p_deal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_at_deal(uuid, double precision, double precision) TO authenticated;

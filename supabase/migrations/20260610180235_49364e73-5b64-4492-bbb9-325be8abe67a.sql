
ALTER TABLE public.merchant_deals
  ADD COLUMN IF NOT EXISTS crowd_density double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS noise_level   double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vibe_type     double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vibe_sample_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.submit_venue_vibe(
  p_deal_id uuid,
  p_crowd double precision,
  p_noise double precision,
  p_vibe  double precision
) RETURNS TABLE(crowd_density double precision, noise_level double precision, vibe_type double precision, vibe_sample_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ok  boolean;
  v_cap constant integer := 50;
  v_n integer;
  v_w integer;
  v_c double precision;
  v_no double precision;
  v_v double precision;
  v_nc double precision;
  v_nn double precision;
  v_nv double precision;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  -- Clamp inputs to [0, 1].
  p_crowd := GREATEST(0, LEAST(1, COALESCE(p_crowd, 0)));
  p_noise := GREATEST(0, LEAST(1, COALESCE(p_noise, 0)));
  p_vibe  := GREATEST(0, LEAST(1, COALESCE(p_vibe,  0)));

  -- Caller must have an active verified at_venue check-in for this deal.
  SELECT EXISTS (
    SELECT 1 FROM public.check_ins
     WHERE pub_id = p_deal_id
       AND user_id = v_uid
       AND status = 'at_venue'
       AND expires_at > now()
  ) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'Vibe pings require a verified at-venue check-in';
  END IF;

  SELECT md.vibe_sample_count, md.crowd_density, md.noise_level, md.vibe_type
    INTO v_n, v_c, v_no, v_v
    FROM public.merchant_deals md
   WHERE md.id = p_deal_id
   FOR UPDATE;

  v_w := LEAST(COALESCE(v_n, 0), v_cap);
  v_nc := (COALESCE(v_c, 0)  * v_w + p_crowd) / (v_w + 1);
  v_nn := (COALESCE(v_no, 0) * v_w + p_noise) / (v_w + 1);
  v_nv := (COALESCE(v_v, 0)  * v_w + p_vibe)  / (v_w + 1);

  UPDATE public.merchant_deals
     SET crowd_density = v_nc,
         noise_level   = v_nn,
         vibe_type     = v_nv,
         vibe_sample_count = LEAST(COALESCE(v_n, 0) + 1, v_cap * 4)
   WHERE id = p_deal_id;

  RETURN QUERY
    SELECT md.crowd_density, md.noise_level, md.vibe_type, md.vibe_sample_count
      FROM public.merchant_deals md WHERE md.id = p_deal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_venue_vibe(uuid, double precision, double precision, double precision) TO authenticated;

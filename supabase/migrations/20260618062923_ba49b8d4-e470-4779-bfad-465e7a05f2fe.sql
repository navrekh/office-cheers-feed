
CREATE TABLE public.profile_metric_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL CHECK (metric IN ('slippery','ninja','cooked')),
  voter_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, metric, voter_key)
);

CREATE INDEX profile_metric_votes_owner_idx ON public.profile_metric_votes(owner_id, metric);

GRANT SELECT ON public.profile_metric_votes TO anon, authenticated;
GRANT ALL ON public.profile_metric_votes TO service_role;

ALTER TABLE public.profile_metric_votes ENABLE ROW LEVEL SECURITY;

-- Aggregates only flow through the RPCs below; no direct write policies needed.
CREATE POLICY "Anyone can read metric votes"
  ON public.profile_metric_votes FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.get_profile_metrics(p_handle text)
RETURNS TABLE(slippery integer, ninja integer, cooked integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE v.metric = 'slippery')::int,
    COUNT(*) FILTER (WHERE v.metric = 'ninja')::int,
    COUNT(*) FILTER (WHERE v.metric = 'cooked')::int
  FROM public.profiles p
  LEFT JOIN public.profile_metric_votes v ON v.owner_id = p.id
  WHERE p.handle IS NOT NULL
    AND lower(p.handle) = lower(btrim(p_handle));
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_metrics(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cast_metric_vote(p_handle text, p_metric text, p_session text)
RETURNS TABLE(slippery integer, ninja integer, cooked integer, already_voted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_key text;
  v_inserted boolean := false;
BEGIN
  IF p_metric NOT IN ('slippery','ninja','cooked') THEN
    RAISE EXCEPTION 'Invalid metric';
  END IF;

  SELECT id INTO v_owner FROM public.profiles
   WHERE handle IS NOT NULL AND lower(handle) = lower(btrim(p_handle))
   LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  v_key := COALESCE(v_uid::text, NULLIF(btrim(p_session), ''));
  IF v_key IS NULL OR length(v_key) < 6 THEN
    RAISE EXCEPTION 'Missing voter key';
  END IF;

  INSERT INTO public.profile_metric_votes (owner_id, metric, voter_key)
       VALUES (v_owner, p_metric, v_key)
  ON CONFLICT (owner_id, metric, voter_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY
    SELECT
      COUNT(*) FILTER (WHERE metric = 'slippery')::int,
      COUNT(*) FILTER (WHERE metric = 'ninja')::int,
      COUNT(*) FILTER (WHERE metric = 'cooked')::int,
      NOT (v_inserted > 0)
    FROM public.profile_metric_votes
    WHERE owner_id = v_owner;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_metric_vote(text, text, text) TO anon, authenticated;

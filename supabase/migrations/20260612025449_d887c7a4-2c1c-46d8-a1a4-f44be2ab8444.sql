
-- ============ shoutbox_messages ============
CREATE TABLE public.shoutbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL,
  emoji text NOT NULL DEFAULT '💬',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shoutbox_body_len CHECK (char_length(body) BETWEEN 1 AND 280),
  CONSTRAINT shoutbox_hub_len  CHECK (char_length(hub)  BETWEEN 1 AND 60)
);
CREATE INDEX shoutbox_hub_created_idx ON public.shoutbox_messages (hub, created_at DESC);

GRANT SELECT ON public.shoutbox_messages TO anon;
GRANT SELECT, INSERT ON public.shoutbox_messages TO authenticated;
GRANT ALL ON public.shoutbox_messages TO service_role;

ALTER TABLE public.shoutbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shoutbox readable by anyone"
  ON public.shoutbox_messages FOR SELECT
  USING (true);

CREATE POLICY "authenticated users post as themselves"
  ON public.shoutbox_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ anonymous_confessions ============
CREATE TABLE public.anonymous_confessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT confession_body_len CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT confession_hub_len  CHECK (char_length(hub)  BETWEEN 1 AND 60)
);
CREATE INDEX confessions_hub_created_idx ON public.anonymous_confessions (hub, created_at DESC);

GRANT SELECT ON public.anonymous_confessions TO anon;
GRANT SELECT, INSERT ON public.anonymous_confessions TO authenticated;
GRANT ALL ON public.anonymous_confessions TO service_role;

ALTER TABLE public.anonymous_confessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "confessions readable by anyone"
  ON public.anonymous_confessions FOR SELECT
  USING (true);

CREATE POLICY "authenticated users confess as themselves"
  ON public.anonymous_confessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ poll_votes ============
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choice text NOT NULL,
  vote_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poll_choice_valid CHECK (choice IN ('danger','thread','chill')),
  CONSTRAINT poll_hub_len CHECK (char_length(hub) BETWEEN 1 AND 60),
  CONSTRAINT poll_vote_unique UNIQUE (user_id, hub, vote_day)
);
CREATE INDEX poll_votes_hub_day_idx ON public.poll_votes (hub, vote_day);

GRANT SELECT ON public.poll_votes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll votes readable by anyone"
  ON public.poll_votes FOR SELECT
  USING (true);

CREATE POLICY "authenticated users cast their own vote"
  ON public.poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated users update their own vote"
  ON public.poll_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ RPC: cast_poll_vote ============
CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_hub text, p_choice text)
RETURNS TABLE(danger int, thread int, chill int, total int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hub text := trim(p_hub);
  v_day date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF v_hub IS NULL OR length(v_hub) = 0 THEN RAISE EXCEPTION 'Invalid hub'; END IF;
  IF p_choice NOT IN ('danger','thread','chill') THEN RAISE EXCEPTION 'Invalid choice'; END IF;

  INSERT INTO public.poll_votes (hub, user_id, choice, vote_day)
       VALUES (v_hub, v_uid, p_choice, v_day)
  ON CONFLICT (user_id, hub, vote_day)
    DO UPDATE SET choice = EXCLUDED.choice, created_at = now();

  RETURN QUERY
    SELECT
      COUNT(*) FILTER (WHERE pv.choice = 'danger')::int,
      COUNT(*) FILTER (WHERE pv.choice = 'thread')::int,
      COUNT(*) FILTER (WHERE pv.choice = 'chill')::int,
      COUNT(*)::int
    FROM public.poll_votes pv
    WHERE pv.hub = v_hub AND pv.vote_day = v_day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_poll_vote(text, text) TO authenticated;

-- ============ RPC: get_poll_counts (public read) ============
CREATE OR REPLACE FUNCTION public.get_poll_counts(p_hub text)
RETURNS TABLE(danger int, thread int, chill int, total int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE choice = 'danger')::int,
    COUNT(*) FILTER (WHERE choice = 'thread')::int,
    COUNT(*) FILTER (WHERE choice = 'chill')::int,
    COUNT(*)::int
  FROM public.poll_votes
  WHERE hub = trim(p_hub)
    AND vote_day = (now() AT TIME ZONE 'UTC')::date;
$$;

GRANT EXECUTE ON FUNCTION public.get_poll_counts(text) TO anon, authenticated;

-- ============ Realtime publication ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutbox_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.anonymous_confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;

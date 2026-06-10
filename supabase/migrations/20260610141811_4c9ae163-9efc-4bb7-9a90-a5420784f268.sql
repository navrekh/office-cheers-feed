
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_in_tribunal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS misconduct_votes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_votes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS upi_vpa TEXT;

CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('reported','valid','misconduct')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reports"
  ON public.post_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users own their own report"
  ON public.post_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own report"
  ON public.post_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Report a post → upserts a 'reported' marker for this user and flags tribunal.
CREATE OR REPLACE FUNCTION public.report_post(p_post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  INSERT INTO public.post_reports (post_id, user_id, vote)
  VALUES (p_post_id, auth.uid(), 'reported')
  ON CONFLICT (post_id, user_id) DO NOTHING;
  UPDATE public.posts SET is_in_tribunal = true WHERE id = p_post_id;
END;
$$;

-- Tribunal vote → one vote per user per post; auto-hide on 3 misconduct.
CREATE OR REPLACE FUNCTION public.tribunal_vote(p_post_id UUID, p_vote TEXT)
RETURNS TABLE (valid_votes INT, misconduct_votes INT, is_hidden BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prev TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF p_vote NOT IN ('valid','misconduct') THEN RAISE EXCEPTION 'Invalid vote'; END IF;

  SELECT vote INTO prev FROM public.post_reports
    WHERE post_id = p_post_id AND user_id = auth.uid();

  IF prev IS NULL THEN
    INSERT INTO public.post_reports (post_id, user_id, vote)
      VALUES (p_post_id, auth.uid(), p_vote);
  ELSIF prev IN ('valid','misconduct') THEN
    -- one vote per user; ignore re-votes
    RETURN QUERY SELECT p.valid_votes, p.misconduct_votes, p.is_hidden
      FROM public.posts p WHERE p.id = p_post_id;
    RETURN;
  ELSE
    UPDATE public.post_reports SET vote = p_vote
      WHERE post_id = p_post_id AND user_id = auth.uid();
  END IF;

  UPDATE public.posts SET
    valid_votes      = (SELECT COUNT(*) FROM public.post_reports r WHERE r.post_id = p_post_id AND r.vote = 'valid'),
    misconduct_votes = (SELECT COUNT(*) FROM public.post_reports r WHERE r.post_id = p_post_id AND r.vote = 'misconduct')
  WHERE id = p_post_id;

  UPDATE public.posts SET is_hidden = true
    WHERE id = p_post_id AND misconduct_votes >= 3;

  RETURN QUERY SELECT p.valid_votes, p.misconduct_votes, p.is_hidden
    FROM public.posts p WHERE p.id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.report_post(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tribunal_vote(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_post(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tribunal_vote(UUID, TEXT) TO authenticated;

-- Realtime
ALTER TABLE public.posts REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.posts';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

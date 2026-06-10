
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_headline TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL,
  cheers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.posts TO anon, authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Anyone can create posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can cheers posts" ON public.posts FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.increment_cheers(post_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET cheers_count = cheers_count + 1 WHERE id = post_id
  RETURNING cheers_count;
$$;

GRANT EXECUTE ON FUNCTION public.increment_cheers(UUID) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

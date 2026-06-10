
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anonymous Intern',
  body_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.comments TO anon, authenticated;
GRANT ALL ON public.comments TO service_role;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- NOTE: Intentionally permissive — public sandbox, no auth by design.
-- If auth is added later, scope INSERT WITH CHECK (auth.uid() IS NOT NULL) and
-- add an author_id uuid column referencing auth.users.
CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Anyone can create comments" ON public.comments FOR INSERT WITH CHECK (true);

CREATE INDEX comments_post_id_created_at_idx ON public.comments (post_id, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

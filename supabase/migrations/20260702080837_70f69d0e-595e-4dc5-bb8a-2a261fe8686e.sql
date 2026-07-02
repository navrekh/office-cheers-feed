
-- 1. Threaded replies (one level)
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- 2. Multi-reactions (anon writable, one per session per emoji per post)
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('laugh','skull','melt','fire')),
  session_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, emoji, session_key)
);
GRANT SELECT, INSERT ON public.post_reactions TO anon, authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reactions"
  ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Anyone can add a reaction"
  ON public.post_reactions FOR INSERT
  WITH CHECK (length(session_key) BETWEEN 8 AND 64);
CREATE INDEX IF NOT EXISTS post_reactions_post_id_idx ON public.post_reactions(post_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;

-- 3. Archetype on profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='app_archetype') THEN
    CREATE TYPE public.app_archetype AS ENUM (
      'burnt_intern','middle_manager','founders_pet',
      'layoff_survivor','faang_ghost','startup_zombie'
    );
  END IF;
END $$;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS archetype public.app_archetype;

-- 4. Guest confessions (allow anon insert with strict shape)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_post_type_check
  CHECK (post_type IN ('user','merchant','guest'));

CREATE POLICY "Guests can drop one anonymous confession"
  ON public.posts FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND post_type = 'guest'
    AND length(body_text) BETWEEN 10 AND 500
    AND attached_visual_url IS NULL
  );

-- 5. Top posts for public profile receipts
CREATE OR REPLACE FUNCTION public.get_profile_top_posts(p_handle text, p_limit int DEFAULT 3)
RETURNS TABLE (
  id uuid,
  body_text text,
  cheers_count int,
  comment_count int,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.body_text, p.cheers_count, p.comment_count, p.created_at
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE pr.handle IS NOT NULL
    AND lower(pr.handle) = lower(btrim(p_handle))
    AND p.is_hidden = false
    AND p.post_type = 'user'
  ORDER BY p.cheers_count DESC, p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 3), 10));
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_top_posts(text, int) TO anon, authenticated;

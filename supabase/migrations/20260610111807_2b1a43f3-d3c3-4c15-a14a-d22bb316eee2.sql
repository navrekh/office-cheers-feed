
-- 1. Add user_id column linking posts to auth.users (nullable to preserve legacy rows)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);

-- 2. Replace the public INSERT policy with an authenticated-only one that
--    forces the author UID to match the session.
DROP POLICY IF EXISTS "Anyone can create posts" ON public.posts;

CREATE POLICY "Authenticated users can create their own posts"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure authenticated role has INSERT privilege (SELECT/UPDATE already granted via existing public grants)
GRANT INSERT ON public.posts TO authenticated;

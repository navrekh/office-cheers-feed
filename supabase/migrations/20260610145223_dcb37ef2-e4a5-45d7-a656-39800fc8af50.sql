
-- Add user_id + author_alias to comments; gate writes to authenticated users
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS author_alias text;

CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);

-- Replace open insert policy with an auth-gated one
DROP POLICY IF EXISTS "Anyone can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authors can delete their own comments
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;
CREATE POLICY "Authors can delete own comments"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;

-- Public read for live "Heading There Tonight" telemetry
DROP POLICY IF EXISTS "Anyone can read merchant clicks" ON public.merchant_clicks;
CREATE POLICY "Anyone can read merchant clicks"
  ON public.merchant_clicks
  FOR SELECT
  USING (true);

GRANT SELECT ON public.merchant_clicks TO anon, authenticated;

-- Ensure realtime fires full payloads
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.merchant_clicks REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_clicks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

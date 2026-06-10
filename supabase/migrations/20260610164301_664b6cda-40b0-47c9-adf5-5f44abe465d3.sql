-- 1) Add nullable jittered coordinate columns to existing tables.
--    These ALWAYS store pre-jittered (~50-100m offset) coordinates; precise
--    coords never leave the browser.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- 2) Live presence / check-in table powering the "Live Workspace Radar".
--    Anonymous beacons are allowed (no auth required) since data is jittered
--    and ephemeral. Rows older than expires_at are filtered out on read.
CREATE TABLE IF NOT EXISTS public.check_ins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  text NOT NULL,
  activity    text NOT NULL CHECK (activity IN ('browsing_deals','posting','commenting','checked_in')),
  city        text,
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '3 hours')
);

CREATE INDEX IF NOT EXISTS check_ins_expires_at_idx ON public.check_ins (expires_at DESC);
CREATE INDEX IF NOT EXISTS check_ins_created_at_idx ON public.check_ins (created_at DESC);

GRANT SELECT, INSERT ON public.check_ins TO anon, authenticated;
GRANT ALL ON public.check_ins TO service_role;

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Public can read (data is already jittered + anonymous).
CREATE POLICY "Anyone can read live check-ins"
  ON public.check_ins
  FOR SELECT
  USING (true);

-- Anyone (incl. anonymous browsers) can drop a beacon.
CREATE POLICY "Anyone can insert a check-in beacon"
  ON public.check_ins
  FOR INSERT
  WITH CHECK (true);

-- 3) Realtime: stream check_ins inserts to all subscribers.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'check_ins'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins';
  END IF;
END $$;
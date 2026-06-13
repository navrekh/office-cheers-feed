
CREATE TABLE public.rallies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub text NOT NULL,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_handle text NOT NULL,
  creator_emoji text NOT NULL DEFAULT '🍻',
  venue text NOT NULL,
  note text,
  eta_minutes int NOT NULL DEFAULT 30,
  source_message_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 minutes'),
  CONSTRAINT rally_venue_len CHECK (char_length(venue) BETWEEN 1 AND 80),
  CONSTRAINT rally_note_len CHECK (note IS NULL OR char_length(note) <= 200),
  CONSTRAINT rally_eta_range CHECK (eta_minutes BETWEEN 5 AND 240),
  CONSTRAINT rally_hub_len CHECK (char_length(hub) BETWEEN 1 AND 60)
);
CREATE INDEX rallies_hub_active_idx ON public.rallies (hub, expires_at DESC);

GRANT SELECT ON public.rallies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rallies TO authenticated;
GRANT ALL ON public.rallies TO service_role;

ALTER TABLE public.rallies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rallies readable by anyone" ON public.rallies FOR SELECT USING (true);
CREATE POLICY "authenticated users create their own rallies" ON public.rallies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "creators can update their rallies" ON public.rallies
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "creators can delete their rallies" ON public.rallies
  FOR DELETE TO authenticated USING (auth.uid() = creator_id);

CREATE TABLE public.rally_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_id uuid NOT NULL REFERENCES public.rallies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL,
  emoji text NOT NULL DEFAULT '🙌',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rally_id, user_id)
);
CREATE INDEX rally_rsvps_rally_idx ON public.rally_rsvps (rally_id);

GRANT SELECT ON public.rally_rsvps TO anon;
GRANT SELECT, INSERT, DELETE ON public.rally_rsvps TO authenticated;
GRANT ALL ON public.rally_rsvps TO service_role;

ALTER TABLE public.rally_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsvps readable by anyone" ON public.rally_rsvps FOR SELECT USING (true);
CREATE POLICY "users rsvp as themselves" ON public.rally_rsvps
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users cancel own rsvp" ON public.rally_rsvps
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rallies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rally_rsvps;

-- ============================================================
-- push_subscriptions: web push endpoints per user/device
-- ============================================================
CREATE TABLE public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_uniq UNIQUE (endpoint)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "owner inserts own subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner updates own subscriptions"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner deletes own subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

-- ============================================================
-- profile_visits: who decoded which dossier
-- ============================================================
CREATE TABLE public.profile_visits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_session text,
  visitor_handle text,
  via          text NOT NULL DEFAULT 'web',   -- 'web' | 'qr' | 'link'
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.profile_visits TO authenticated;
GRANT ALL ON public.profile_visits TO service_role;

ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own visits"
  ON public.profile_visits FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "any signed-in user can record a visit"
  ON public.profile_visits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = visitor_id OR visitor_id IS NULL);

CREATE INDEX profile_visits_owner_created_idx ON public.profile_visits(owner_id, created_at DESC);

-- ============================================================
-- record_profile_visit(handle, via) -> { is_new, owner_id, visitor_handle }
-- Dedupes the same visitor/session against the same owner within 1 hour.
-- Returns is_new=false on duplicates so callers skip the push notification.
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_profile_visit(p_handle text, p_via text DEFAULT 'web')
RETURNS TABLE(is_new boolean, owner_id uuid, owner_display text, visitor_handle text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner_id uuid;
  v_owner_display text;
  v_visitor_handle text;
  v_recent_exists boolean;
BEGIN
  SELECT p.id, COALESCE(p.display_name, p.handle)
    INTO v_owner_id, v_owner_display
    FROM public.profiles p
   WHERE p.handle IS NOT NULL
     AND lower(p.handle) = lower(btrim(p_handle))
   LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Don't record self-visits
  IF v_uid IS NOT NULL AND v_uid = v_owner_id THEN
    RETURN QUERY SELECT false, v_owner_id, v_owner_display, NULL::text;
    RETURN;
  END IF;

  -- Visitor handle for display (if signed in)
  IF v_uid IS NOT NULL THEN
    SELECT handle INTO v_visitor_handle FROM public.profiles WHERE id = v_uid;
  END IF;

  -- Dedupe within 1 hour for same visitor (signed in)
  IF v_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profile_visits
       WHERE owner_id = v_owner_id
         AND visitor_id = v_uid
         AND created_at > now() - interval '1 hour'
    ) INTO v_recent_exists;

    IF v_recent_exists THEN
      RETURN QUERY SELECT false, v_owner_id, v_owner_display, v_visitor_handle;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.profile_visits (owner_id, visitor_id, visitor_handle, via)
       VALUES (v_owner_id, v_uid, v_visitor_handle, COALESCE(p_via, 'web'));

  RETURN QUERY SELECT true, v_owner_id, v_owner_display, v_visitor_handle;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_profile_visit(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_visit(text, text) TO service_role;

-- ============================================================
-- get_recent_visits(): the real Interception Log for the signed-in user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_recent_visits(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, visitor_handle text, via text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.visitor_handle, v.via, v.created_at
    FROM public.profile_visits v
   WHERE v.owner_id = auth.uid()
   ORDER BY v.created_at DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_visits(integer) TO authenticated;
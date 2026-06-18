
CREATE TABLE public.profile_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 280),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','hidden')),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profile_testimonials_owner_idx ON public.profile_testimonials(owner_id, status, pinned DESC, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_testimonials TO authenticated;
GRANT ALL ON public.profile_testimonials TO service_role;

ALTER TABLE public.profile_testimonials ENABLE ROW LEVEL SECURITY;

-- Owner sees everything they own
CREATE POLICY "Owner can view own testimonials"
  ON public.profile_testimonials FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

-- Author can see their own submissions (pending or approved)
CREATE POLICY "Author can view own submissions"
  ON public.profile_testimonials FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

-- Owner can update (approve/pin/hide) and delete
CREATE POLICY "Owner can update own testimonials"
  ON public.profile_testimonials FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can delete own testimonials"
  ON public.profile_testimonials FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER profile_testimonials_touch
  BEFORE UPDATE ON public.profile_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Submit via security-definer RPC so submitters don't need to look up owner_id directly
CREATE OR REPLACE FUNCTION public.submit_testimonial(p_handle text, p_body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF length(v_body) = 0 OR length(v_body) > 280 THEN RAISE EXCEPTION 'Body must be 1-280 chars'; END IF;

  SELECT id INTO v_owner FROM public.profiles
   WHERE handle IS NOT NULL AND lower(handle) = lower(btrim(p_handle))
   LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  -- Rate limit: max 5 pending per author for the same owner
  IF (SELECT COUNT(*) FROM public.profile_testimonials
       WHERE owner_id = v_owner AND author_id = v_uid AND status = 'pending') >= 5 THEN
    RAISE EXCEPTION 'Too many pending testimonials for this profile';
  END IF;

  INSERT INTO public.profile_testimonials (owner_id, author_id, body, status)
  VALUES (v_owner, v_uid, v_body, 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_testimonial(text, text) TO authenticated;

-- Public list (approved only) via security-definer RPC: safe column projection
CREATE OR REPLACE FUNCTION public.get_profile_testimonials(p_handle text)
RETURNS TABLE(id uuid, body text, pinned boolean, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.body, t.pinned, t.created_at
  FROM public.profile_testimonials t
  JOIN public.profiles p ON p.id = t.owner_id
  WHERE p.handle IS NOT NULL
    AND lower(p.handle) = lower(btrim(p_handle))
    AND t.status = 'approved'
  ORDER BY t.pinned DESC, t.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_testimonials(text) TO anon, authenticated;

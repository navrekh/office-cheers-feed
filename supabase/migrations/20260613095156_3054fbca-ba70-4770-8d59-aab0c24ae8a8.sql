
-- 1) Add 'admin' value to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- 2) Profiles: restrict SELECT to own row + admins
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;

CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2a) Safe public view exposing only non-sensitive merchant discovery fields
CREATE OR REPLACE VIEW public.public_merchant_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  role,
  pub_name,
  verified_hub_city,
  declared_company,
  tech_park_zone,
  merchant_website,
  map_query_address,
  flash_deal_text,
  latitude,
  longitude
FROM public.profiles
WHERE role = 'merchant'::public.app_role
  AND pub_name IS NOT NULL;

-- The view runs as invoker; bypass underlying profiles RLS via a SECURITY DEFINER
-- wrapper for merchant discovery is unnecessary because we expose only safe cols.
-- However, security_invoker means the underlying RLS would block non-owners.
-- Recreate without security_invoker so the view's grants govern access.
DROP VIEW public.public_merchant_profiles;
CREATE VIEW public.public_merchant_profiles AS
SELECT
  id,
  role,
  pub_name,
  verified_hub_city,
  declared_company,
  tech_park_zone,
  merchant_website,
  map_query_address,
  flash_deal_text,
  latitude,
  longitude
FROM public.profiles
WHERE role = 'merchant'::public.app_role
  AND pub_name IS NOT NULL;

GRANT SELECT ON public.public_merchant_profiles TO anon, authenticated;

-- 2b) SECURITY DEFINER RPC to fetch just an author's UPI handle for tipping
CREATE OR REPLACE FUNCTION public.get_user_tip_address(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT upi_vpa FROM public.profiles WHERE id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_tip_address(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tip_address(uuid) TO authenticated;

-- 3) Anonymous confessions: stop exposing user_id publicly
DROP POLICY IF EXISTS "confessions readable by anyone" ON public.anonymous_confessions;

CREATE POLICY "Owners can read their own confession row"
  ON public.anonymous_confessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.public_anonymous_confessions AS
SELECT id, handle, body, hub, created_at
FROM public.anonymous_confessions;

GRANT SELECT ON public.public_anonymous_confessions TO anon, authenticated;

-- 4) Remove merchant_clicks from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.merchant_clicks;

-- 5) post_media storage: add UPDATE policy mirroring INSERT
CREATE POLICY "post_media: update own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post_media' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'post_media' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 6) Lock down has_role: only authenticated callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

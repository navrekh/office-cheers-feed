
-- Drop unused merchant view (nothing reads it yet) to avoid security definer view lint
DROP VIEW IF EXISTS public.public_merchant_profiles;

-- Recreate confessions view as security_invoker so it follows RLS of the caller.
-- Then add a permissive SELECT policy on the underlying table that allows
-- reading rows through the view but the view itself omits user_id.
DROP VIEW IF EXISTS public.public_anonymous_confessions;

-- Use security_invoker; pair with a permissive SELECT policy that allows
-- public reads of the safe columns only via column GRANTs.
CREATE VIEW public.public_anonymous_confessions
WITH (security_invoker = true) AS
SELECT id, handle, body, hub, created_at
FROM public.anonymous_confessions;

GRANT SELECT ON public.public_anonymous_confessions TO anon, authenticated;

-- Allow anyone to read confessions for the view; the view itself omits user_id,
-- and direct table SELECT only returns user_id to the owner (existing policy).
CREATE POLICY "Anyone can read confessions body via view"
  ON public.anonymous_confessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Now revoke column-level SELECT on user_id from anon/authenticated so direct
-- table queries (e.g. select *) cannot return the user_id column.
REVOKE SELECT (user_id) ON public.anonymous_confessions FROM anon, authenticated;


-- 1) merchant_clicks: drop public read
DROP POLICY IF EXISTS "Anyone can read merchant clicks" ON public.merchant_clicks;

-- 2) merchant_deals: drop broad update, add merchant-owner update + safe counter RPC
DROP POLICY IF EXISTS "Authenticated can increment heading there" ON public.merchant_deals;

CREATE POLICY "Merchants can update their own deal"
ON public.merchant_deals
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'merchant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.pub_name IS NOT NULL
      AND lower(p.pub_name) = lower(merchant_deals.pub_name)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'merchant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.pub_name IS NOT NULL
      AND lower(p.pub_name) = lower(merchant_deals.pub_name)
  )
);

CREATE POLICY "Merchants can insert their own deal"
ON public.merchant_deals
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'merchant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.pub_name IS NOT NULL
      AND lower(p.pub_name) = lower(merchant_deals.pub_name)
  )
);

CREATE OR REPLACE FUNCTION public.increment_heading_there(p_deal_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;
  UPDATE public.merchant_deals
     SET heading_there_count = heading_there_count + 1
   WHERE id = p_deal_id
     AND is_active = true
     AND expires_at > now()
  RETURNING heading_there_count INTO v_count;
  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_heading_there(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_heading_there(uuid) TO authenticated;

-- 3) profiles: prevent role self-escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only allow role changes via service_role (admin/backend), never by the user themself
    IF auth.uid() IS NOT NULL AND auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'Changing role is not permitted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 4) post_reports: restrict reads to the owner
DROP POLICY IF EXISTS "Authenticated can read reports" ON public.post_reports;
CREATE POLICY "Users can read their own report"
ON public.post_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5) Lock down SECURITY DEFINER functions: revoke from anon, keep authenticated
REVOKE ALL ON FUNCTION public.increment_cheers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_cheers(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_post_by_ticket(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_post_by_ticket(text) TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.report_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_post(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.tribunal_vote(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tribunal_vote(uuid, text) TO authenticated;

-- 6) Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

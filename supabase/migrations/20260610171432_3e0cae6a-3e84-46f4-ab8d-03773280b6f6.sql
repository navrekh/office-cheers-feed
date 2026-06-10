
ALTER TABLE public.advertiser_leads
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
      RETURN NEW;
    END IF;
    IF NEW.id = auth.uid()
       AND NEW.role = 'admin'::app_role
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin'::app_role)
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Changing role is not permitted';
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Admins can read advertiser leads" ON public.advertiser_leads;
CREATE POLICY "Admins can read advertiser leads"
ON public.advertiser_leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update advertiser leads" ON public.advertiser_leads;
CREATE POLICY "Admins can update advertiser leads"
ON public.advertiser_leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage merchant deals" ON public.merchant_deals;
CREATE POLICY "Admins can manage merchant deals"
ON public.merchant_deals FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin'::app_role) THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET role = 'admin'::app_role WHERE id = auth.uid();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_role(p_user_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_lead(
  p_lead_id uuid,
  p_deal_text text DEFAULT NULL,
  p_urgency integer DEFAULT 2
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_deal_id uuid;
  v_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT * INTO v_lead FROM public.advertiser_leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  INSERT INTO public.merchant_deals
    (pub_name, city, deal_text, urgency_level, is_active, activated_at, expires_at)
  VALUES (
    v_lead.pub_name,
    v_lead.city,
    COALESCE(NULLIF(trim(p_deal_text), ''),
             '⚡ Premium pub onboarded — flash deal coming soon at ' || v_lead.pub_name || '.'),
    COALESCE(p_urgency, 2),
    true,
    now(),
    now() + interval '7 days'
  )
  RETURNING id INTO v_deal_id;

  SELECT u.id INTO v_user_id
    FROM auth.users u
   WHERE lower(u.email) = lower(v_lead.contact_info)
   LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET role = 'merchant'::app_role,
           pub_name = COALESCE(profiles.pub_name, v_lead.pub_name)
     WHERE id = v_user_id;
  END IF;

  UPDATE public.advertiser_leads
     SET approved_at = now(),
         approved_by = auth.uid()
   WHERE id = p_lead_id;

  RETURN v_deal_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_approve_lead(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_lead(uuid, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_deal_active(p_deal_id uuid, p_active boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.merchant_deals
     SET is_active = p_active,
         expires_at = CASE WHEN p_active THEN now() + interval '7 days' ELSE expires_at END,
         activated_at = CASE WHEN p_active THEN now() ELSE activated_at END
   WHERE id = p_deal_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_deal_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_deal_active(uuid, boolean) TO authenticated;

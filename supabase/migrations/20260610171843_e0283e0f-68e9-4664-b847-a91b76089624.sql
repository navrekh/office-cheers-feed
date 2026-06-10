
-- Allow trigger bypass via a transient session setting controlled only by SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('app.bypass_role_guard', true) = 'on' THEN
      RETURN NEW;
    END IF;
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

-- Self-claim the merchant role (only allowed from employee → merchant)
CREATE OR REPLACE FUNCTION public.claim_merchant_role(p_pub_name text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  PERFORM set_config('app.bypass_role_guard', 'on', true);
  UPDATE public.profiles
     SET role = 'merchant'::app_role,
         pub_name = COALESCE(NULLIF(trim(p_pub_name), ''), pub_name)
   WHERE id = auth.uid()
     AND role IN ('employee'::app_role, 'merchant'::app_role);
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_merchant_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_merchant_role(text) TO authenticated;

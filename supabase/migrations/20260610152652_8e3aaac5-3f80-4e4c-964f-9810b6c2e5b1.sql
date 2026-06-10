
ALTER TABLE public.merchant_deals
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days');

UPDATE public.merchant_deals
   SET expires_at = now() + interval '7 days'
 WHERE expires_at <= now();

CREATE OR REPLACE FUNCTION public.merchant_deals_set_lifespan()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.activated_at := now();
    NEW.expires_at   := now() + interval '7 days';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deal_text       IS DISTINCT FROM OLD.deal_text
       OR NEW.urgency_level IS DISTINCT FROM OLD.urgency_level
       OR (NEW.is_active = true AND OLD.is_active = false) THEN
      NEW.activated_at := now();
      NEW.expires_at   := now() + interval '7 days';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchant_deals_set_lifespan ON public.merchant_deals;
CREATE TRIGGER merchant_deals_set_lifespan
  BEFORE INSERT OR UPDATE ON public.merchant_deals
  FOR EACH ROW EXECUTE FUNCTION public.merchant_deals_set_lifespan();

CREATE INDEX IF NOT EXISTS merchant_deals_active_expires_idx
  ON public.merchant_deals (city, is_active, expires_at);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS declared_company text,
  ADD COLUMN IF NOT EXISTS tech_park_zone text;

CREATE INDEX IF NOT EXISTS profiles_declared_company_idx
  ON public.profiles (declared_company)
  WHERE declared_company IS NOT NULL;
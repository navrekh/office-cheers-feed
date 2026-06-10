
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('employee', 'merchant');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'employee',
  verified_hub_city TEXT,
  pub_name TEXT,
  map_query_address TEXT,
  merchant_website TEXT,
  flash_deal_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. has_role helper (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role
  );
$$;

-- 4. Auto-create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'employee')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Add post_type column to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'user'
  CHECK (post_type IN ('user', 'merchant'));

-- Replace the existing insert policy with role-aware policies
DROP POLICY IF EXISTS "Authenticated users can create their own posts" ON public.posts;

CREATE POLICY "Employees can create user posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND post_type = 'user'
    AND public.has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Merchants can create merchant posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND post_type = 'merchant'
    AND public.has_role(auth.uid(), 'merchant')
  );

-- Tighten the wide-open update policy: only owners may update their own post,
-- and only merchants may touch merchant rows. Cheers still works via the
-- existing increment_cheers SECURITY DEFINER function.
DROP POLICY IF EXISTS "Anyone can cheers posts" ON public.posts;

CREATE POLICY "Owners can update their own posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (post_type = 'user' AND public.has_role(auth.uid(), 'employee'))
      OR (post_type = 'merchant' AND public.has_role(auth.uid(), 'merchant'))
    )
  );

-- 7. Merchant click telemetry
CREATE TABLE public.merchant_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pub_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.merchant_clicks TO authenticated;
GRANT ALL ON public.merchant_clicks TO service_role;

ALTER TABLE public.merchant_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own click"
  ON public.merchant_clicks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can read clicks for their pub"
  ON public.merchant_clicks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'merchant')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.pub_name IS NOT NULL
        AND lower(p.pub_name) = lower(merchant_clicks.pub_id)
    )
  );

CREATE INDEX merchant_clicks_pub_idx ON public.merchant_clicks (pub_id, created_at DESC);


ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle text UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS website_url text;

-- Case-insensitive uniqueness for handles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_idx
  ON public.profiles (lower(handle));

-- Public profile lookup: returns only safe, user-curated fields.
CREATE OR REPLACE FUNCTION public.get_public_profile(p_handle text)
RETURNS TABLE (
  id uuid,
  handle text,
  display_name text,
  bio text,
  avatar_url text,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  github_url text,
  twitter_url text,
  website_url text,
  pub_name text,
  role app_role,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.handle, p.display_name, p.bio, p.avatar_url,
    p.linkedin_url, p.instagram_url, p.facebook_url,
    p.github_url, p.twitter_url, p.website_url,
    p.pub_name, p.role, p.created_at
  FROM public.profiles p
  WHERE p.handle IS NOT NULL
    AND lower(p.handle) = lower(trim(p_handle))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

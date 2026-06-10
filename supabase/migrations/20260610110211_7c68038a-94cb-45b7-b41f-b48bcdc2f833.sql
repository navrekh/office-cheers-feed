
-- Add claim_ticket and is_author_view to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS claim_ticket text,
  ADD COLUMN IF NOT EXISTS is_author_view boolean NOT NULL DEFAULT false;

-- Backfill existing rows
UPDATE public.posts
SET claim_ticket = 'DRINK-' || upper(substr(md5(random()::text || id::text), 1, 5))
WHERE claim_ticket IS NULL;

-- Set default + not null + unique
ALTER TABLE public.posts
  ALTER COLUMN claim_ticket SET DEFAULT 'DRINK-' || upper(substr(md5(random()::text), 1, 5));

ALTER TABLE public.posts
  ALTER COLUMN claim_ticket SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_claim_ticket_key ON public.posts(claim_ticket);

-- Allow ticket-based delete via security-definer function
CREATE OR REPLACE FUNCTION public.delete_post_by_ticket(ticket text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  DELETE FROM public.posts WHERE claim_ticket = ticket;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_post_by_ticket(text) TO anon, authenticated;

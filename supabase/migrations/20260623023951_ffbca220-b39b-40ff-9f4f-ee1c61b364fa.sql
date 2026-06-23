-- 1. Add the column
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill from existing comments
UPDATE public.posts p
SET comment_count = sub.cnt
FROM (
  SELECT post_id, COUNT(*)::int AS cnt
  FROM public.comments
  GROUP BY post_id
) sub
WHERE sub.post_id = p.id;

-- 3. Trigger function to keep the count in sync
CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts
      SET comment_count = comment_count + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts
      SET comment_count = GREATEST(comment_count - 1, 0)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Wire the trigger
DROP TRIGGER IF EXISTS trg_sync_post_comment_count ON public.comments;
CREATE TRIGGER trg_sync_post_comment_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();
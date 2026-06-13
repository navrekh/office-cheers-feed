
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_type text;

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_media_type_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_media_type_check
  CHECK (media_type IS NULL OR media_type IN ('image','video'));

-- Storage policies for the private post_media bucket.
DROP POLICY IF EXISTS "post_media: authenticated read" ON storage.objects;
CREATE POLICY "post_media: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'post_media');

DROP POLICY IF EXISTS "post_media: upload own folder" ON storage.objects;
CREATE POLICY "post_media: upload own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post_media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "post_media: delete own" ON storage.objects;
CREATE POLICY "post_media: delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post_media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


CREATE POLICY "bar_pics public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bar_pics');

CREATE POLICY "bar_pics owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bar_pics'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "bar_pics owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bar_pics'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "bar_pics owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bar_pics'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

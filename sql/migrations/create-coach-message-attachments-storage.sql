-- ============================================
-- Create Coach Message Attachments Storage Bucket
-- ============================================
-- For photos and videos attached to announcements in Communicate.
-- Public bucket so player/parent notifications can show image thumbnails.
-- ============================================

-- Create storage bucket for coach message attachments (photos + videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-message-attachments',
  'coach-message-attachments',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Coaches can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;

CREATE POLICY "Coaches can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-message-attachments' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Coaches can update own message attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coach-message-attachments' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
)
WITH CHECK (
  bucket_id = 'coach-message-attachments' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Coaches can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-message-attachments' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'coach-message-attachments');

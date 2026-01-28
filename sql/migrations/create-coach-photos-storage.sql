-- ============================================
-- Create Coach Photos Storage Bucket
-- ============================================
-- Run this in your Supabase SQL Editor
-- This creates the storage bucket and RLS policies for coach profile photos
-- ============================================

-- Create storage bucket for coach photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-photos', 
  'coach-photos', 
  true, 
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] -- jpeg, jpg, png, webp, gif
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage RLS Policies
-- ============================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Coaches can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage coach photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view coach photos" ON storage.objects;

-- Allow coaches/admins to upload photos
CREATE POLICY "Coaches can upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-photos' AND
  (
    -- Coaches can upload to their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admins can upload to any coach's folder
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Allow coaches/admins to update photos
CREATE POLICY "Coaches can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coach-photos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'coach-photos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Allow coaches/admins to delete photos
CREATE POLICY "Coaches can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-photos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Allow anyone (authenticated) to view coach photos (public bucket)
CREATE POLICY "Anyone can view coach photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'coach-photos');


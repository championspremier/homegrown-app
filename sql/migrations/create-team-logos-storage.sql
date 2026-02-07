-- ============================================
-- Create Team Logos Storage Bucket
-- ============================================
-- Run this in your Supabase SQL Editor
-- This creates the storage bucket and RLS policies for team logos
-- ============================================

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-logos', 
  'team-logos', 
  true, 
  2097152, -- 2MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'] -- jpeg, jpg, png, webp, svg
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage RLS Policies
-- ============================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Coaches can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete team logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage team logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;

-- Allow coaches/admins to upload team logos
CREATE POLICY "Coaches can upload team logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-logos' AND
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

-- Allow coaches/admins to update team logos
CREATE POLICY "Coaches can update team logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-logos' AND
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
  bucket_id = 'team-logos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Allow coaches/admins to delete team logos
CREATE POLICY "Coaches can delete team logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-logos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Allow anyone (authenticated) to view team logos (public bucket)
CREATE POLICY "Anyone can view team logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'team-logos');


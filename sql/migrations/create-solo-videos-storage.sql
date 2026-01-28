-- ============================================
-- Create Solo Session Videos Storage Bucket
-- ============================================
-- Run this in your Supabase SQL Editor
-- This creates the storage bucket and RLS policies for solo session videos
-- ============================================

-- Create storage bucket for solo session videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'solo-session-videos', 
  'solo-session-videos', 
  true, 
  104857600, -- 100MB in bytes
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'] -- mp4, mov, webm, avi
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage RLS Policies
-- ============================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Coaches can upload solo videos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update own solo videos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete own solo videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view solo videos" ON storage.objects;

-- Allow coaches/admins to upload videos
CREATE POLICY "Coaches can upload solo videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'solo-session-videos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coach', 'admin')
  )
);

-- Allow coaches/admins to update their own videos
CREATE POLICY "Coaches can update own solo videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'solo-session-videos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coach', 'admin')
  )
);

-- Allow coaches/admins to delete their own videos
CREATE POLICY "Coaches can delete own solo videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'solo-session-videos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coach', 'admin')
  )
);

-- Allow anyone (authenticated) to view videos (public bucket)
CREATE POLICY "Anyone can view solo videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'solo-session-videos');


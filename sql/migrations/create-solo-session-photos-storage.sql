-- ============================================
-- Solo Session Completion Photos Storage
-- ============================================

-- Create storage bucket for solo session completion photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'solo-session-photos', 
  'solo-session-photos', 
  true, 
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for solo-session-photos bucket
-- Simplified approach: Use authenticated user ID in file path
-- The application code ensures the correct user (parent or player) uploads

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Players can upload own solo session photos" ON storage.objects;
DROP POLICY IF EXISTS "Players can update own solo session photos" ON storage.objects;
DROP POLICY IF EXISTS "Players can delete own solo session photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own solo session photos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can view solo session photos" ON storage.objects;

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.check_solo_photo_upload_permission(TEXT, UUID);

-- Simple policy: Allow authenticated users to upload to their own folder
-- File path format: {authenticatedUserId}/{bookingId}.{ext}
-- Match the working pattern from profile-photos storage (no TO authenticated clause)
CREATE POLICY "Players can upload own solo session photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'solo-session-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow players/parents to update their own photos
CREATE POLICY "Players can update own solo session photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'solo-session-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'solo-session-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow players/parents to delete their own photos
CREATE POLICY "Players can delete own solo session photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'solo-session-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own photos
CREATE POLICY "Users can view own solo session photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'solo-session-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow coaches/admins to view all solo session photos
CREATE POLICY "Coaches can view solo session photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'solo-session-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coach', 'admin')
  )
);

-- Allow parents to upload profile photos for their linked players
-- This fixes the RLS policy so parents can upload photos when viewing as a player
-- Run this in your Supabase SQL Editor

-- Drop existing INSERT policy to recreate it with parent support
DROP POLICY IF EXISTS "Users can upload own profile photo" ON storage.objects;

-- Create new policy that allows users to upload their own photos OR parents to upload for linked players
CREATE POLICY "Users can upload own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (
    -- Users can upload to their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Parents can upload to their linked players' folders
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid()
      AND ppr.player_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Drop existing UPDATE policy to recreate it with parent support
DROP POLICY IF EXISTS "Users can update own profile photo" ON storage.objects;

-- Create new policy that allows users to update their own photos OR parents to update for linked players
CREATE POLICY "Users can update own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND
  (
    -- Users can update their own photos
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Parents can update photos for their linked players
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid()
      AND ppr.player_id::text = (storage.foldername(name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (
    -- Users can update their own photos
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Parents can update photos for their linked players
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid()
      AND ppr.player_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Drop existing DELETE policy to recreate it with parent support
DROP POLICY IF EXISTS "Users can delete own profile photo" ON storage.objects;

-- Create new policy that allows users to delete their own photos OR parents to delete for linked players
CREATE POLICY "Users can delete own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' AND
  (
    -- Users can delete their own photos
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Parents can delete photos for their linked players
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid()
      AND ppr.player_id::text = (storage.foldername(name))[1]
    )
  )
);


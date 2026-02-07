-- Add zoom_link column to individual_session_types table
-- This allows coaches to set a default Zoom link for individual session types
-- Run this in your Supabase SQL Editor

-- Add zoom_link column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'individual_session_types' 
    AND column_name = 'zoom_link'
  ) THEN
    ALTER TABLE public.individual_session_types 
    ADD COLUMN zoom_link TEXT;
    
    COMMENT ON COLUMN public.individual_session_types.zoom_link IS 'Default Zoom meeting link for this session type. Players and parents can click this link to join sessions.';
  END IF;
END $$;


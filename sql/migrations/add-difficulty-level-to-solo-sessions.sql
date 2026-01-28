-- ============================================
-- Add difficulty_level column to solo_sessions
-- ============================================
-- This migration adds the difficulty_level column to allow coaches to set
-- beginner, intermediate, or advanced difficulty for sessions
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add difficulty_level column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solo_sessions' 
    AND column_name = 'difficulty_level'
  ) THEN
    ALTER TABLE public.solo_sessions
    ADD COLUMN difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner';
  END IF;
END $$;

-- Add comment to column
COMMENT ON COLUMN public.solo_sessions.difficulty_level IS 'Difficulty level of the session: beginner, intermediate, or advanced';

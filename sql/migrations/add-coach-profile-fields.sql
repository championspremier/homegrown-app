-- ============================================
-- Add Coach Profile Fields to Profiles Table
-- ============================================
-- Run this in your Supabase SQL Editor
-- This adds coach_role, profile_photo_url, and team_logos columns to the profiles table
-- ============================================

-- Add coach_role column (text field for role: Coach, Current Pro, Ex-Pro, GK Current Pro, GK Ex-Pro)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS coach_role TEXT;

-- Add profile_photo_url column (URL to the coach's profile photo in storage)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add team_logos column (array of URLs to team logos in storage)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS team_logos TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.coach_role IS 'Coach role: Coach, Current Pro, Ex-Pro, GK Current Pro, or GK Ex-Pro';
COMMENT ON COLUMN public.profiles.profile_photo_url IS 'URL to the coach profile photo stored in coach-photos bucket';
COMMENT ON COLUMN public.profiles.team_logos IS 'Array of URLs to team logos stored in team-logos bucket';


-- Migration: Add phone_number and zoho_lead_id to profiles table
-- Run this in your Supabase SQL Editor if the profiles table already exists

-- Add phone_number column (if it doesn't exist)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add zoho_lead_id column (if it doesn't exist)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS zoho_lead_id TEXT;

-- Create index for faster lookups on zoho_lead_id
CREATE INDEX IF NOT EXISTS idx_profiles_zoho_lead_id ON profiles(zoho_lead_id);

-- Update the handle_new_user function to include phone_number in initial insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a basic profile with default role
  -- Additional data (player_name, etc.) will be updated by the client after signup
  INSERT INTO public.profiles (id, role, player_name, program_type, competitive_level, phone_number)
  VALUES (
    NEW.id, 
    'player',
    COALESCE(NEW.raw_user_meta_data->>'player_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'program_type', ''),
    COALESCE(NEW.raw_user_meta_data->>'competitive_level', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    player_name = COALESCE(EXCLUDED.player_name, profiles.player_name),
    program_type = COALESCE(EXCLUDED.program_type, profiles.program_type),
    competitive_level = COALESCE(EXCLUDED.competitive_level, profiles.competitive_level),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


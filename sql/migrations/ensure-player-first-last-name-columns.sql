-- Ensure Player First Name and Last Name Columns Exist
-- This migration ensures first_name and last_name columns exist for players
-- Run this in your Supabase SQL Editor

-- Step 1: Verify/Add first_name and last_name columns (if they don't exist)
-- These should already exist from the parent migration, but this ensures they're there
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Step 2: Verify the columns exist and are nullable (for backwards compatibility)
-- Players can have first_name and last_name, or just player_name
-- This is already the case, but we're documenting it here

-- Step 3: Update handle_new_user function to ensure it handles first_name and last_name for players
-- This should already be in place, but we're verifying the function handles both
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  user_birth_date DATE;
  user_phone_number TEXT;
  user_program_type TEXT;
  user_competitive_level TEXT;
  user_birth_year INTEGER;
BEGIN
  -- Extract role from metadata, default to 'player'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'player');
  
  -- Extract all possible fields
  user_first_name := NEW.raw_user_meta_data->>'first_name';
  user_last_name := NEW.raw_user_meta_data->>'last_name';
  user_program_type := NEW.raw_user_meta_data->>'program_type';
  user_competitive_level := NEW.raw_user_meta_data->>'competitive_level';
  user_phone_number := NEW.raw_user_meta_data->>'phone_number';
  user_birth_date := CASE 
    WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
    THEN (NEW.raw_user_meta_data->>'birth_date')::DATE
    ELSE NULL
  END;
  user_birth_year := CASE 
    WHEN NEW.raw_user_meta_data->>'birth_year' IS NOT NULL 
    THEN (NEW.raw_user_meta_data->>'birth_year')::INTEGER
    ELSE NULL
  END;

  -- Create profile based on role
  IF user_role = 'parent' THEN
    -- For parents, insert with parent-specific fields
    INSERT INTO public.profiles (
      id, 
      role, 
      first_name,
      last_name,
      phone_number,
      birth_date,
      program_type,  -- NULL for parents
      competitive_level  -- NULL for parents
    )
    VALUES (
      NEW.id, 
      'parent',
      user_first_name,
      user_last_name,
      user_phone_number,
      user_birth_date,
      NULL,
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
      phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
      birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
      role = COALESCE(EXCLUDED.role, profiles.role);
  ELSE
    -- For players, insert with player-specific fields using first_name and last_name
    INSERT INTO public.profiles (
      id, 
      role, 
      first_name,
      last_name,
      program_type, 
      competitive_level,
      phone_number,
      birth_year
    )
    VALUES (
      NEW.id, 
      COALESCE(user_role, 'player'),
      user_first_name,
      user_last_name,
      COALESCE(user_program_type, ''),
      COALESCE(user_competitive_level, ''),
      user_phone_number,
      user_birth_year
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
      program_type = COALESCE(EXCLUDED.program_type, profiles.program_type),
      competitive_level = COALESCE(EXCLUDED.competitive_level, profiles.competitive_level),
      phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
      birth_year = COALESCE(EXCLUDED.birth_year, profiles.birth_year),
      role = COALESCE(EXCLUDED.role, profiles.role);
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Verify the function was created
-- You can run this query to verify:
-- SELECT routine_name, routine_definition 
-- FROM information_schema.routines 
-- WHERE routine_name = 'handle_new_user';

-- Note: The first_name and last_name columns should already exist from the parent migration.
-- This script ensures they exist and updates the trigger function to properly handle
-- first_name and last_name for both parents and players.

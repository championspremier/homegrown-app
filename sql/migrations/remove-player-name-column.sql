-- Remove player_name Column from Profiles Table
-- This migration removes the player_name column since we're now using first_name and last_name
-- Run this in your Supabase SQL Editor

-- WARNING: This will permanently delete the player_name column and all its data
-- Make sure you have backups and that all code has been updated to use first_name + last_name

-- Step 1: Make player_name nullable first (if it's not already)
-- This allows us to safely remove it later
ALTER TABLE profiles 
ALTER COLUMN player_name DROP NOT NULL;

-- Step 2: Update any existing records that have player_name but no first_name/last_name
-- This migrates existing data before dropping the column
UPDATE profiles
SET 
  first_name = CASE 
    WHEN first_name IS NULL AND player_name IS NOT NULL 
    THEN SPLIT_PART(player_name, ' ', 1)
    ELSE first_name
  END,
  last_name = CASE 
    WHEN last_name IS NULL AND player_name IS NOT NULL 
    THEN SUBSTRING(player_name FROM POSITION(' ' IN player_name) + 1)
    ELSE last_name
  END
WHERE (first_name IS NULL OR last_name IS NULL) 
  AND player_name IS NOT NULL 
  AND role = 'player';

-- Step 3: Drop the player_name column
-- This permanently removes the column from the table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS player_name;

-- Step 4: Update handle_new_user function to remove player_name references
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

-- Step 5: Update update_user_profile RPC function to remove player_name parameter
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_program_type TEXT DEFAULT NULL,
  p_competitive_level TEXT DEFAULT NULL,
  p_team_name TEXT DEFAULT NULL,
  p_birth_year INTEGER DEFAULT NULL,
  p_positions TEXT[] DEFAULT NULL,
  p_referral_source TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    first_name = COALESCE(p_first_name, profiles.first_name),
    last_name = COALESCE(p_last_name, profiles.last_name),
    phone_number = COALESCE(p_phone_number, profiles.phone_number),
    birth_date = COALESCE(p_birth_date, profiles.birth_date),
    program_type = COALESCE(p_program_type, profiles.program_type),
    competitive_level = COALESCE(p_competitive_level, profiles.competitive_level),
    team_name = COALESCE(p_team_name, profiles.team_name),
    birth_year = COALESCE(p_birth_year, profiles.birth_year),
    positions = COALESCE(p_positions, profiles.positions),
    referral_source = COALESCE(p_referral_source, profiles.referral_source),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Step 6: Verify the column was dropped
-- Run this query to verify player_name no longer exists:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- ORDER BY column_name;

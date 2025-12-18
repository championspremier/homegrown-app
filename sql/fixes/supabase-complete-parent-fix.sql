-- COMPLETE FIX: Parent Signup - Run this ENTIRE file
-- This includes all necessary migrations in the correct order

-- ============================================
-- STEP 1: Add parent-specific columns to profiles table
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- ============================================
-- STEP 2: Make player-specific fields nullable
-- ============================================
ALTER TABLE profiles 
ALTER COLUMN player_name DROP NOT NULL;

ALTER TABLE profiles 
ALTER COLUMN program_type DROP NOT NULL;

ALTER TABLE profiles 
ALTER COLUMN competitive_level DROP NOT NULL;

-- ============================================
-- STEP 3: Update handle_new_user function to handle both parents and players
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  user_birth_date DATE;
  user_phone_number TEXT;
  user_player_name TEXT;
  user_program_type TEXT;
  user_competitive_level TEXT;
  user_birth_year INTEGER;
BEGIN
  -- Extract role from metadata, default to 'player'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'player');
  
  -- Extract parent fields
  user_first_name := NEW.raw_user_meta_data->>'first_name';
  user_last_name := NEW.raw_user_meta_data->>'last_name';
  user_phone_number := NEW.raw_user_meta_data->>'phone_number';
  
  -- Handle birth_date (can be a date string)
  IF NEW.raw_user_meta_data->>'birth_date' IS NOT NULL AND NEW.raw_user_meta_data->>'birth_date' != '' THEN
    BEGIN
      user_birth_date := (NEW.raw_user_meta_data->>'birth_date')::DATE;
    EXCEPTION WHEN OTHERS THEN
      user_birth_date := NULL;
    END;
  ELSE
    user_birth_date := NULL;
  END IF;
  
  -- Extract player fields
  user_player_name := NEW.raw_user_meta_data->>'player_name';
  user_program_type := NEW.raw_user_meta_data->>'program_type';
  user_competitive_level := NEW.raw_user_meta_data->>'competitive_level';
  
  -- Handle birth_year (can be an integer or string)
  IF NEW.raw_user_meta_data->>'birth_year' IS NOT NULL AND NEW.raw_user_meta_data->>'birth_year' != '' THEN
    BEGIN
      user_birth_year := (NEW.raw_user_meta_data->>'birth_year')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      user_birth_year := NULL;
    END;
  ELSE
    user_birth_year := NULL;
  END IF;
  
  -- Create profile based on role
  IF user_role = 'parent' THEN
    -- For parents, insert with parent-specific fields and NULL for player fields
    INSERT INTO public.profiles (
      id, 
      role, 
      first_name,
      last_name,
      phone_number,
      birth_date,
      player_name,  -- NULL for parents (not used)
      program_type,  -- NULL for parents (not used)
      competitive_level  -- NULL for parents (not used)
    )
    VALUES (
      NEW.id, 
      'parent',
      user_first_name,
      user_last_name,
      user_phone_number,
      user_birth_date,
      NULL,  -- NULL for player_name
      NULL,  -- NULL for program_type
      NULL   -- NULL for competitive_level
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
      phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
      birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
      role = COALESCE(EXCLUDED.role, profiles.role);
  ELSE
    -- For players, insert with player-specific fields
    INSERT INTO public.profiles (
      id, 
      role, 
      player_name, 
      program_type, 
      competitive_level,
      phone_number,
      birth_year
    )
    VALUES (
      NEW.id, 
      COALESCE(user_role, 'player'),
      COALESCE(user_player_name, ''),
      COALESCE(user_program_type, ''),
      COALESCE(user_competitive_level, ''),
      user_phone_number,
      user_birth_year
    )
    ON CONFLICT (id) DO UPDATE SET
      player_name = COALESCE(EXCLUDED.player_name, profiles.player_name),
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

-- ============================================
-- STEP 4: Recreate the trigger
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Verify the changes
-- ============================================
-- Run these queries to verify:
-- 
-- Check columns exist and are nullable:
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('player_name', 'program_type', 'competitive_level', 'first_name', 'last_name', 'birth_date');
--
-- Check function exists:
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'handle_new_user';
--
-- Check trigger exists:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';


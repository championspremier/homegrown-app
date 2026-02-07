-- Ensure Coach Profile Trigger Works Correctly
-- This verifies and fixes the trigger to ensure coach profiles are always created
-- Run this in your Supabase SQL Editor

-- Step 1: Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users';

-- Step 2: Check if handle_new_user function exists and handles coaches
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Step 3: Recreate the trigger function with improved error handling for coaches
-- This ensures coach profiles are always created, even if there are RLS issues
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
  
  -- Extract parent/coach fields
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
      player_name,
      program_type,
      competitive_level
    )
    VALUES (
      NEW.id, 
      'parent',
      user_first_name,
      user_last_name,
      user_phone_number,
      user_birth_date,
      NULL,
      NULL,
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
      phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
      birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
      role = COALESCE(EXCLUDED.role, profiles.role);
      
  ELSIF user_role = 'coach' THEN
    -- For coaches, insert with coach-specific fields
    -- Use email prefix as fallback for first_name if not provided
    INSERT INTO public.profiles (
      id, 
      role, 
      first_name,
      last_name,
      phone_number,
      player_name,
      program_type,
      competitive_level
    )
    VALUES (
      NEW.id, 
      'coach',
      COALESCE(user_first_name, SPLIT_PART(NEW.email, '@', 1)), -- Fallback to email prefix
      COALESCE(user_last_name, ''), -- Empty string if not provided
      user_phone_number,
      NULL,
      NULL,
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
      phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
      role = 'coach'; -- Always ensure role is coach
      
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
    -- This is important - we don't want signup to fail if profile creation has issues
    RAISE WARNING 'Error in handle_new_user for user % (role: %): %', NEW.id, user_role, SQLERRM;
    -- Try to create a minimal profile as fallback
    BEGIN
      INSERT INTO public.profiles (id, role, first_name, last_name)
      VALUES (
        NEW.id,
        COALESCE(user_role, 'player'),
        COALESCE(user_first_name, SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(user_last_name, '')
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- If even the fallback fails, just log it
      RAISE WARNING 'Fallback profile creation also failed for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users';

-- Note: The function uses SECURITY DEFINER, which means it runs with the privileges
-- of the function owner (usually postgres), bypassing RLS. This ensures profiles
-- are always created during signup, even if RLS policies would normally block it.

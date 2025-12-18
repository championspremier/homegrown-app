-- Migration: Fix parent signup by making player-specific fields nullable
-- Run this in your Supabase SQL Editor

-- 1. Make player-specific fields nullable (they're only required for players, not parents)
ALTER TABLE profiles 
ALTER COLUMN player_name DROP NOT NULL;

ALTER TABLE profiles 
ALTER COLUMN program_type DROP NOT NULL;

ALTER TABLE profiles 
ALTER COLUMN competitive_level DROP NOT NULL;

-- 2. Update handle_new_user function to properly handle both parents and players
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Get role from metadata, default to 'player'
  DECLARE
    user_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'player');
  BEGIN
    -- Create profile based on role
    IF user_role = 'parent' THEN
      -- For parents, only set parent-specific fields
      INSERT INTO public.profiles (
        id, 
        role, 
        first_name,
        last_name,
        phone_number,
        birth_date,
        player_name,  -- Set to empty string for parents
        program_type,  -- Set to empty string for parents
        competitive_level  -- Set to empty string for parents
      )
      VALUES (
        NEW.id, 
        'parent',
        COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL),
        CASE 
          WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
          THEN (NEW.raw_user_meta_data->>'birth_date')::DATE
          ELSE NULL
        END,
        '',  -- Empty string for player_name (not used for parents)
        '',  -- Empty string for program_type (not used for parents)
        ''   -- Empty string for competitive_level (not used for parents)
      )
      ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
        phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
        birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
        role = COALESCE(EXCLUDED.role, profiles.role);
    ELSE
      -- For players, set player-specific fields
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
        COALESCE(NEW.raw_user_meta_data->>'role', 'player'),
        COALESCE(NEW.raw_user_meta_data->>'player_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'program_type', ''),
        COALESCE(NEW.raw_user_meta_data->>'competitive_level', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL),
        CASE 
          WHEN NEW.raw_user_meta_data->>'birth_year' IS NOT NULL 
          THEN (NEW.raw_user_meta_data->>'birth_year')::INTEGER
          ELSE NULL
        END
      )
      ON CONFLICT (id) DO UPDATE SET
        player_name = COALESCE(EXCLUDED.player_name, profiles.player_name),
        program_type = COALESCE(EXCLUDED.program_type, profiles.program_type),
        competitive_level = COALESCE(EXCLUDED.competitive_level, profiles.competitive_level),
        phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
        birth_year = COALESCE(EXCLUDED.birth_year, profiles.birth_year),
        role = COALESCE(EXCLUDED.role, profiles.role);
    END IF;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


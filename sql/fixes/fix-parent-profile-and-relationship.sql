-- Fix Parent Profile and Create Relationship
-- Run this in your Supabase SQL Editor

-- Step 1: Check if parent profile exists
-- Replace '82b3cd74-4b81-4f6f-93c8-0863a5022ef4' with your actual parent user ID
DO $$
DECLARE
  parent_user_id UUID := '82b3cd74-4b81-4f6f-93c8-0863a5022ef4';
  profile_exists BOOLEAN;
  parent_email TEXT;
  parent_first_name TEXT;
  parent_last_name TEXT;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = parent_user_id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Get parent info from auth.users
    SELECT 
      email,
      raw_user_meta_data->>'first_name',
      raw_user_meta_data->>'last_name'
    INTO 
      parent_email,
      parent_first_name,
      parent_last_name
    FROM auth.users
    WHERE id = parent_user_id;
    
    -- Create parent profile
    INSERT INTO profiles (
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
      parent_user_id,
      'parent',
      parent_first_name,
      parent_last_name,
      (SELECT raw_user_meta_data->>'phone_number' FROM auth.users WHERE id = parent_user_id),
      (SELECT (raw_user_meta_data->>'birth_date')::DATE FROM auth.users WHERE id = parent_user_id),
      NULL,  -- NULL for parents
      NULL,  -- NULL for parents
      NULL   -- NULL for parents
    );
    
    RAISE NOTICE '✅ Created parent profile for user: %', parent_user_id;
  ELSE
    RAISE NOTICE 'ℹ️ Parent profile already exists';
  END IF;
END $$;

-- Step 2: Find the player account ID
-- You'll need to find the player account that was created during signup
-- Check the profiles table for a player with role='player' that was created around the same time
-- Or check auth.users for the player email

-- Example query to find player accounts:
-- SELECT id, player_name, role, created_at 
-- FROM profiles 
-- WHERE role = 'player' 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- Step 3: Create the relationship
-- Replace 'PLAYER_ID_HERE' with the actual player ID from Step 2
-- Uncomment and run this after you have the player ID:

/*
INSERT INTO parent_player_relationships (
  parent_id,
  player_id,
  relationship_type
)
VALUES (
  '82b3cd74-4b81-4f6f-93c8-0863a5022ef4',  -- Parent ID
  'PLAYER_ID_HERE',  -- Replace with actual player ID
  'primary'
)
ON CONFLICT (parent_id, player_id) DO NOTHING;
*/

-- Alternative: If you know the player's email, you can find the player ID like this:
/*
WITH player_info AS (
  SELECT id, email 
  FROM auth.users 
  WHERE email = 'player@example.com'  -- Replace with player email
)
INSERT INTO parent_player_relationships (
  parent_id,
  player_id,
  relationship_type
)
SELECT 
  '82b3cd74-4b81-4f6f-93c8-0863a5022ef4',  -- Parent ID
  player_info.id,  -- Player ID from auth.users
  'primary'
FROM player_info
ON CONFLICT (parent_id, player_id) DO NOTHING;
*/


-- Simple Fix: Create Parent Profile and Relationship
-- Run this in your Supabase SQL Editor

-- Step 1: Create parent profile if it doesn't exist
-- This will create the profile from the auth.users data
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
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'role', 'parent')::TEXT,
  raw_user_meta_data->>'first_name',
  raw_user_meta_data->>'last_name',
  raw_user_meta_data->>'phone_number',
  CASE 
    WHEN raw_user_meta_data->>'birth_date' IS NOT NULL 
    THEN (raw_user_meta_data->>'birth_date')::DATE 
    ELSE NULL 
  END,
  NULL,  -- NULL for parents
  NULL,  -- NULL for parents
  NULL   -- NULL for parents
FROM auth.users
WHERE id = '82b3cd74-4b81-4f6f-93c8-0863a5022ef4'  -- Replace with your parent user ID
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
  )
ON CONFLICT (id) DO UPDATE SET
  role = COALESCE(EXCLUDED.role, profiles.role),
  first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
  last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
  phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
  birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date);

-- Step 2: Find the player account
-- Run this query to see all player accounts and find the one linked to this parent
-- Look for a player account created around the same time as the parent
SELECT 
  p.id,
  p.player_name,
  p.role,
  p.created_at,
  u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'player'
ORDER BY p.created_at DESC
LIMIT 10;

-- Step 3: After you find the player ID from Step 2, run this to create the relationship
-- Replace 'PLAYER_ID_HERE' with the actual player ID from Step 2
/*
INSERT INTO parent_player_relationships (
  parent_id,
  player_id,
  relationship_type
)
VALUES (
  '82b3cd74-4b81-4f6f-93c8-0863a5022ef4',  -- Parent ID
  'PLAYER_ID_HERE',  -- Replace with player ID from Step 2
  'primary'
)
ON CONFLICT (parent_id, player_id) DO NOTHING;
*/


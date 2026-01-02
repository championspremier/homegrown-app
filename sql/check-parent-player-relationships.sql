-- Check Parent-Player Relationships
-- Run this in your Supabase SQL Editor to verify relationships exist

-- Replace 'PARENT_ID_HERE' with your actual parent user ID
-- You can find it by running: SELECT id, first_name, last_name, role FROM profiles WHERE role = 'parent';

-- 1. Check all relationships for a specific parent
SELECT 
  ppr.id as relationship_id,
  ppr.parent_id,
  ppr.player_id,
  ppr.relationship_type,
  parent_prof.first_name as parent_first_name,
  parent_prof.last_name as parent_last_name,
  player_prof.first_name as player_first_name,
  player_prof.last_name as player_last_name,
  player_prof.role as player_role
FROM parent_player_relationships ppr
LEFT JOIN profiles parent_prof ON parent_prof.id = ppr.parent_id
LEFT JOIN profiles player_prof ON player_prof.id = ppr.player_id
WHERE ppr.parent_id = 'PARENT_ID_HERE'  -- Replace with your parent ID
ORDER BY ppr.created_at DESC;

-- 2. Check if all players have profiles
SELECT 
  ppr.player_id,
  player_prof.first_name,
  player_prof.last_name,
  player_prof.role,
  CASE 
    WHEN player_prof.id IS NULL THEN 'MISSING PROFILE'
    WHEN player_prof.role != 'player' THEN 'WRONG ROLE'
    ELSE 'OK'
  END as status
FROM parent_player_relationships ppr
LEFT JOIN profiles player_prof ON player_prof.id = ppr.player_id
WHERE ppr.parent_id = 'PARENT_ID_HERE'  -- Replace with your parent ID
ORDER BY ppr.created_at DESC;

-- 3. If relationships are missing, you can create them manually:
-- Replace 'PARENT_ID_HERE' and 'PLAYER_ID_HERE' with actual IDs
/*
INSERT INTO parent_player_relationships (
  parent_id,
  player_id,
  relationship_type
)
VALUES (
  'PARENT_ID_HERE',  -- Parent user ID
  'PLAYER_ID_HERE',  -- Player user ID
  'primary'
)
ON CONFLICT (parent_id, player_id) DO NOTHING;
*/


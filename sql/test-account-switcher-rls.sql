-- Test script to verify the account switcher RLS policy is working
-- Run this as a player user in Supabase SQL Editor to test

-- Step 1: Check if the function exists and works
SELECT public.get_player_parent_id(auth.uid()) AS parent_id;

-- Step 2: Check what relationships the current player can see
-- This should return:
-- 1. The player's own relationship (auth.uid() = player_id)
-- 2. All other relationships for the same parent (parent_id = get_player_parent_id(auth.uid()))
SELECT 
  player_id,
  parent_id,
  relationship_type,
  CASE 
    WHEN auth.uid() = player_id THEN 'Own relationship'
    WHEN parent_id = public.get_player_parent_id(auth.uid()) THEN 'Same parent'
    ELSE 'Other'
  END AS relationship_type_desc
FROM public.parent_player_relationships
ORDER BY relationship_type_desc, player_id;

-- Step 3: Check the RLS policy definition
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'parent_player_relationships'
AND policyname = 'Players can view their relationships';

-- Expected result:
-- If you're logged in as a player, you should see:
-- 1. Your own relationship (where you are the player_id)
-- 2. All other relationships where the parent_id matches your parent_id
-- 
-- If you only see your own relationship, the RLS policy might not be working correctly.


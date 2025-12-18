-- Complete Fix for Parent-Player Relationship RLS Policy
-- This allows parents to create relationships during signup
-- Run this ENTIRE file in your Supabase SQL Editor

-- Step 1: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Parents can create relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Parents can update their relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Parents can insert their own relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Parents can update their own relationships" ON parent_player_relationships;

-- Step 2: Create SIMPLE policy - just check that parent_id matches authenticated user
-- This is the simplest and most reliable approach
CREATE POLICY "Parents can insert their own relationships"
  ON parent_player_relationships FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- Step 3: Allow parents to update their own relationships
CREATE POLICY "Parents can update their own relationships"
  ON parent_player_relationships FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

-- Step 4: Verify the policies were created
-- Uncomment and run this query in Supabase SQL Editor to verify:
/*
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE tablename = 'parent_player_relationships'
ORDER BY policyname;
*/


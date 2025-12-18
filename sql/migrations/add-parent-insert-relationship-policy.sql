-- Add RLS Policy for Parents to Insert Relationships
-- This allows parents to create relationships when adding new player accounts from the profile page
-- Run this in your Supabase SQL Editor

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Parents can insert their own relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Parents can create relationships" ON parent_player_relationships;

-- Create SIMPLE policy - just check that parent_id matches authenticated user
-- This is the simplest and most reliable approach
CREATE POLICY "Parents can insert their own relationships"
  ON parent_player_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_id);

-- Verify the policy was created
-- You can run this query to verify:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'parent_player_relationships' 
-- AND policyname = 'Parents can insert their own relationships';

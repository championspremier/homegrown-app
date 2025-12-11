-- Final Fix for Parent-Player Relationship RLS Policy
-- This script drops ALL existing policies and creates a simple, working policy
-- Run this ENTIRE file in your Supabase SQL Editor

-- Step 1: Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Parents can create relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can update their relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can insert their own relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can update their own relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can view their linked players" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Players can view their linked parents" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Admins can view all relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Admins can insert relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Admins can update relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Admins can delete relationships" ON public.parent_player_relationships;

-- Step 2: Create a simple, permissive INSERT policy
-- This policy allows any authenticated user to insert a relationship where they are the parent
CREATE POLICY "Parents can insert their own relationships"
  ON public.parent_player_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_id);

-- Step 3: Create a simple UPDATE policy
CREATE POLICY "Parents can update their own relationships"
  ON public.parent_player_relationships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

-- Step 4: Create SELECT policies so users can view their relationships
-- Parents can view relationships where they are the parent
CREATE POLICY "Parents can view their relationships"
  ON public.parent_player_relationships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_id);

-- Players can view relationships where they are the player
CREATE POLICY "Players can view their relationships"
  ON public.parent_player_relationships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = player_id);

-- Step 5: Verify the policies were created
-- Run this query to verify:
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

-- Step 6: Test query to verify auth.uid() works
-- This should return your current user ID when run as an authenticated user
-- SELECT auth.uid() AS current_user_id;


-- Fix RLS Policies for Parent-Player Relationships
-- This fixes both SELECT and INSERT policies to use simple, reliable checks
-- Run this ENTIRE file in your Supabase SQL Editor

-- Step 1: Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Parents can create relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can update their relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can insert their own relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can update their own relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can view their linked players" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Players can view their linked parents" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Parents can view their relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Players can view their relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Admins can view all relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Admins can insert relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Admins can update relationships" ON public.parent_player_relationships;
DROP POLICY IF EXISTS "Admins can delete relationships" ON public.parent_player_relationships;

-- Step 2: Create simple SELECT policies (NO recursion - don't check profiles table)
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

-- Note: Removed admin policy to avoid recursion (admin policies check profiles.role which causes recursion)
-- If you need admin access, you can create a service role function or disable RLS for admins

-- Step 3: Create simple INSERT policy (NO recursion - don't check profiles table)
-- Parents can insert relationships where they are the parent
CREATE POLICY "Parents can insert their own relationships"
  ON public.parent_player_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_id);

-- Note: Removed admin INSERT policy to avoid recursion

-- Step 4: Create UPDATE policies (NO recursion - don't check profiles table)
CREATE POLICY "Parents can update their own relationships"
  ON public.parent_player_relationships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

-- Note: Removed admin UPDATE policy to avoid recursion

-- Step 5: Verify the policies were created
-- Run this query to verify all policies exist:
/*
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE tablename = 'parent_player_relationships'
ORDER BY policyname;
*/

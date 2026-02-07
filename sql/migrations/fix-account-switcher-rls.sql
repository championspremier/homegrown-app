-- Fix RLS Policy for Account Switcher
-- This allows players to view relationships for their linked parent
-- so they can see all players linked to the same parent when switching accounts
-- 
-- SAFETY ANALYSIS:
-- 1. Parent policy unchanged: auth.uid() = parent_id (no impact on parent login/queries)
-- 2. Player policy enhanced: auth.uid() = player_id OR parent_id = get_player_parent_id(auth.uid())
--    - Still allows players to see their own relationship (backward compatible)
--    - Adds ability to see all relationships for their parent (new feature)
-- 3. Coach policy: Separate policy exists, not affected by this change
-- 4. INSERT/UPDATE policies: Not changed, still work as before
-- 5. Function uses SECURITY DEFINER with SET search_path for safety
--
-- Run this ENTIRE file in your Supabase SQL Editor

-- Step 1: Verify parent policy exists (safety check)
DO $$
DECLARE
  parent_policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parent_player_relationships' 
    AND policyname = 'Parents can view their relationships'
  ) INTO parent_policy_exists;
  
  IF NOT parent_policy_exists THEN
    RAISE EXCEPTION 'Parent policy does not exist. Please run fix-parent-player-rls-policies.sql first.';
  END IF;
END $$;

-- Step 2: Drop existing player policy FIRST (before dropping function that depends on it)
-- This is safe because:
-- 1. We're only changing the player policy, not the parent policy
-- 2. The new policy includes the old condition (auth.uid() = player_id) so it's backward compatible
-- 3. Must be done BEFORE dropping the function, otherwise we get dependency error
DROP POLICY IF EXISTS "Players can view their relationships" ON public.parent_player_relationships;

-- Step 3: Drop existing function if it exists (safe - will recreate)
-- Must be done AFTER dropping the policy that depends on it
DROP FUNCTION IF EXISTS public.get_player_parent_id(UUID);

-- Step 4: Create a helper function to get player's parent_id (avoids recursion)
-- This function uses SECURITY DEFINER to bypass RLS and prevent infinite recursion
-- It also sets search_path to avoid any potential issues
CREATE OR REPLACE FUNCTION public.get_player_parent_id(p_player_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Directly query the table without triggering RLS (SECURITY DEFINER bypasses RLS)
  SELECT parent_id INTO v_parent_id
  FROM public.parent_player_relationships
  WHERE player_id = p_player_id
  LIMIT 1;
  
  RETURN v_parent_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_player_parent_id(UUID) TO authenticated;

-- Step 5: Create updated policy that allows players to view:
-- (Must be done AFTER recreating the function)
-- 1. Relationships where they are the player (their own relationship)
-- 2. Relationships where they share the same parent (for account switcher)
-- This uses the helper function to avoid recursion
CREATE POLICY "Players can view their relationships"
  ON public.parent_player_relationships
  FOR SELECT
  TO authenticated
  USING (
    -- Player can see their own relationship (EXISTING FUNCTIONALITY - no breaking change)
    auth.uid() = player_id
    OR
    -- Player can see relationships for their linked parent (NEW FUNCTIONALITY - account switcher)
    -- Use the helper function to get the player's parent_id without recursion
    -- If player has no parent, function returns NULL and this condition is false (safe)
    parent_id = public.get_player_parent_id(auth.uid())
  );

-- Step 6: Verify the policy was created correctly
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'parent_player_relationships'
  AND policyname = 'Players can view their relationships';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Policy creation failed!';
  END IF;
  
  RAISE NOTICE 'Policy created successfully. Player policy now allows viewing own relationship AND all relationships for linked parent.';
END $$;

-- Verification queries (uncomment to run):
-- You can run this query to verify:
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'parent_player_relationships' 
-- AND policyname = 'Players can view their relationships';


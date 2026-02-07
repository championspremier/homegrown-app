-- Allow Players to View Profiles of Other Players Who Share the Same Parent
-- This is needed for the account switcher when a player is logged in
-- and wants to see all players linked to their parent
-- Run this ENTIRE file in your Supabase SQL Editor

-- IMPORTANT: This requires the get_player_parent_id() function to exist.
-- If it doesn't exist, run sql/migrations/fix-account-switcher-rls.sql first.

-- Step 1: Verify the function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_player_parent_id'
  ) THEN
    RAISE EXCEPTION 'get_player_parent_id() function does not exist. Please run fix-account-switcher-rls.sql first.';
  END IF;
END $$;

-- Step 2: Drop existing policy if it exists
DROP POLICY IF EXISTS "Players can view sibling player profiles" ON public.profiles;

-- Step 3: Create policy to allow players to view profiles of other players
-- who share the same parent (for account switcher functionality)
-- This uses the get_player_parent_id() function to avoid recursion
CREATE POLICY "Players can view sibling player profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the profile being viewed is a player
    -- AND the current user is also a player
    -- AND they share the same parent
    profiles.role = 'player'
    AND EXISTS (
      -- Check if current user is a player with a parent
      SELECT 1 FROM public.parent_player_relationships ppr1
      WHERE ppr1.player_id = auth.uid()
    )
    AND EXISTS (
      -- Check if the profile being viewed is a player with the same parent
      SELECT 1 FROM public.parent_player_relationships ppr2
      WHERE ppr2.player_id = profiles.id
      AND ppr2.parent_id = public.get_player_parent_id(auth.uid())
    )
  );

-- Note: This policy works in combination with existing policies:
-- - Users can view own profile (always works)
-- - Players can view linked parent profiles (for parent-player relationships)
-- - Players can view sibling player profiles (NEW - for account switcher)
-- 
-- PostgreSQL RLS combines multiple SELECT policies with OR, so all conditions work together.

-- Step 4: Verify the policy was created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
  AND policyname = 'Players can view sibling player profiles';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Policy creation failed!';
  END IF;
  
  RAISE NOTICE 'Policy created successfully. Players can now view profiles of other players who share the same parent.';
END $$;

-- Verification query (uncomment to run):
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'profiles' 
-- AND policyname = 'Players can view sibling player profiles';


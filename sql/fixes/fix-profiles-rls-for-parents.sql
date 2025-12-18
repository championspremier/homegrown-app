-- Fix RLS Policy for Profiles Table
-- This allows parents to read profiles of players they're linked to
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Parents can view linked player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Players can view linked parent profiles" ON public.profiles;

-- Step 2: Add policy for parents to view profiles of their linked players
-- NOTE: We don't check the role from profiles table to avoid infinite recursion
-- Instead, we just check if a relationship exists. If a relationship exists with
-- parent_id = auth.uid(), then the user must be a parent.
CREATE POLICY "Parents can view linked player profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if there's a relationship where the current user is the parent
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid()
      AND ppr.player_id = profiles.id
    )
  );

-- Step 3: Add policy for players to view profiles of their linked parents
-- NOTE: We don't check the role from profiles table to avoid infinite recursion
-- Instead, we just check if a relationship exists. If a relationship exists with
-- player_id = auth.uid(), then the user must be a player.
CREATE POLICY "Players can view linked parent profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if there's a relationship where the current user is the player
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.player_id = auth.uid()
      AND ppr.parent_id = profiles.id
    )
  );

-- Note: PostgreSQL RLS combines multiple SELECT policies with OR.
-- So users can view their own profile (from existing "Users can view own profile" policy) OR
-- parents can view linked players OR players can view linked parents.
-- This means all three conditions work together.


-- Fix Infinite Recursion in Profiles RLS Policies
-- This fixes the "infinite recursion detected in policy" error during signup
-- Run this ENTIRE file in your Supabase SQL Editor

-- Step 1: Drop ALL policies on profiles table to start fresh
DROP POLICY IF EXISTS "Parents can view linked player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Players can view linked parent profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
-- Drop any other policies that might exist
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
  END LOOP;
END $$;

-- Step 2: Ensure basic policies exist (these are safe, no recursion)
-- Users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (simple check, no recursion)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (during signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Step 3: Re-create SELECT policies for linked profiles (using relationships table, not profiles table)
-- This avoids recursion by checking relationships instead of profiles.role
CREATE POLICY "Parents can view linked player profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Check relationships table, not profiles table (avoids recursion)
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid()
      AND ppr.player_id = profiles.id
    )
  );

CREATE POLICY "Players can view linked parent profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Check relationships table, not profiles table (avoids recursion)
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.player_id = auth.uid()
      AND ppr.parent_id = profiles.id
    )
  );

-- Step 4: Verify policies
-- Run this query to see all profiles policies:
/*
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
*/

-- Step 5: Drop ALL existing versions of update_user_profile function
-- This handles cases where multiple versions exist with different signatures
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all versions of update_user_profile function
  FOR r IN (
    SELECT 
      p.proname as funcname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'update_user_profile'
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.update_user_profile(' || r.args || ') CASCADE';
  END LOOP;
END $$;

-- Step 6: Create a SECURITY DEFINER function to update profiles (bypasses RLS)
-- This function can be used to update profiles without triggering RLS recursion
CREATE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_program_type TEXT DEFAULT NULL,
  p_competitive_level TEXT DEFAULT NULL,
  p_team_name TEXT DEFAULT NULL,
  p_birth_year INTEGER DEFAULT NULL,
  p_positions TEXT[] DEFAULT NULL,
  p_referral_source TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    first_name = COALESCE(p_first_name, profiles.first_name),
    last_name = COALESCE(p_last_name, profiles.last_name),
    phone_number = COALESCE(p_phone_number, profiles.phone_number),
    birth_date = COALESCE(p_birth_date, profiles.birth_date),
    program_type = COALESCE(p_program_type, profiles.program_type),
    competitive_level = COALESCE(p_competitive_level, profiles.competitive_level),
    team_name = COALESCE(p_team_name, profiles.team_name),
    birth_year = COALESCE(p_birth_year, profiles.birth_year),
    positions = COALESCE(p_positions, profiles.positions),
    referral_source = COALESCE(p_referral_source, profiles.referral_source),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, INTEGER, TEXT[], TEXT) TO authenticated;

-- Note: The key fix is that UPDATE policies only check auth.uid() = id,
-- and SELECT policies check relationships table instead of profiles.role,
-- which prevents infinite recursion.
-- Additionally, we've created a SECURITY DEFINER function that can update
-- profiles without triggering RLS recursion.

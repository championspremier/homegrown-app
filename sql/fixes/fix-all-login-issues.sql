-- Fix All Login Issues - Comprehensive RLS Policy Fix
-- This ensures users can view their own profile during login
-- Run this ENTIRE file in your Supabase SQL Editor

-- IMPORTANT: This will recreate all profiles RLS policies correctly
-- Make sure get_user_role() function exists first (run fix-coach-login-role-check.sql if needed)

-- Step 1: Drop ALL existing policies to start fresh
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
  END LOOP;
END $$;

-- Step 2: Create basic policies FIRST (these are simple and don't depend on other policies)
-- Users can read their own profile (CRITICAL for login)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Step 3: Create policies for linked profiles (using relationships table, avoids recursion)
-- Parents can view linked player profiles
CREATE POLICY "Parents can view linked player profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid()
      AND ppr.player_id = profiles.id
    )
  );

-- Players can view linked parent profiles
CREATE POLICY "Players can view linked parent profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.player_id = auth.uid()
      AND ppr.parent_id = profiles.id
    )
  );

-- Step 4: Create policies that use get_user_role() (these come AFTER basic policies)
-- Parents and players can view coach profiles
CREATE POLICY "Parents and players can view coach profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    profiles.role = 'coach'
    AND public.get_user_role() IN ('parent', 'player')
  );

-- Coaches can view other coach profiles
CREATE POLICY "Coaches can view other coach profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    profiles.role = 'coach'
    AND public.get_user_role() = 'coach'
  );

-- Step 5: Verify all policies are created
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'No condition'
    ELSE substring(qual::text, 1, 100)
  END as condition_preview
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY 
  CASE policyname
    WHEN 'Users can view own profile' THEN 1
    WHEN 'Users can update own profile' THEN 2
    WHEN 'Users can insert own profile' THEN 3
    ELSE 4
  END,
  policyname;

-- Note: PostgreSQL RLS combines multiple SELECT policies with OR.
-- The "Users can view own profile" policy should always work because:
-- 1. It's evaluated first (simple equality check)
-- 2. It doesn't depend on other policies or functions
-- 3. If auth.uid() = id, it returns true immediately

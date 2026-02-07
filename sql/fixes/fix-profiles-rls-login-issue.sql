-- Fix Profiles RLS Login Issue
-- This ensures users can always view their own profile during login
-- Run this in your Supabase SQL Editor

-- The issue: New policies using get_user_role() might be interfering with
-- the basic "Users can view own profile" policy during login checks.

-- Step 1: Verify the basic policy exists and is correct
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Step 2: Ensure the policy order allows own profile to be checked first
-- PostgreSQL evaluates policies with OR, so "Users can view own profile" 
-- should work. But let's make sure it's not being blocked.

-- Step 3: Verify get_user_role() function exists and works
-- This function is SECURITY DEFINER so it bypasses RLS
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_user_role';

-- If the function doesn't exist, run sql/migrations/fix-coach-login-role-check.sql

-- Step 4: Test that a user can view their own profile
-- Replace 'USER_ID_HERE' with an actual user ID
-- This should return the profile:
-- SELECT * FROM public.profiles WHERE id = 'USER_ID_HERE'::uuid;

-- Note: The "Users can view own profile" policy should always work
-- because it's a simple equality check that doesn't depend on other policies.
-- If it's not working, there might be an issue with auth.uid() or the policy itself.

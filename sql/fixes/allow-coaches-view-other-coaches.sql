-- Allow Coaches to View Other Coach Profiles
-- This is needed for the coach dropdown in session creation/editing
-- Run this in your Supabase SQL Editor
-- 
-- IMPORTANT: This requires the get_user_role() function to exist.
-- If it doesn't exist, run sql/migrations/fix-coach-login-role-check.sql first.

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Coaches can view other coach profiles" ON public.profiles;

-- Create policy to allow coaches to read other coach profiles
-- This allows them to see all coaches in the dropdown when creating/editing sessions
-- NOTE: Uses get_user_role() function to avoid infinite recursion
-- The get_user_role() function is SECURITY DEFINER and bypasses RLS
CREATE POLICY "Coaches can view other coach profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the profile being viewed is a coach
    -- AND the current user is also a coach
    -- Uses get_user_role() which is SECURITY DEFINER and bypasses RLS
    profiles.role = 'coach'
    AND public.get_user_role() = 'coach'
  );

-- Note: This policy works in combination with existing policies:
-- - Users can view own profile (always works)
-- - Parents can view linked player profiles (for parent-player relationships)
-- - Players can view linked parent profiles (for parent-player relationships)
-- - Parents and players can view coach profiles (for session schedules)
-- - Coaches can view other coach profiles (NEW - for coach dropdowns)
-- 
-- PostgreSQL RLS combines multiple SELECT policies with OR, so all conditions work together.

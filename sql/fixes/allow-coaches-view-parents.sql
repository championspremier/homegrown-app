-- Allow Coaches to View Parent Profiles
-- This is needed for the People page where coaches can view leads (parents)
-- Run this in your Supabase SQL Editor
-- 
-- IMPORTANT: This requires the get_user_role() function to exist.
-- If it doesn't exist, run sql/migrations/fix-coach-login-role-check.sql first.

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Coaches can view parent profiles" ON public.profiles;

-- Create policy to allow coaches to read parent profiles
-- This allows them to see all parents in the People > Leads tab
-- NOTE: Uses get_user_role() function to avoid infinite recursion
-- The get_user_role() function is SECURITY DEFINER and bypasses RLS
CREATE POLICY "Coaches can view parent profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the profile being viewed is a parent
    -- AND the current user is a coach
    -- Uses get_user_role() which is SECURITY DEFINER and bypasses RLS
    profiles.role = 'parent'
    AND public.get_user_role() = 'coach'
  );

-- Also allow coaches to view player profiles (for Members tab)
DROP POLICY IF EXISTS "Coaches can view player profiles" ON public.profiles;

CREATE POLICY "Coaches can view player profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    profiles.role = 'player'
    AND public.get_user_role() = 'coach'
  );

-- Note: This policy works in combination with existing policies:
-- - Users can view own profile (always works)
-- - Parents can view linked player profiles (for parent-player relationships)
-- - Players can view linked parent profiles (for parent-player relationships)
-- - Parents and players can view coach profiles (for session schedules)
-- - Coaches can view other coach profiles (for coach dropdowns)
-- - Coaches can view parent profiles (NEW - for People > Leads tab)
-- - Coaches can view player profiles (NEW - for People > Members tab)
-- 
-- PostgreSQL RLS combines multiple SELECT policies with OR, so all conditions work together.

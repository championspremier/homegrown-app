-- Allow Coaches to View Parent-Player Relationships
-- This is needed for the People page where coaches can view leads (parents) with their sub-accounts (players)
-- Run this in your Supabase SQL Editor
--
-- IMPORTANT: This requires the get_user_role() function to exist.
-- If it doesn't exist, run sql/migrations/fix-coach-login-role-check.sql first.

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Coaches can view all relationships" ON public.parent_player_relationships;

-- Create policy to allow coaches to read all parent-player relationships
-- This allows them to see parent-player links in the People > Leads tab
-- NOTE: Uses get_user_role() function to avoid infinite recursion
-- The get_user_role() function is SECURITY DEFINER and bypasses RLS
CREATE POLICY "Coaches can view all relationships"
  ON public.parent_player_relationships
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the current user is a coach
    -- Uses get_user_role() which is SECURITY DEFINER and bypasses RLS
    public.get_user_role() = 'coach'
  );

-- Note: This policy works in combination with existing policies:
-- - Parents can view their relationships (auth.uid() = parent_id)
-- - Players can view their relationships (auth.uid() = player_id)
-- - Coaches can view all relationships (NEW - for People > Leads tab)
--
-- PostgreSQL RLS combines multiple SELECT policies with OR, so all conditions work together.

-- Fix RLS Policy to Allow Coaches to Update coach_id
-- The current policy blocks updates when changing coach_id because it checks
-- the OLD coach_id value. This fix allows coaches to update any session.
-- Run this in your Supabase SQL Editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Coaches can update own sessions" ON public.sessions;

-- Create a new policy that allows coaches to update any session
-- This allows coaches to reassign sessions to other coaches
CREATE POLICY "Coaches can update any session"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (public.is_coach())
  WITH CHECK (public.is_coach());

-- Note: The USING clause checks if the user is a coach (before update)
-- The WITH CHECK clause ensures the user is still a coach after update
-- This allows coaches to change coach_id to any coach, not just themselves

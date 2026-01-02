-- Fix RLS policy to allow coaches to view reservations for all sessions
-- (not just sessions where they are the main coach)
-- This allows assistant coaches, goalkeeper coaches, and any coach to see reservations
-- for sessions they're involved with

-- Drop existing policy
DROP POLICY IF EXISTS "Coaches can view reservations for their sessions" ON public.session_reservations;

-- Create new policy that allows coaches to view reservations for all sessions
-- Since coaches can view all sessions (via "Coaches can view all sessions" policy),
-- they should also be able to view all reservations for scheduling and management purposes
CREATE POLICY "Coaches can view reservations for their sessions"
  ON public.session_reservations FOR SELECT
  TO authenticated
  USING (
    public.is_coach()
    AND EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_reservations.session_id
    )
  );


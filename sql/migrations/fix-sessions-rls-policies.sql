-- Fix Sessions RLS Policies
-- This fixes the RLS policy violation when coaches try to create sessions
-- Run this if you've already run create-sessions-schema.sql

-- ============================================
-- CREATE HELPER FUNCTION
-- ============================================
-- Function to check if current user is a coach (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'coach'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated;

-- ============================================
-- DROP OLD POLICIES
-- ============================================
DROP POLICY IF EXISTS "Coaches can view all sessions" ON public.sessions;
DROP POLICY IF EXISTS "Coaches can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Coaches can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Coaches can delete own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Coaches can view reservations for their sessions" ON public.session_reservations;
DROP POLICY IF EXISTS "Coaches can update reservations for their sessions" ON public.session_reservations;

-- ============================================
-- CREATE FIXED POLICIES
-- ============================================
-- SESSIONS POLICIES
CREATE POLICY "Coaches can view all sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (public.is_coach());

CREATE POLICY "Coaches can create sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_coach()
    AND (
      coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = coach_id
        AND profiles.role IN ('coach', 'admin')
      )
    )
  );

CREATE POLICY "Coaches can update own sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (
    public.is_coach()
    AND coach_id = auth.uid()
  );

CREATE POLICY "Coaches can delete own sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (
    public.is_coach()
    -- Allow coaches to delete any session (since they can view all sessions)
    -- This is necessary because coaches can create sessions for other coaches
  );

-- RESERVATIONS POLICIES
CREATE POLICY "Coaches can view reservations for their sessions"
  ON public.session_reservations FOR SELECT
  TO authenticated
  USING (
    public.is_coach()
    AND EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_reservations.session_id
      AND sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update reservations for their sessions"
  ON public.session_reservations FOR UPDATE
  TO authenticated
  USING (
    public.is_coach()
    AND EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_reservations.session_id
      AND sessions.coach_id = auth.uid()
    )
  );

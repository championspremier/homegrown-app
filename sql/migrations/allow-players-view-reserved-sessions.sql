-- Fix infinite recursion in RLS policies for sessions
-- The issue was caused by a policy that checked session_reservations, which then
-- triggered RLS on sessions, creating a loop.
--
-- SOLUTION: Remove the problematic policy and rely on code-level session loading
-- The code already handles loading sessions separately if the relationship fails

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Players can view sessions they have reservations for" ON public.sessions;

-- Drop the function if it exists (no longer needed)
DROP FUNCTION IF EXISTS public.player_has_reservation(UUID);

-- Ensure the basic scheduled sessions policy exists
-- This policy allows players/parents to view future scheduled sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND policyname = 'Players and parents can view scheduled sessions'
  ) THEN
    CREATE POLICY "Players and parents can view scheduled sessions"
      ON public.sessions FOR SELECT
      TO authenticated
      USING (
        status = 'scheduled'
        AND session_date >= CURRENT_DATE
      );
  END IF;
END $$;

-- NOTE: We're NOT adding a policy to allow players to view sessions they have reservations for
-- because it causes infinite recursion. Instead, the code in player/home/home.js handles this
-- by loading sessions separately if the relationship fails due to RLS.


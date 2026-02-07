-- Add DELETE Policy for Sessions
-- This allows coaches to delete their own sessions
-- Run this in your Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Coaches can delete own sessions" ON public.sessions;

-- Create DELETE policy for coaches
CREATE POLICY "Coaches can delete own sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (
    public.is_coach()
    AND coach_id = auth.uid()
  );

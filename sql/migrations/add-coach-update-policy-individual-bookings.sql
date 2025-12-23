-- Add UPDATE policy to allow coaches to cancel/update individual session bookings
-- Run this in your Supabase SQL Editor

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Coaches can update their bookings" ON public.individual_session_bookings;

-- Create policy that allows coaches to update bookings where they are the coach
CREATE POLICY "Coaches can update their bookings"
  ON public.individual_session_bookings FOR UPDATE
  TO authenticated
  USING (
    -- Coaches can update bookings where they are the assigned coach
    coach_id = auth.uid()
    OR
    -- Or if the user is a coach (for admin purposes)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  )
  WITH CHECK (
    -- Same conditions for the updated row
    coach_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );


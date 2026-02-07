-- Add DELETE Policy for coach_individual_availability
-- This allows coaches to delete availability entries when configuring session types
-- Run this in your Supabase SQL Editor

-- Coaches can delete availability for any coach (when configuring session types)
DROP POLICY IF EXISTS "Coaches can delete any coach availability" ON public.coach_individual_availability;
CREATE POLICY "Coaches can delete any coach availability"
  ON public.coach_individual_availability FOR DELETE
  TO authenticated
  USING (public.is_coach());

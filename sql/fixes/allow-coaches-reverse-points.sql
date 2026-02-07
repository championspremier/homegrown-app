-- Allow coaches to reverse points transactions they created
-- This allows coaches to remove check-ins and reverse the associated points
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can update own points" ON public.points_transactions;
DROP POLICY IF EXISTS "Coaches can delete own points" ON public.points_transactions;

-- Allow coaches to update points transactions they created (via checked_in_by)
CREATE POLICY "Coaches can update own points"
  ON public.points_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
    )
    AND checked_in_by = auth.uid() -- Only can update points they awarded
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
    )
    AND checked_in_by = auth.uid()
  );

-- Allow coaches to delete points transactions they created (via checked_in_by)
CREATE POLICY "Coaches can delete own points"
  ON public.points_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
    )
    AND checked_in_by = auth.uid() -- Only can delete points they awarded
  );


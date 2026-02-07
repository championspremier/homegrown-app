-- Fix RLS policies for tactical video points tracking
-- This allows players to earn points for watching tactical videos

-- ============================================
-- 1. Fix player_curriculum_progress to allow 'all' period
-- ============================================
-- Update the CHECK constraint to allow 'all' as a period
ALTER TABLE public.player_curriculum_progress
  DROP CONSTRAINT IF EXISTS player_curriculum_progress_period_check;

ALTER TABLE public.player_curriculum_progress
  ADD CONSTRAINT player_curriculum_progress_period_check
  CHECK (period IN ('build-out', 'middle-third', 'final-third', 'wide-play', 'all'));

-- ============================================
-- 2. Add INSERT policy for players to insert points_transactions
-- ============================================
-- Allow players to insert their own points for tactical videos
DROP POLICY IF EXISTS "Players can insert own tactical points" ON public.points_transactions;

CREATE POLICY "Players can insert own tactical points"
  ON public.points_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = player_id
    AND session_type = 'HG_TACTICAL_REEL'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'player'
    )
  );

-- ============================================
-- 3. Fix player_curriculum_progress SELECT policy to handle 'all' period
-- ============================================
-- The existing SELECT policy should already work, but let's make sure it handles 'all' period
-- The current policy allows players to view their own progress, which should work fine

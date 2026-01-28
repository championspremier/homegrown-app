-- ============================================
-- Add Physical Seasons to Period Constraints
-- ============================================
-- This migration allows 'in-season' and 'off-season' as valid period values
-- for physical sessions in solo_session_videos and solo_sessions tables

-- Update solo_session_videos period constraint
ALTER TABLE public.solo_session_videos
  DROP CONSTRAINT IF EXISTS solo_session_videos_period_check;

ALTER TABLE public.solo_session_videos
  ADD CONSTRAINT solo_session_videos_period_check
  CHECK (period IN ('build-out', 'middle-third', 'final-third', 'wide-play', 'all', 'in-season', 'off-season'));

-- Update solo_sessions period constraint
ALTER TABLE public.solo_sessions
  DROP CONSTRAINT IF EXISTS solo_sessions_period_check;

ALTER TABLE public.solo_sessions
  ADD CONSTRAINT solo_sessions_period_check
  CHECK (period IN ('build-out', 'middle-third', 'final-third', 'wide-play', 'all', 'in-season', 'off-season'));

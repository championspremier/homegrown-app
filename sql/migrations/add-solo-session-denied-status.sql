-- ============================================
-- Add Denied Status to Solo Session Bookings
-- ============================================
-- This migration adds support for coaches to deny solo session completion photos

-- Add denied fields
ALTER TABLE public.player_solo_session_bookings
  ADD COLUMN IF NOT EXISTS denied_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS denied_by UUID REFERENCES public.profiles(id);

-- Update the status check constraint to include 'denied'
ALTER TABLE public.player_solo_session_bookings
  DROP CONSTRAINT IF EXISTS player_solo_session_bookings_status_check;

ALTER TABLE public.player_solo_session_bookings
  ADD CONSTRAINT player_solo_session_bookings_status_check
  CHECK (status IN ('scheduled', 'completed', 'pending_review', 'checked-in', 'cancelled', 'denied'));

-- Create index for denied bookings
CREATE INDEX IF NOT EXISTS idx_solo_bookings_denied 
  ON public.player_solo_session_bookings(denied_at) 
  WHERE status = 'denied';

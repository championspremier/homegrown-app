-- ============================================
-- Solo Session Bookings Schema
-- ============================================
-- This schema supports players scheduling solo sessions and uploading completion photos

-- Player Solo Session Bookings Table
CREATE TABLE IF NOT EXISTS public.player_solo_session_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  solo_session_id UUID REFERENCES public.solo_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Scheduled time
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  
  -- Completion photo
  completion_photo_url TEXT, -- URL to photo in storage
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'pending_review', 'checked-in', 'cancelled')),
  
  -- Check-in
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES public.profiles(id), -- Coach who checked in
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_solo_bookings_player ON public.player_solo_session_bookings(player_id);
CREATE INDEX IF NOT EXISTS idx_solo_bookings_session ON public.player_solo_session_bookings(solo_session_id);
CREATE INDEX IF NOT EXISTS idx_solo_bookings_status ON public.player_solo_session_bookings(status);
CREATE INDEX IF NOT EXISTS idx_solo_bookings_date ON public.player_solo_session_bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_solo_bookings_pending ON public.player_solo_session_bookings(status, scheduled_date) WHERE status = 'pending_review';

-- RLS Policies
ALTER TABLE public.player_solo_session_bookings ENABLE ROW LEVEL SECURITY;

-- Players can view their own bookings
CREATE POLICY "Players can view own solo bookings"
  ON public.player_solo_session_bookings FOR SELECT
  TO authenticated
  USING (
    player_id = auth.uid() OR
    parent_id = auth.uid()
  );

-- Players can create their own bookings
CREATE POLICY "Players can create own solo bookings"
  ON public.player_solo_session_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid() OR
    parent_id = auth.uid()
  );

-- Players can update their own bookings (to upload photo, cancel)
CREATE POLICY "Players can update own solo bookings"
  ON public.player_solo_session_bookings FOR UPDATE
  TO authenticated
  USING (
    player_id = auth.uid() OR
    parent_id = auth.uid()
  )
  WITH CHECK (
    player_id = auth.uid() OR
    parent_id = auth.uid()
  );

-- Coaches can view all bookings for check-in
CREATE POLICY "Coaches can view solo bookings"
  ON public.player_solo_session_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches can check in solo sessions
CREATE POLICY "Coaches can check in solo sessions"
  ON public.player_solo_session_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

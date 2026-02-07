-- Create Sessions and Reservations Schema
-- This creates the tables needed for coach scheduling and player reservations
-- Run this in your Supabase SQL Editor

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Session Details
  title TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN (
    'Tec Tac',
    'Speed Training',
    'Strength & Conditioning',
    'Champions Player Progress (CPP)',
    'Group Film-Analysis',
    'Pro Player Stories (PPS)',
    'College Advising',
    'Psychologist',
    'Free Nutrition Consultation'
  )),
  
  -- Staff (arrays of coach profile IDs)
  assistant_coaches UUID[] DEFAULT ARRAY[]::UUID[],
  goalkeeper_coaches UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Date & Time
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  
  -- Capacity
  attendance_limit INTEGER NOT NULL CHECK (attendance_limit > 0),
  current_reservations INTEGER DEFAULT 0 CHECK (current_reservations >= 0),
  
  -- Location
  location_type TEXT NOT NULL CHECK (location_type IN ('on-field', 'virtual')),
  location TEXT, -- Physical location for on-field sessions
  zoom_link TEXT, -- Zoom link for virtual sessions
  
  -- Additional Info
  description TEXT,
  session_plan TEXT, -- Detailed session plan/notes
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SESSION RESERVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  reservation_status TEXT DEFAULT 'reserved' CHECK (reservation_status IN (
    'reserved', 'checked-in', 'no-show', 'cancelled', 'late-cancel'
  )),
  
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(session_id, player_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON public.sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_date_time ON public.sessions(session_date, session_time);
CREATE INDEX IF NOT EXISTS idx_reservations_session_id ON public.session_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_player_id ON public.session_reservations(player_id);
CREATE INDEX IF NOT EXISTS idx_reservations_parent_id ON public.session_reservations(parent_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.session_reservations(reservation_status);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.session_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update current_reservations count
CREATE OR REPLACE FUNCTION update_session_reservation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reservation_status = 'reserved' THEN
    UPDATE public.sessions
    SET current_reservations = current_reservations + 1
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reservation_status = 'reserved' THEN
    UPDATE public.sessions
    SET current_reservations = GREATEST(current_reservations - 1, 0)
    WHERE id = OLD.session_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reservation_status = 'reserved' AND NEW.reservation_status != 'reserved' THEN
      UPDATE public.sessions
      SET current_reservations = GREATEST(current_reservations - 1, 0)
      WHERE id = NEW.session_id;
    ELSIF OLD.reservation_status != 'reserved' AND NEW.reservation_status = 'reserved' THEN
      UPDATE public.sessions
      SET current_reservations = current_reservations + 1
      WHERE id = NEW.session_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_session_reservation_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.session_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_session_reservation_count();

-- ============================================
-- HELPER FUNCTIONS FOR RLS
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reservations ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Players and parents can view scheduled sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    status = 'scheduled'
    AND session_date >= CURRENT_DATE
  );

-- RESERVATIONS POLICIES
CREATE POLICY "Users can view own reservations"
  ON public.session_reservations FOR SELECT
  TO authenticated
  USING (player_id = auth.uid() OR parent_id = auth.uid());

CREATE POLICY "Players can create reservations"
  ON public.session_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'player'
    )
  );

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

CREATE POLICY "Players can cancel own reservations"
  ON public.session_reservations FOR UPDATE
  TO authenticated
  USING (
    player_id = auth.uid()
    AND reservation_status IN ('reserved', 'cancelled')
  )
  WITH CHECK (player_id = auth.uid());

GRANT ALL ON public.sessions TO authenticated;
GRANT ALL ON public.session_reservations TO authenticated;

-- Create Individual Sessions and Coach Availability Schema
-- This creates tables for managing individual/one-on-one sessions
-- Run this in your Supabase SQL Editor

-- ============================================
-- INDIVIDUAL SESSION TYPES TABLE
-- ============================================
-- This table stores configuration for individual session types
CREATE TABLE IF NOT EXISTS public.individual_session_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (duration_minutes > 0),
  color TEXT DEFAULT '#7ed321', -- Hex color for UI display
  description TEXT,
  
  -- General availability (for all coaches offering this type)
  general_availability JSONB DEFAULT '{}', -- { "monday": { "start": "15:00", "end": "20:00", "available": true }, ... }
  
  -- Booking settings
  minimum_booking_notice_hours INTEGER DEFAULT 8,
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 0,
  time_slot_granularity_minutes INTEGER DEFAULT 20 CHECK (time_slot_granularity_minutes > 0),
  
  -- Notification settings
  booking_confirmation_email_subject TEXT,
  booking_confirmation_email_body TEXT,
  reminder_email_subject TEXT,
  reminder_email_body TEXT,
  reminder_timing_hours INTEGER DEFAULT 24,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COACH INDIVIDUAL SESSION AVAILABILITY TABLE
-- ============================================
-- This table stores each coach's specific availability for individual session types
CREATE TABLE IF NOT EXISTS public.coach_individual_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_type_id UUID REFERENCES public.individual_session_types(id) ON DELETE CASCADE NOT NULL,
  
  -- Coach-specific availability (overrides general availability)
  availability JSONB DEFAULT '{}', -- { "monday": { "start": "16:00", "end": "18:00", "available": true }, ... }
  
  -- Coach-specific settings
  is_available BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(coach_id, session_type_id)
);

-- ============================================
-- INDIVIDUAL SESSION BOOKINGS TABLE
-- ============================================
-- This table stores bookings for individual sessions (separate from group session reservations)
CREATE TABLE IF NOT EXISTS public.individual_session_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_type_id UUID REFERENCES public.individual_session_types(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Booking details
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Virtual session link
  zoom_link TEXT,
  meeting_id TEXT,
  meeting_passcode TEXT,
  
  -- Status
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no-show')),
  
  -- Cancellation
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Check-in
  checked_in_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_individual_session_types_name ON public.individual_session_types(name);
CREATE INDEX IF NOT EXISTS idx_coach_availability_coach_id ON public.coach_individual_availability(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_availability_session_type ON public.coach_individual_availability(session_type_id);
CREATE INDEX IF NOT EXISTS idx_individual_bookings_coach_id ON public.individual_session_bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_individual_bookings_player_id ON public.individual_session_bookings(player_id);
CREATE INDEX IF NOT EXISTS idx_individual_bookings_date ON public.individual_session_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_individual_bookings_status ON public.individual_session_bookings(status);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_individual_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_individual_session_types_updated_at ON public.individual_session_types;
DROP TRIGGER IF EXISTS update_coach_availability_updated_at ON public.coach_individual_availability;
DROP TRIGGER IF EXISTS update_individual_bookings_updated_at ON public.individual_session_bookings;

-- Create triggers
CREATE TRIGGER update_individual_session_types_updated_at
  BEFORE UPDATE ON public.individual_session_types
  FOR EACH ROW
  EXECUTE FUNCTION update_individual_sessions_updated_at();

CREATE TRIGGER update_coach_availability_updated_at
  BEFORE UPDATE ON public.coach_individual_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_individual_sessions_updated_at();

CREATE TRIGGER update_individual_bookings_updated_at
  BEFORE UPDATE ON public.individual_session_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_individual_sessions_updated_at();

-- ============================================
-- INITIAL DATA
-- ============================================
-- Insert default individual session types
INSERT INTO public.individual_session_types (name, display_name, duration_minutes, color, description)
VALUES
  ('Champions Player Progress (CPP)', 'Champions Player Progress', 20, '#7ed321', 'One-on-one player progress session'),
  ('College Advising', 'College Advising', 20, '#f5a623', 'College advising session'),
  ('Psychologist', 'Psychologist', 30, '#bd10e0', 'Psychology consultation'),
  ('Free Nutrition Consultation', 'Free Nutrition Consultation', 30, '#50e3c2', 'Nutrition consultation')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.individual_session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_individual_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_session_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can view individual session types" ON public.individual_session_types;
DROP POLICY IF EXISTS "Coaches can insert individual session types" ON public.individual_session_types;
DROP POLICY IF EXISTS "Coaches can update individual session types" ON public.individual_session_types;
DROP POLICY IF EXISTS "Coaches can view own availability" ON public.coach_individual_availability;
DROP POLICY IF EXISTS "Coaches can update own availability" ON public.coach_individual_availability;
DROP POLICY IF EXISTS "Coaches can insert own availability" ON public.coach_individual_availability;
DROP POLICY IF EXISTS "Coaches can insert any coach availability" ON public.coach_individual_availability;
DROP POLICY IF EXISTS "Coaches can update any coach availability" ON public.coach_individual_availability;
DROP POLICY IF EXISTS "Parents and players can view coach availability" ON public.coach_individual_availability;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.individual_session_bookings;
DROP POLICY IF EXISTS "Players can create bookings" ON public.individual_session_bookings;
DROP POLICY IF EXISTS "Coaches can view their bookings" ON public.individual_session_bookings;

-- Coaches can view all individual session types
-- Parents and players can also view to book sessions
CREATE POLICY "Coaches can view individual session types"
  ON public.individual_session_types FOR SELECT
  TO authenticated
  USING (public.is_coach() OR public.get_user_role() IN ('parent', 'player'));

-- Coaches can insert individual session types
CREATE POLICY "Coaches can insert individual session types"
  ON public.individual_session_types FOR INSERT
  TO authenticated
  WITH CHECK (public.is_coach());

-- Coaches can update individual session types
CREATE POLICY "Coaches can update individual session types"
  ON public.individual_session_types FOR UPDATE
  TO authenticated
  USING (public.is_coach())
  WITH CHECK (public.is_coach());

-- Coaches can manage their own availability
CREATE POLICY "Coaches can view own availability"
  ON public.coach_individual_availability FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid() OR public.is_coach());

CREATE POLICY "Coaches can update own availability"
  ON public.coach_individual_availability FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can insert own availability"
  ON public.coach_individual_availability FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = auth.uid());

-- Coaches can insert availability for any coach (when configuring session types)
DROP POLICY IF EXISTS "Coaches can insert any coach availability" ON public.coach_individual_availability;
CREATE POLICY "Coaches can insert any coach availability"
  ON public.coach_individual_availability FOR INSERT
  TO authenticated
  WITH CHECK (public.is_coach());

-- Coaches can update availability for any coach (when configuring session types)
DROP POLICY IF EXISTS "Coaches can update any coach availability" ON public.coach_individual_availability;
CREATE POLICY "Coaches can update any coach availability"
  ON public.coach_individual_availability FOR UPDATE
  TO authenticated
  USING (public.is_coach())
  WITH CHECK (public.is_coach());

-- Coaches can delete availability for any coach (when configuring session types)
DROP POLICY IF EXISTS "Coaches can delete any coach availability" ON public.coach_individual_availability;
CREATE POLICY "Coaches can delete any coach availability"
  ON public.coach_individual_availability FOR DELETE
  TO authenticated
  USING (public.is_coach());

-- Parents and players can view coach availability for booking
-- Uses get_user_role() to avoid RLS recursion
CREATE POLICY "Parents and players can view coach availability"
  ON public.coach_individual_availability FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('parent', 'player'));

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON public.individual_session_bookings FOR SELECT
  TO authenticated
  USING (player_id = auth.uid() OR parent_id = auth.uid() OR coach_id = auth.uid());

-- Players can create bookings
CREATE POLICY "Players can create bookings"
  ON public.individual_session_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'player'
    )
  );

-- Coaches can view bookings for their sessions
CREATE POLICY "Coaches can view their bookings"
  ON public.individual_session_bookings FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid() OR public.is_coach());

GRANT ALL ON public.individual_session_types TO authenticated;
GRANT ALL ON public.coach_individual_availability TO authenticated;
GRANT ALL ON public.individual_session_bookings TO authenticated;

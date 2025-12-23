-- Create Points System Schema
-- This creates tables for tracking player points from check-ins
-- Run this in your Supabase SQL Editor

-- ============================================
-- POINTS TRANSACTIONS TABLE
-- ============================================
-- Stores individual point transactions (awards from check-ins)
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction details
  points DECIMAL(10, 2) NOT NULL CHECK (points > 0),
  session_type TEXT NOT NULL, -- e.g., 'TEC_TAC', 'VIRTUAL_CPP', etc.
  session_id UUID, -- Reference to sessions.id or individual_session_bookings.id
  reservation_id UUID, -- Reference to session_reservations.id or individual_session_bookings.id
  
  -- Check-in details
  checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Coach/admin who checked in
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Quarter tracking
  quarter_year INTEGER NOT NULL, -- e.g., 2025
  quarter_number INTEGER NOT NULL CHECK (quarter_number IN (1, 2, 3, 4)), -- Q1, Q2, Q3, Q4
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')), -- 'archived' after quarter ends
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUARTERLY LEADERBOARD VIEW
-- ============================================
-- Materialized view or function to calculate quarterly leaderboard
-- We'll use a function for real-time calculations

CREATE OR REPLACE FUNCTION get_quarterly_leaderboard(
  p_quarter_year INTEGER,
  p_quarter_number INTEGER,
  p_limit INTEGER DEFAULT 25
)
RETURNS TABLE (
  player_id UUID,
  player_first_name TEXT,
  player_last_name TEXT,
  total_points DECIMAL(10, 2),
  "position" INTEGER,
  avatar_initials TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH player_points AS (
    SELECT 
      pt.player_id,
      SUM(pt.points) as total_points
    FROM public.points_transactions pt
    WHERE pt.quarter_year = p_quarter_year
      AND pt.quarter_number = p_quarter_number
      AND pt.status = 'active'
    GROUP BY pt.player_id
  ),
  ranked_players AS (
    SELECT 
      pp.player_id,
      pp.total_points,
      ROW_NUMBER() OVER (ORDER BY pp.total_points DESC, pp.player_id) as "position"
    FROM player_points pp
  )
  SELECT 
    rp.player_id,
    p.first_name as player_first_name,
    p.last_name as player_last_name,
    rp.total_points,
    rp."position"::INTEGER,
    UPPER(LEFT(COALESCE(p.first_name, ''), 1) || LEFT(COALESCE(p.last_name, ''), 1)) as avatar_initials
  FROM ranked_players rp
  JOIN public.profiles p ON p.id = rp.player_id
  WHERE rp.position <= p_limit
  ORDER BY rp.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET PLAYER QUARTERLY POINTS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_player_quarterly_points(
  p_player_id UUID,
  p_quarter_year INTEGER,
  p_quarter_number INTEGER
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  total DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO total
  FROM public.points_transactions
  WHERE player_id = p_player_id
    AND quarter_year = p_quarter_year
    AND quarter_number = p_quarter_number
    AND status = 'active';
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET PLAYER LEADERBOARD POSITION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_player_leaderboard_position(
  p_player_id UUID,
  p_quarter_year INTEGER,
  p_quarter_number INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  player_position INTEGER;
BEGIN
  WITH player_points AS (
    SELECT 
      pt.player_id,
      SUM(pt.points) as total_points
    FROM public.points_transactions pt
    WHERE pt.quarter_year = p_quarter_year
      AND pt.quarter_number = p_quarter_number
      AND pt.status = 'active'
    GROUP BY pt.player_id
  ),
  ranked_players AS (
    SELECT 
      pp.player_id,
      ROW_NUMBER() OVER (ORDER BY pp.total_points DESC, pp.player_id) as position
    FROM player_points pp
  )
  SELECT position INTO player_position
  FROM ranked_players
  WHERE player_id = p_player_id;
  
  RETURN COALESCE(player_position, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_points_transactions_player_id ON public.points_transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_quarter ON public.points_transactions(quarter_year, quarter_number);
CREATE INDEX IF NOT EXISTS idx_points_transactions_status ON public.points_transactions(status);
CREATE INDEX IF NOT EXISTS idx_points_transactions_checked_in_at ON public.points_transactions(checked_in_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Players can view their own points transactions
CREATE POLICY "Players can view own points transactions"
  ON public.points_transactions FOR SELECT
  USING (auth.uid() = player_id);

-- Parents can view points transactions for their linked players
CREATE POLICY "Parents can view linked player points"
  ON public.points_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships
      WHERE parent_id = auth.uid()
        AND player_id = points_transactions.player_id
    )
  );

-- Coaches and admins can view all points transactions
CREATE POLICY "Coaches and admins can view all points"
  ON public.points_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );

-- Only coaches and admins can insert points transactions
CREATE POLICY "Coaches and admins can insert points"
  ON public.points_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );

-- Only admins can update/delete points transactions (for corrections)
CREATE POLICY "Admins can update points"
  ON public.points_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete points"
  ON public.points_transactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );


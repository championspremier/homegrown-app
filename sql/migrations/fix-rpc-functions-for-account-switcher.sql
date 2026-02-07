-- Fix RPC Functions to Support Account Switcher
-- This allows players viewing as parent to use the same RPC functions
-- Run this ENTIRE file in your Supabase SQL Editor

-- ============================================
-- FUNCTION: Create individual session booking for player (with account switcher support)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_individual_booking_for_player(
  p_session_type_id UUID,
  p_coach_id UUID,
  p_player_id UUID,
  p_parent_id UUID,
  p_booking_date DATE,
  p_booking_time TIME,
  p_duration_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(id UUID, session_type_id UUID, coach_id UUID, player_id UUID, parent_id UUID, booking_date DATE, booking_time TIME, duration_minutes INTEGER, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_booking_id UUID;
  v_actual_parent_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the authenticated user's role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Determine actual parent_id based on user role
  IF v_user_role = 'parent' THEN
    -- User is logged in as parent
    v_actual_parent_id := auth.uid();
    
    -- Verify the provided parent_id matches
    IF p_parent_id IS NOT NULL AND p_parent_id != v_actual_parent_id THEN
      RAISE EXCEPTION 'Parent ID mismatch';
    END IF;
  ELSIF v_user_role = 'player' THEN
    -- User is logged in as player (viewing as parent via account switcher)
    -- Find their parent through the relationship
    SELECT parent_id INTO v_actual_parent_id
    FROM public.parent_player_relationships
    WHERE player_id = auth.uid()
    LIMIT 1;
    
    IF v_actual_parent_id IS NULL THEN
      RAISE EXCEPTION 'Player must be linked to a parent to use this function';
    END IF;
    
    -- Verify the provided parent_id matches the player's parent
    IF p_parent_id IS NOT NULL AND p_parent_id != v_actual_parent_id THEN
      RAISE EXCEPTION 'Parent ID does not match player relationship';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only parents or players linked to parents can use this function';
  END IF;
  
  -- Verify the relationship exists between the parent and the target player
  IF NOT EXISTS (
    SELECT 1 FROM public.parent_player_relationships
    WHERE parent_id = v_actual_parent_id
    AND player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'No relationship found between parent and player';
  END IF;
  
  -- Verify the player exists and is actually a player
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_player_id
    AND role = 'player'
  ) THEN
    RAISE EXCEPTION 'Invalid player ID';
  END IF;
  
  -- Create the booking
  INSERT INTO public.individual_session_bookings (
    session_type_id,
    coach_id,
    player_id,
    parent_id,
    booking_date,
    booking_time,
    duration_minutes,
    status,
    created_at
  ) VALUES (
    p_session_type_id,
    p_coach_id,
    p_player_id,
    v_actual_parent_id,
    p_booking_date,
    p_booking_time,
    p_duration_minutes,
    'confirmed',
    NOW()
  )
  RETURNING id INTO v_booking_id;
  
  -- Return the created booking
  -- Use table alias to avoid ambiguity (with #variable_conflict use_column directive)
  RETURN QUERY
  SELECT 
    booking.id,
    booking.session_type_id,
    booking.coach_id,
    booking.player_id,
    booking.parent_id,
    booking.booking_date,
    booking.booking_time,
    booking.duration_minutes,
    booking.status::TEXT,
    booking.created_at
  FROM public.individual_session_bookings booking
  WHERE booking.id = v_booking_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_individual_booking_for_player(UUID, UUID, UUID, UUID, DATE, TIME, INTEGER) TO authenticated;

-- Also update cancel function to support account switcher
CREATE OR REPLACE FUNCTION public.cancel_reservation_for_player(
  p_reservation_id UUID,
  p_is_individual BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
  v_player_id UUID;
  v_updated BOOLEAN := FALSE;
  v_user_role TEXT;
BEGIN
  -- Get the authenticated user's role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Determine parent_id based on user role
  IF v_user_role = 'parent' THEN
    -- User is logged in as parent
    v_parent_id := auth.uid();
  ELSIF v_user_role = 'player' THEN
    -- User is logged in as player (viewing as parent via account switcher)
    -- Find their parent through the relationship
    SELECT parent_id INTO v_parent_id
    FROM public.parent_player_relationships
    WHERE player_id = auth.uid()
    LIMIT 1;
    
    IF v_parent_id IS NULL THEN
      RAISE EXCEPTION 'Player must be linked to a parent to use this function';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only parents or players linked to parents can use this function';
  END IF;
  
  IF p_is_individual THEN
    -- Cancel individual booking
    SELECT player_id INTO v_player_id
    FROM public.individual_session_bookings
    WHERE id = p_reservation_id;
    
    IF v_player_id IS NULL THEN
      RAISE EXCEPTION 'Booking not found';
    END IF;
    
    -- Verify relationship
    IF NOT EXISTS (
      SELECT 1 FROM public.parent_player_relationships
      WHERE parent_id = v_parent_id AND player_id = v_player_id
    ) THEN
      RAISE EXCEPTION 'No relationship found';
    END IF;
    
    UPDATE public.individual_session_bookings
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE id = p_reservation_id;
    
    v_updated := TRUE;
  ELSE
    -- Cancel group reservation
    SELECT player_id INTO v_player_id
    FROM public.session_reservations
    WHERE id = p_reservation_id;
    
    IF v_player_id IS NULL THEN
      RAISE EXCEPTION 'Reservation not found';
    END IF;
    
    -- Verify relationship
    IF NOT EXISTS (
      SELECT 1 FROM public.parent_player_relationships
      WHERE parent_id = v_parent_id AND player_id = v_player_id
    ) THEN
      RAISE EXCEPTION 'No relationship found';
    END IF;
    
    UPDATE public.session_reservations
    SET reservation_status = 'cancelled', updated_at = NOW()
    WHERE id = p_reservation_id;
    
    v_updated := TRUE;
  END IF;
  
  RETURN v_updated;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cancel_reservation_for_player(UUID, BOOLEAN) TO authenticated;


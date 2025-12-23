-- Secure Player Actions via Database Functions
-- This allows parents to perform actions on behalf of their linked players
-- while maintaining security through relationship verification

-- ============================================
-- FUNCTION: Create reservation for player (parent acting on behalf)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_reservation_for_player(
  p_session_id UUID,
  p_player_id UUID,
  p_reservation_status TEXT DEFAULT 'reserved'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_reservation_id UUID;
  v_parent_id UUID;
BEGIN
  -- Get the authenticated user's ID
  v_parent_id := auth.uid();
  
  -- Verify the authenticated user is a parent
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_parent_id
    AND role = 'parent'
  ) THEN
    RAISE EXCEPTION 'Only parents can use this function';
  END IF;
  
  -- Verify the relationship exists
  IF NOT EXISTS (
    SELECT 1 FROM public.parent_player_relationships
    WHERE parent_id = v_parent_id
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
  
  -- Create the reservation
  INSERT INTO public.session_reservations (
    session_id,
    player_id,
    parent_id,
    reservation_status,
    created_at
  ) VALUES (
    p_session_id,
    p_player_id,
    v_parent_id,
    p_reservation_status,
    NOW()
  )
  RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_reservation_for_player(UUID, UUID, TEXT) TO authenticated;

-- ============================================
-- FUNCTION: Create individual session booking for player
-- ============================================
CREATE OR REPLACE FUNCTION public.create_booking_for_player(
  p_session_type_id UUID,
  p_coach_id UUID,
  p_player_id UUID,
  p_booking_date DATE,
  p_booking_time TIME,
  p_duration_minutes INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_parent_id UUID;
BEGIN
  v_parent_id := auth.uid();
  
  -- Verify parent and relationship
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_parent_id AND role = 'parent'
  ) THEN
    RAISE EXCEPTION 'Only parents can use this function';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.parent_player_relationships
    WHERE parent_id = v_parent_id AND player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'No relationship found';
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
    v_parent_id,
    p_booking_date,
    p_booking_time,
    p_duration_minutes,
    'reserved',
    NOW()
  )
  RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_for_player(UUID, UUID, UUID, DATE, TIME, INTEGER) TO authenticated;

-- ============================================
-- FUNCTION: Cancel reservation/booking for player
-- ============================================
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
BEGIN
  v_parent_id := auth.uid();
  
  -- Verify parent
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_parent_id AND role = 'parent'
  ) THEN
    RAISE EXCEPTION 'Only parents can use this function';
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
    SET status = 'cancelled', updated_at = NOW()
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

GRANT EXECUTE ON FUNCTION public.cancel_reservation_for_player(UUID, BOOLEAN) TO authenticated;

-- ============================================
-- FUNCTION: Get player's reservations (for parent viewing)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_player_reservations(
  p_player_id UUID
)
RETURNS TABLE (
  reservation_id UUID,
  session_id UUID,
  session_type TEXT,
  session_date DATE,
  session_time TIME,
  location_type TEXT,
  reservation_status TEXT,
  is_individual BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  v_parent_id := auth.uid();
  
  -- Verify parent and relationship
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_parent_id AND role = 'parent'
  ) THEN
    RAISE EXCEPTION 'Only parents can use this function';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.parent_player_relationships
    WHERE parent_id = v_parent_id AND player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'No relationship found';
  END IF;
  
  -- Return group reservations
  RETURN QUERY
  SELECT 
    sr.id as reservation_id,
    sr.session_id,
    s.session_type,
    s.session_date,
    s.session_time,
    s.location_type,
    sr.reservation_status,
    FALSE as is_individual
  FROM public.session_reservations sr
  JOIN public.sessions s ON s.id = sr.session_id
  WHERE sr.player_id = p_player_id
  AND sr.reservation_status IN ('reserved', 'checked-in');
  
  -- Return individual bookings
  RETURN QUERY
  SELECT 
    isb.id as reservation_id,
    NULL::UUID as session_id,
    ist.display_name as session_type,
    isb.booking_date as session_date,
    isb.booking_time as session_time,
    'virtual'::TEXT as location_type,
    isb.status as reservation_status,
    TRUE as is_individual
  FROM public.individual_session_bookings isb
  JOIN public.individual_session_types ist ON ist.id = isb.session_type_id
  WHERE isb.player_id = p_player_id
  AND isb.status IN ('reserved', 'checked-in');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_reservations(UUID) TO authenticated;

